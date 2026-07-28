'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { getUserOrgRole, requirePermission, type OrgRole } from "@/lib/org/permissions";
import { randomBytes } from "crypto";
import type { ActionResponse } from "@/lib/types";

// ─── Organization CRUD ──────────────────────────────────────────

export async function createOrganization(name: string, slug: string, data?: { website?: string; industry?: string; companySize?: string }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) return { success: false, error: "Slug already taken" };

    const org = await prisma.organization.create({
      data: {
        name, slug,
        website: data?.website ?? null,
        industry: data?.industry ?? null,
        companySize: data?.companySize ?? null,
        members: { create: { userId: user.id, role: "OWNER", status: "ACTIVE" } },
      },
      include: { members: true },
    });

    await prisma.auditLog.create({
      data: { organizationId: org.id, userId: user.id, action: "ORGANIZATION_CREATED", entity: "Organization", newValue: { name, slug } },
    });

    revalidatePath("/dashboard");
    return { success: true, data: org };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function getOrganizations(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { organization: { include: { members: { include: { user: { select: { id: true, email: true, companyName: true } } } } } } },
      orderBy: { joinedAt: "desc" },
    });
    return { success: true, data: memberships.map(m => ({ ...m.organization, myRole: m.role, memberCount: m.organization.members.length })) };
  } catch { return { success: false, error: "Failed" }; }
}

export async function getOrganization(orgId: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const role = await getUserOrgRole(user.id, orgId);
    if (!role) return { success: false, error: "Not a member" };

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: { include: { user: { select: { id: true, email: true, companyName: true } } } },
        jobPostings: { orderBy: { updatedAt: "desc" } },
      },
    });
    return { success: true, data: { ...org, myRole: role } };
  } catch { return { success: false, error: "Failed" }; }
}

export async function updateOrganization(orgId: string, data: { name?: string; website?: string; industry?: string; companySize?: string }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "org:settings");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    const org = await prisma.organization.update({ where: { id: orgId }, data });
    await prisma.auditLog.create({
      data: { organizationId: org.id, userId: user.id, action: "ORGANIZATION_UPDATED", entity: "Organization", newValue: data },
    });
    revalidatePath("/dashboard");
    return { success: true, data: org };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Members ────────────────────────────────────────────────────

export async function getMembers(orgId: string): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const role = await getUserOrgRole(user.id, orgId);
    if (!role) return { success: false, error: "Not a member" };

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      include: { user: { select: { id: true, email: true, companyName: true } } },
    });
    return { success: true, data: members };
  } catch { return { success: false, error: "Failed" }; }
}

export async function updateMemberRole(orgId: string, memberId: string, newRole: OrgRole): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "members:assign_role");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    await prisma.organizationMember.update({ where: { id: memberId }, data: { role: newRole } });
    await prisma.auditLog.create({
      data: { organizationId: orgId, userId: user.id, action: "MEMBER_ROLE_CHANGED", entity: "OrganizationMember", entityId: memberId, newValue: { role: newRole } },
    });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

export async function removeMember(orgId: string, memberId: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "members:remove");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    await prisma.organizationMember.update({ where: { id: memberId }, data: { status: "INACTIVE" } });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Invitations ────────────────────────────────────────────────

export async function inviteMember(orgId: string, email: string, role: OrgRole): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "members:invite");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    const existing = await prisma.organizationInvitation.findFirst({
      where: { organizationId: orgId, email, acceptedAt: null },
    });
    if (existing) return { success: false, error: "Invitation already pending" };

    const token = randomBytes(32).toString("hex");
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email,
        role,
        token,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: { organizationId: orgId, userId: user.id, action: "MEMBER_INVITED", entity: "OrganizationInvitation", newValue: { email, role } },
    });

    return { success: true, data: invitation };
  } catch { return { success: false, error: "Failed" }; }
}

export async function getInvitations(orgId: string): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const role = await getUserOrgRole(user.id, orgId);
    if (!role) return { success: false, error: "Not authorized" };

    const invitations = await prisma.organizationInvitation.findMany({
      where: { organizationId: orgId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: invitations };
  } catch { return { success: false, error: "Failed" }; }
}

export async function acceptInvitation(token: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const invitation = await prisma.organizationInvitation.findUnique({ where: { token } });
    if (!invitation) return { success: false, error: "Invalid invitation" };
    if (invitation.acceptedAt) return { success: false, error: "Already accepted" };
    if (invitation.expiresAt < new Date()) return { success: false, error: "Invitation expired" };

    const existingMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invitation.organizationId, userId: user.id } },
    });
    if (existingMember) {
      await prisma.organizationMember.update({ where: { id: existingMember.id }, data: { status: "ACTIVE", role: invitation.role } });
    } else {
      await prisma.organizationMember.create({
        data: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role, status: "ACTIVE" },
      });
    }

    await prisma.organizationInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return { success: true, data: { organizationId: invitation.organizationId } };
  } catch { return { success: false, error: "Failed" }; }
}

export async function cancelInvitation(invitationId: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const inv = await prisma.organizationInvitation.findUnique({ where: { id: invitationId } });
    if (!inv) return { success: false, error: "Not found" };
    const perm = await requirePermission(user.id, inv.organizationId, "members:remove");
    if (!perm.authorized) return { success: false, error: "Not authorized" };
    await prisma.organizationInvitation.delete({ where: { id: invitationId } });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Job Postings ───────────────────────────────────────────────

export async function getJobPostings(orgId: string): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const role = await getUserOrgRole(user.id, orgId);
    if (!role) return { success: false, error: "Not a member" };

    const jobs = await prisma.jobPosting.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
    });
    return { success: true, data: jobs };
  } catch { return { success: false, error: "Failed" }; }
}

export async function createJobPosting(orgId: string, data: {
  title: string; department?: string; employmentType?: string; location?: string;
  salaryMin?: number; salaryMax?: number; description?: string; requirements?: string;
  benefits?: string; hiringManagerId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "jobs:manage");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    const job = await prisma.jobPosting.create({
      data: { ...data, organizationId: orgId, createdBy: user.id },
    });
    await prisma.auditLog.create({
      data: { organizationId: orgId, userId: user.id, action: "JOB_POSTING_CREATED", entity: "JobPosting", newValue: { title: data.title } },
    });
    revalidatePath("/dashboard");
    return { success: true, data: job };
  } catch { return { success: false, error: "Failed" }; }
}

export async function updateJobPosting(orgId: string, id: string, data: {
  title?: string; department?: string; status?: string; description?: string;
  requirements?: string; benefits?: string; hiringManagerId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "jobs:manage");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    const job = await prisma.jobPosting.update({ where: { id }, data: { title: data.title, department: data.department, status: data.status as "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED", description: data.description, requirements: data.requirements, benefits: data.benefits, hiringManagerId: data.hiringManagerId } });
    revalidatePath("/dashboard");
    return { success: true, data: job };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Comments ───────────────────────────────────────────────────

export async function getComments(candidateId: string): Promise<ActionResponse<any[]>> {
  try {
    const comments = await prisma.teamComment.findMany({
      where: { candidateId },
      include: { user: { select: { id: true, email: true, companyName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: comments };
  } catch { return { success: false, error: "Failed" }; }
}

export async function addComment(candidateId: string, content: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const comment = await prisma.teamComment.create({
      data: { candidateId, userId: user.id, content },
      include: { user: { select: { id: true, email: true, companyName: true } } },
    });
    return { success: true, data: comment };
  } catch { return { success: false, error: "Failed" }; }
}

export async function resolveComment(id: string): Promise<ActionResponse<void>> {
  try {
    const comment = await prisma.teamComment.findUnique({ where: { id } });
    if (!comment) return { success: false, error: "Not found" };
    await prisma.teamComment.update({ where: { id }, data: { isResolved: !comment.isResolved } });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

export async function deleteComment(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const comment = await prisma.teamComment.findUnique({
      where: { id },
      select: { userId: true, candidate: { select: { employerId: true } } },
    });
    if (!comment) return { success: false, error: "Not found" };
    if (comment.userId !== user.id) {
      if (!comment.candidate?.employerId) return { success: false, error: "Not authorized" };
      const role = await getUserOrgRole(user.id, comment.candidate.employerId);
      if (!role || !["OWNER", "ADMIN"].includes(role)) return { success: false, error: "Not authorized" };
    }
    await prisma.teamComment.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Scorecards ─────────────────────────────────────────────────

export async function getScorecards(candidateId: string): Promise<ActionResponse<any[]>> {
  try {
    const cards = await prisma.candidateScorecard.findMany({
      where: { candidateId },
      include: { user: { select: { id: true, email: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: cards };
  } catch { return { success: false, error: "Failed" }; }
}

export async function submitScorecard(candidateId: string, data: {
  technicalScore?: number; communicationScore?: number; problemSolvingScore?: number;
  leadershipScore?: number; cultureFitScore?: number; recommendation: string; notes?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const scores = [data.technicalScore, data.communicationScore, data.problemSolvingScore, data.leadershipScore, data.cultureFitScore].filter(Boolean);
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b!, 0) / scores.length) : null;

    const card = await prisma.candidateScorecard.create({
      data: { candidateId, userId: user.id, ...data, overallScore },
      include: { user: { select: { id: true, email: true, companyName: true } } },
    });
    return { success: true, data: card };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Candidate Assignment ───────────────────────────────────────

export async function assignCandidate(candidateId: string, recruiterId?: string, jobPostingId?: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { recruiterId: recruiterId ?? null, jobPostingId: jobPostingId ?? null },
    });
    await prisma.auditLog.create({
      data: { organizationId: "", userId: user.id, action: "CANDIDATE_ASSIGNED", entity: "Candidate", entityId: candidateId, newValue: { recruiterId, jobPostingId } },
    });
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Audit Logs ─────────────────────────────────────────────────

export async function getAuditLogs(orgId: string, limit: number = 50): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const perm = await requirePermission(user.id, orgId, "audit:read");
    if (!perm.authorized) return { success: false, error: "Not authorized" };

    const logs = await prisma.auditLog.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { success: true, data: logs };
  } catch { return { success: false, error: "Failed" }; }
}
