import { prisma } from "@/lib/prisma";

export const TOOL_DEFINITIONS = [
  {
    name: "getApplications",
    description: "Get all job applications for the current user",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "getSavedJobs",
    description: "Get saved jobs from job discovery",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "getReminders",
    description: "Get active reminders for the current user",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "getActivity",
    description: "Get recent activity log",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "getCandidates",
    description: "Get candidates in the hiring pipeline (employer only)",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "getTemplates",
    description: "Get email templates (employer only)",
    parameters: { type: "object" as const, properties: {} },
  },
  {
    name: "moveApplication",
    description: "Move a job application to a new status",
    parameters: {
      type: "object" as const,
      properties: {
        companyId: { type: "string", description: "Application company name or ID" },
        newStatus: { type: "string", description: "New status: UNAPPLIED, WISHLIST, APPLIED, INTERVIEW, OFFER, REJECTED" },
      },
      required: ["companyId", "newStatus"],
    },
  },
  {
    name: "createReminder",
    description: "Create a reminder for a job application",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Reminder title" },
        applicationId: { type: "string", description: "Application ID (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "deleteReminder",
    description: "Delete a reminder",
    parameters: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Reminder ID" } },
      required: ["id"],
    },
  },
];

export async function executeTool(userId: string, name: string, args: Record<string, string>, role: string): Promise<string> {
  switch (name) {
    case "getApplications": {
      const apps = await prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, company: true, role: true, status: true, source: true, createdAt: true },
      });
      return JSON.stringify(apps);
    }
    case "getSavedJobs": {
      const jobs = await prisma.savedJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
      return JSON.stringify(jobs.map(j => ({ title: j.title, company: j.company, source: j.source, imported: j.importedToKanban })));
    }
    case "getReminders": {
      const reminders = await prisma.reminder.findMany({
        where: { userId, isCompleted: false },
        orderBy: { dueDate: "asc" },
      });
      return JSON.stringify(reminders.map(r => ({ id: r.id, title: r.title, dueDate: r.dueDate })));
    }
    case "getActivity": {
      const logs = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return JSON.stringify(logs.map(l => ({ action: l.action, detail: l.detail, date: l.createdAt })));
    }
    case "getCandidates": {
      if (role !== "EMPLOYER") return "Access denied";
      const cands = await prisma.candidate.findMany({
        where: { employerId: userId },
        orderBy: { updatedAt: "desc" },
      });
      return JSON.stringify(cands.map(c => ({ id: c.id, name: c.name, email: c.email, status: c.status, rating: c.rating, position: c.positionApplied })));
    }
    case "getTemplates": {
      if (role !== "EMPLOYER") return "Access denied";
      const templates = await prisma.emailTemplate.findMany({ where: { employerId: userId } });
      return JSON.stringify(templates.map(t => ({ id: t.id, name: t.name, subject: t.subject, isDefault: t.isDefault })));
    }
    case "moveApplication": {
      const app = await prisma.jobApplication.findFirst({
        where: { userId, OR: [{ id: args.companyId }, { company: { contains: args.companyId, mode: "insensitive" } }] },
      });
      if (!app) return `Application not found for "${args.companyId}". Use exact company name.`;
      await prisma.jobApplication.update({ where: { id: app.id }, data: { status: args.newStatus as "UNAPPLIED" | "WISHLIST" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" } });
      return `Moved "${app.company}" (${app.role}) to ${args.newStatus}`;
    }
    case "createReminder": {
      const app = args.applicationId
        ? await prisma.jobApplication.findFirst({ where: { id: args.applicationId, userId } })
        : null;
      const reminder = await prisma.reminder.create({
        data: {
          title: args.title,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          userId,
          applicationId: app?.id ?? (await prisma.jobApplication.findFirst({ where: { userId } }))?.id ?? "",
        },
      });
      return `Created reminder: "${reminder.title}"`;
    }
    case "deleteReminder": {
      await prisma.reminder.deleteMany({ where: { id: args.id, userId } });
      return `Reminder deleted`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
