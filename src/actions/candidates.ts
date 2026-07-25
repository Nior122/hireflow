'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { CandidateCard, ActionResponse, CandidateStatus } from "@/lib/types";

export async function getCandidates(): Promise<ActionResponse<CandidateCard[]>> {
  try {
    const user = await createOrGetUser();
    const candidates = await prisma.candidate.findMany({
      where: { employerId: user.id },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
    return { success: true, data: candidates.map(c => ({
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      positionApplied: c.positionApplied, status: c.status as CandidateStatus,
      rating: c.rating, tags: c.tags, sourceEmailId: c.sourceEmailId,
      position: c.position, appliedAt: c.appliedAt, updatedAt: c.updatedAt,
    })) };
  } catch { return { success: false, error: "Failed to fetch candidates" }; }
}

export async function createCandidate(data: {
  name: string; email: string; phone?: string; positionApplied: string;
  resumeText?: string; coverLetter?: string; keySkills?: string[];
  experienceSummary?: string; sourceEmailId?: string; emailBody?: string;
}): Promise<ActionResponse<CandidateCard>> {
  try {
    const user = await createOrGetUser();
    const lastCand = await prisma.candidate.findFirst({
      where: { employerId: user.id, status: "NEW" },
      orderBy: { position: "desc" }, select: { position: true },
    });
    const candidate = await prisma.candidate.create({
      data: {
        employerId: user.id, name: data.name, email: data.email,
        phone: data.phone ?? null, positionApplied: data.positionApplied,
        resumeText: data.resumeText ?? null, coverLetter: data.coverLetter ?? null,
        keySkills: data.keySkills ?? [], experienceSummary: data.experienceSummary ?? null,
        sourceEmailId: data.sourceEmailId ?? null, emailBody: data.emailBody ?? null,
        tags: [], position: (lastCand?.position ?? -1) + 1,
      },
    });
    revalidatePath("/dashboard");
    return { success: true, data: {
      id: candidate.id, name: candidate.name, email: candidate.email,
      phone: candidate.phone, positionApplied: candidate.positionApplied,
      status: candidate.status as CandidateStatus, rating: candidate.rating,
      tags: candidate.tags, sourceEmailId: candidate.sourceEmailId,
      position: candidate.position, appliedAt: candidate.appliedAt,
      updatedAt: candidate.updatedAt,
    } };
  } catch { return { success: false, error: "Failed to create candidate" }; }
}

export async function moveCandidate(id: string, newStatus: CandidateStatus, newPosition: number): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const cand = await prisma.candidate.findFirst({ where: { id, employerId: user.id } });
    if (!cand) return { success: false, error: "Candidate not found" };

    if (cand.status === newStatus) {
      const columnCands = await prisma.candidate.findMany({ where: { employerId: user.id, status: newStatus }, orderBy: { position: "asc" } });
      const reordered = columnCands.filter(c => c.id !== id);
      const clampedPosition = Math.min(newPosition, reordered.length);
      reordered.splice(clampedPosition, 0, cand);
      await prisma.$transaction(reordered.map((c, index) => prisma.candidate.update({ where: { id: c.id }, data: { position: index } })));
    } else {
      // Wrap cross-column move in a transaction to ensure atomicity
      await prisma.$transaction([
        prisma.candidate.updateMany({
          where: { employerId: user.id, status: cand.status, position: { gt: cand.position } },
          data: { position: { decrement: 1 } }
        }),
        prisma.candidate.updateMany({
          where: { employerId: user.id, status: newStatus, position: { gte: newPosition } },
          data: { position: { increment: 1 } }
        }),
        prisma.candidate.update({
          where: { id },
          data: { status: newStatus, position: newPosition }
        }),
      ]);
    }
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to move candidate" }; }
}

export async function updateCandidateRating(id: string, rating: number): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.candidate.findFirst({ where: { id, employerId: user.id } });
    if (!existing) return { success: false, error: "Candidate not found" };
    await prisma.candidate.update({ where: { id }, data: { rating } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to update rating" }; }
}

export async function addCandidateNote(id: string, note: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const cand = await prisma.candidate.findFirst({ where: { id, employerId: user.id } });
    if (!cand) return { success: false, error: "Candidate not found" };

    const existingNotes = cand.notes ? cand.notes + "\n\n---\n\n" : "";
    await prisma.candidate.update({
      where: { id },
      data: { notes: existingNotes + note },
    });
    await prisma.candidateActivity.create({
      data: { candidateId: id, action: "NOTE_ADDED", detail: note.length > 100 ? note.slice(0, 100) + "..." : note },
    });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to add note" }; }
}

export async function generateCandidateReply(id: string, templateId: string, customInstructions?: string): Promise<ActionResponse<{ id: string; body: string }>> {
  try {
    const user = await createOrGetUser();
    const cand = await prisma.candidate.findFirst({ where: { id, employerId: user.id } });
    if (!cand) return { success: false, error: "Candidate not found" };

    const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, employerId: user.id } });
    if (!template) return { success: false, error: "Template not found" };

    const { draftReply } = await import("@/lib/ai");
    const candidateDetails = `Name: ${cand.name}\nEmail: ${cand.email}\nPosition: ${cand.positionApplied}\nSkills: ${cand.keySkills.join(", ")}`;
    const body = await draftReply(template.body, candidateDetails, customInstructions);

    const reply = await prisma.aiReply.create({
      data: { candidateId: id, body, status: "DRAFT" },
    });

    await prisma.candidateActivity.create({
      data: { candidateId: id, action: "REPLY_DRAFTED", detail: `AI drafted reply using template: ${template.name}` },
    });

    revalidatePath("/dashboard");
    return { success: true, data: { id: reply.id, body: reply.body } };
  } catch { return { success: false, error: "Failed to generate reply" }; }
}
