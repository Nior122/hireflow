import { prisma } from "./prisma";
import type { Status, CandidateStatus } from "@prisma/client";

/**
 * Get the next position for a record in a Kanban column.
 * This finds the maximum position in the given status column and returns the next position.
 *
 * @param tableName - The Prisma model name to query ("jobApplication" or "candidate")
 * @param userId - The user ID to filter by
 * @param status - The status column to get the next position for
 * @param userIdField - The field name for the user ID ("userId" for applications, "employerId" for candidates)
 * @returns The next position (0-indexed)
 */
export async function getNextPosition(
  tableName: "jobApplication" | "candidate",
  userId: string,
  status: Status | CandidateStatus | string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userIdField: string = "userId"
): Promise<number> {
  let lastRecord: { position: number } | null = null;
  if (tableName === "jobApplication") {
    lastRecord = await prisma.jobApplication.findFirst({
      where: { userId, status: status as Status },
      orderBy: { position: "desc" },
      select: { position: true },
    });
  } else if (tableName === "candidate") {
    lastRecord = await prisma.candidate.findFirst({
      where: { employerId: userId, status: status as CandidateStatus },
      orderBy: { position: "desc" },
      select: { position: true },
    });
  }
  return (lastRecord?.position ?? -1) + 1;
}

/**
 * Escape a CSV cell value by wrapping in quotes and escaping internal quotes.
 * Handles null/undefined values by returning empty string.
 */
export function escapeCsvCell(cell: unknown): string {
  const value = cell ?? "";
  return `"${String(value).replace(/"/g, '""')}"`;
}
