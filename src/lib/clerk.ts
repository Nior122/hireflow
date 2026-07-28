'use server';

export async function createOrGetUser() {
  const { currentUser } = await import("@clerk/nextjs/server");
  const { prisma } = await import("./prisma");
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
