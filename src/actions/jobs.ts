'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

export async function getJobWorkspace(jobId: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    
    // Attempt to fetch JobApplication
    let job = await prisma.jobApplication.findUnique({
      where: { id: jobId },
      include: {
        resumes: { orderBy: { updatedAt: 'desc' } },
        interviews: { orderBy: { scheduledAt: 'desc' } },
        practices: { orderBy: { createdAt: 'desc' } },
      }
    });

    if (!job) {
      return { success: false, error: "Job not found or access denied." };
    }

    if (job.userId !== user.id) {
      return { success: false, error: "Access denied." };
    }

    // Fetch related emails if sourceEmailId is present
    let emails: any[] = [];
    if (job.sourceEmailId) {
      const sourceEmail = await prisma.emailMessage.findUnique({
        where: { id: job.sourceEmailId }
      });
      if (sourceEmail) emails.push(sourceEmail);
    }

    return { 
      success: true, 
      data: {
        job,
        emails
      } 
    };

  } catch (error) {
    console.error("[getJobWorkspace] Error:", error);
    return { success: false, error: "Failed to load job workspace." };
  }
}

export async function selectDiscoveredJob(discoveredJobId: string): Promise<ActionResponse<{ jobId: string }>> {
  try {
    const user = await createOrGetUser();

    const discovered = await prisma.discoveredJob.findUnique({
      where: { id: discoveredJobId }
    });

    if (!discovered || discovered.userId !== user.id) {
      return { success: false, error: "Discovered job not found." };
    }

    // Create a JobApplication from it
    const newJob = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        company: discovered.company,
        role: discovered.title,
        status: "UNAPPLIED",
        source: "Gmail AI Discovery",
        sourceEmailId: discovered.sourceEmailId,
      }
    });

    // Mark discovered job as SAVED
    await prisma.discoveredJob.update({
      where: { id: discoveredJobId },
      data: { status: "SAVED" }
    });

    revalidatePath("/dashboard/discover");
    
    return { success: true, data: { jobId: newJob.id } };

  } catch (error) {
    console.error("[selectDiscoveredJob] Error:", error);
    return { success: false, error: "Failed to select job." };
  }
}
