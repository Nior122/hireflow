'use server';

import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { escapeCsvCell } from "@/lib/db-helpers";

export async function exportApplicationsCSV(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const user = await createOrGetUser();
    const apps = await prisma.jobApplication.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

    const headers = ["Company", "Role", "Status", "Source", "Link", "Notes", "Contact Name", "Contact Email", "Created At"];
    const rows = apps.map((a: { company: string; role: string; status: string; source: string | null; link: string | null; notes: string | null; contactName: string | null; contactEmail: string | null; createdAt: Date }) => [
      a.company, a.role, a.status, a.source ?? "", a.link ?? "", a.notes ?? "",
      a.contactName ?? "", a.contactEmail ?? "", new Date(a.createdAt).toISOString().split("T")[0]
    ].map(escapeCsvCell).join(","));

    return { success: true, data: [headers.join(","), ...rows].join("\n") };
  } catch { return { success: false, error: "Failed to export" }; }
}
