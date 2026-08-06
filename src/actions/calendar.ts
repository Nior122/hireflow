'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { logActivity } from "@/actions/activities";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

interface CalendarConnectionData {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  hangoutLink?: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

async function ensureCalendarTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CalendarConnection" (
      id TEXT PRIMARY KEY DEFAULT (cuid()),
      "userId" TEXT UNIQUE NOT NULL,
      "accessToken" TEXT NOT NULL,
      "refreshToken" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
      CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
}

async function getCalendarToken(userId: string): Promise<CalendarConnectionData | null> {
  try {
    const result = await prisma.$queryRawUnsafe<CalendarConnectionData[]>(
      'SELECT * FROM "CalendarConnection" WHERE "userId" = $1',
      userId
    );
    return result[0] ?? null;
  } catch {
    await ensureCalendarTable();
    return null;
  }
}

async function saveCalendarToken(userId: string, accessToken: string, refreshToken: string, expiresAt: Date) {
  await ensureCalendarTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CalendarConnection" ("userId", "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, now(), now())
     ON CONFLICT ("userId") DO UPDATE SET "accessToken" = $2, "refreshToken" = $3, "expiresAt" = $4, "updatedAt" = now()`,
    userId, accessToken, refreshToken, expiresAt
  );
}

async function deleteCalendarToken(userId: string) {
  await prisma.$executeRawUnsafe('DELETE FROM "CalendarConnection" WHERE "userId" = $1', userId);
}

async function refreshCalendarToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await saveCalendarToken(userId, data.access_token, refreshToken, expiresAt);
  return data.access_token;
}

async function getValidCalendarToken(userId: string): Promise<string | null> {
  const token = await getCalendarToken(userId);
  if (!token) return null;

  if (new Date(token.expiresAt) < new Date()) {
    return refreshCalendarToken(userId, token.refreshToken);
  }

  return token.accessToken;
}

export async function getCalendarStatus(): Promise<{ success: boolean; data?: { connected: boolean }; error?: string }> {
  try {
    const user = await createOrGetUser();
    const token = await getCalendarToken(user.id);
    return { success: true, data: { connected: !!token } };
  } catch { return { success: false, error: "Failed to check calendar status" }; }
}

export async function disconnectCalendar(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    await deleteCalendarToken(user.id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to disconnect calendar" }; }
}

export async function getAvailableSlots(days: number = 5): Promise<ActionResponse<TimeSlot[]>> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidCalendarToken(user.id);
    if (!accessToken) return { success: false, error: "Calendar not connected" };

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy?timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ id: "primary" }],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }
    );

    if (!response.ok) return { success: false, error: "Failed to fetch calendar availability" };

    const data = await response.json();
    const busySlots = data.calendars?.primary?.busy ?? [];

    // Generate free slots (9 AM - 5 PM weekdays, 1-hour blocks)
    const freeSlots: TimeSlot[] = [];
    const startDate = new Date();
    startDate.setHours(9, 0, 0, 0);

    for (let day = 0; day < days; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day);

      // Skip weekends
      if (dayDate.getDay() === 0 || dayDate.getDay() === 6) continue;

      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(dayDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        if (slotStart <= now) continue;

        const isBusy = busySlots.some((busy: { start: string; end: string }) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isBusy) {
          freeSlots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    return { success: true, data: freeSlots };
  } catch { return { success: false, error: "Failed to get available slots" }; }
}

export async function createCalendarEvent(
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  candidateEmail?: string
): Promise<ActionResponse<CalendarEvent>> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidCalendarToken(user.id);
    if (!accessToken) return { success: false, error: "Calendar not connected" };

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event: Record<string, unknown> = {
      summary,
      description,
      start: { dateTime: startTime, timeZone },
      end: { dateTime: endTime, timeZone },
    };

    if (candidateEmail) {
      event.attendees = [{ email: candidateEmail }];
      event.sendUpdates = "all";
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error?.message ?? "Failed to create calendar event" };
    }

    const created = await response.json();
    return {
      success: true,
      data: {
        id: created.id,
        summary: created.summary,
        start: created.start?.dateTime ?? startTime,
        end: created.end?.dateTime ?? endTime,
        hangoutLink: created.hangoutLink,
      },
    };
  } catch { return { success: false, error: "Failed to create event" }; }
}

export async function updateCalendarEvent(
  eventId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  candidateEmail?: string
): Promise<ActionResponse<CalendarEvent>> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidCalendarToken(user.id);
    if (!accessToken) return { success: false, error: "Calendar not connected" };

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event: Record<string, unknown> = {
      summary,
      description,
      start: { dateTime: startTime, timeZone },
      end: { dateTime: endTime, timeZone },
    };

    if (candidateEmail) {
      event.attendees = [{ email: candidateEmail }];
      event.sendUpdates = "all";
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error?.message ?? "Failed to update calendar event" };
    }

    const updated = await response.json();
    return {
      success: true,
      data: {
        id: updated.id,
        summary: updated.summary,
        start: updated.start?.dateTime ?? startTime,
        end: updated.end?.dateTime ?? endTime,
        hangoutLink: updated.hangoutLink,
      },
    };
  } catch { return { success: false, error: "Failed to update event" }; }
}

export async function deleteCalendarEvent(eventId: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidCalendarToken(user.id);
    if (!accessToken) return { success: false, error: "Calendar not connected" };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: "Failed to delete calendar event" };
    }

    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete event" }; }
}

