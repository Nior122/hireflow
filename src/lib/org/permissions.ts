import { prisma } from "@/lib/prisma";

export type OrgRole = "OWNER" | "ADMIN" | "RECRUITER" | "HIRING_MANAGER" | "INTERVIEWER" | "VIEWER";

export const PERMISSIONS: Record<string, OrgRole[]> = {
  "org:manage": ["OWNER", "ADMIN"],
  "org:delete": ["OWNER"],
  "org:settings": ["OWNER", "ADMIN"],
  "members:invite": ["OWNER", "ADMIN", "RECRUITER"],
  "members:remove": ["OWNER", "ADMIN"],
  "members:assign_role": ["OWNER", "ADMIN"],
  "candidates:manage": ["OWNER", "ADMIN", "RECRUITER"],
  "candidates:assign": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER"],
  "candidates:review": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER"],
  "candidates:read": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"],
  "candidates:delete": ["OWNER", "ADMIN", "RECRUITER"],
  "jobs:manage": ["OWNER", "ADMIN", "RECRUITER"],
  "jobs:read": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"],
  "scorecards:write": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER"],
  "scorecards:read": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"],
  "comments:write": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER"],
  "comments:read": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"],
  "comments:delete": ["OWNER", "ADMIN"],
  "audit:read": ["OWNER", "ADMIN"],
  "pipeline:manage": ["OWNER", "ADMIN", "RECRUITER"],
  "interviews:manage": ["OWNER", "ADMIN", "RECRUITER"],
  "interviews:schedule": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER"],
  "analytics:read": ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER"],
};

export async function getUserOrgRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true, status: true },
  });
  if (!member || member.status !== "ACTIVE") return null;
  return member.role;
}

export async function hasPermission(userId: string, orgId: string, permission: string): Promise<boolean> {
  const role = await getUserOrgRole(userId, orgId);
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: { organization: true },
    orderBy: { joinedAt: "desc" },
  });
}

export async function requirePermission(userId: string, orgId: string, permission: string): Promise<{ authorized: boolean; role?: OrgRole }> {
  const role = await getUserOrgRole(userId, orgId);
  if (!role) return { authorized: false };
  const allowedRoles = PERMISSIONS[permission] ?? [];
  return { authorized: allowedRoles.includes(role), role };
}
