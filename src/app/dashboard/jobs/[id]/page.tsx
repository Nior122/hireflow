import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobWorkspace } from "@/components/JobWorkspace";

interface JobWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function JobWorkspacePage({ params }: JobWorkspacePageProps) {
  const user = await createOrGetUser();
  if (user.role === "EMPLOYER") redirect("/dashboard");

  const { id } = await params;

  const job = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      resumes: {
        orderBy: { updatedAt: "desc" },
        include: { sections: { orderBy: { order: "asc" } } },
      },
      interviews: {
        orderBy: { scheduledAt: "desc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
      },
      practices: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!job || job.userId !== user.id) {
    redirect("/dashboard");
  }

  // Fetch related emails (by jobApplicationId or fallback to company name)
  const emails = await prisma.emailMessage.findMany({
    where: {
      userId: user.id,
      OR: [
        { jobApplicationId: job.id },
        { sender: { contains: job.company, mode: "insensitive" } },
        { subject: { contains: job.company, mode: "insensitive" } },
      ],
    },
    orderBy: { receivedAt: "desc" },
    take: 20,
  });

  // Fetch career profile
  const careerProfile = await prisma.aIUserProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <JobWorkspace
      job={JSON.parse(JSON.stringify(job))}
      emails={JSON.parse(JSON.stringify(emails))}
      careerProfile={careerProfile ? JSON.parse(JSON.stringify(careerProfile)) : null}
    />
  );
}
