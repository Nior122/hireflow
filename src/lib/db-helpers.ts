import { prisma } from "./prisma";

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
  status: string,
  userIdField: string = "userId"
): Promise<number> {
  const lastRecord = await (prisma as any)[tableName].findFirst({
    where: { [userIdField]: userId, status },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (lastRecord?.position ?? -1) + 1;
}

/**
 * Escape a CSV cell value by wrapping in quotes and escaping internal quotes.
 * Handles null/undefined values by returning empty string.
 */
export function escapeCsvCell(cell: any): string {
  const value = cell ?? "";
  return `"${String(value).replace(/"/g, '""')}"`;
}
