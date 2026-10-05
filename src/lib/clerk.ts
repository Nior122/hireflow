'use server';

export async function createOrGetUser() {
  const { prisma } = await import("./prisma");

  if (process.env.DEMO_MODE === "true") {
    return prisma.user.upsert({
      where: { clerkId: "demo-local-user" },
      update: { email: "demo@hireflow.local", role: "JOB_SEEKER" },
      create: {
        clerkId: "demo-local-user",
        email: "demo@hireflow.local",
        role: "JOB_SEEKER",
      },
    });
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Not authenticated");

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email found");

  const role = (clerkUser.publicMetadata?.role as string) || "JOB_SEEKER";

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      role: role as "JOB_SEEKER" | "EMPLOYER",
      companyName: (clerkUser.publicMetadata?.companyName as string) || undefined,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      role: role as "JOB_SEEKER" | "EMPLOYER",
      companyName: (clerkUser.publicMetadata?.companyName as string) || undefined,
    },
  });

  return user;
}
