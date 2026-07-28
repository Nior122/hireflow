'use server';

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

const sampleJobs = [
  { company: "Vercel", role: "Frontend Engineer", link: "https://vercel.com/careers", notes: "Love their developer experience focus.", status: "WISHLIST", source: "LinkedIn" },
  { company: "Linear", role: "Product Designer", link: "https://linear.app/careers", notes: "Amazing design culture.", status: "WISHLIST", source: "Company Site" },
  { company: "Stripe", role: "Full Stack Developer", link: "https://stripe.com/jobs", notes: "Referred by Alex.", status: "WISHLIST", source: "Referral" },
  { company: "Figma", role: "UI Engineer", link: "https://figma.com/careers", notes: "Dream role.", status: "WISHLIST", source: "Twitter/X" },
  { company: "Airbnb", role: "Frontend Developer", link: "https://careers.airbnb.com", notes: "Applied via LinkedIn.", status: "APPLIED", source: "LinkedIn" },
  { company: "Notion", role: "Full Stack Engineer", link: "https://notion.so/careers", notes: "Take-home project done.", status: "APPLIED", source: "Company Site" },
  { company: "Gusto", role: "React Developer", link: null, notes: "Cover letter sent.", status: "APPLIED", source: "Indeed" },
  { company: "Spotify", role: "Web Developer", link: "https://spotifyjobs.com", notes: "Unique culture questions.", status: "APPLIED", source: "Company Site" },
  { company: "Plaid", role: "Software Engineer", link: "https://plaid.com/careers", notes: "System design prep needed.", status: "APPLIED", source: "LinkedIn" },
  { company: "Netflix", role: "Senior Frontend Engineer", link: null, notes: "Phone screen next Tuesday.", status: "INTERVIEW", source: "Referral" },
  { company: "Discord", role: "React Native Developer", link: "https://discord.com/careers", notes: "Onsite interview.", status: "INTERVIEW", source: "LinkedIn" },
  { company: "Shopify", role: "Frontend Developer", link: "https://shopify.com/careers", notes: "Technical interview this Friday.", status: "INTERVIEW", source: "Glassdoor" },
  { company: "GitHub", role: "UX Engineer", link: null, notes: "Take-home due in 5 days.", status: "INTERVIEW", source: "Company Site" },
  { company: "Zapier", role: "Full Stack Developer", link: "https://zapier.com/jobs", notes: "Offer received! $145k + equity.", status: "OFFER", source: "Referral" },
  { company: "Airtable", role: "Product Engineer", link: null, notes: "Verbal offer, waiting written.", status: "OFFER", source: "AngelList" },
  { company: "Dropbox", role: "Senior Frontend", link: "https://dropbox.com/jobs", notes: "Rejected after final round.", status: "REJECTED", source: "LinkedIn" },
  { company: "Coinbase", role: "React Engineer", link: null, notes: "Failed coding challenge.", status: "REJECTED", source: "Company Site" },
  { company: "Palantir", role: "Frontend Engineer", link: null, notes: "Ghosted after recruiter call.", status: "REJECTED", source: "Other" },
  { company: "Square", role: "Web Developer", link: "https://squareup.com/careers", notes: "Position filled internally.", status: "REJECTED", source: "Indeed" },
  { company: "Asana", role: "Frontend Developer", link: null, notes: "Over-engineered take-home.", status: "REJECTED", source: "LinkedIn" },
];

export async function seedSampleData(): Promise<{ success: boolean; error?: string }> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "Not authenticated" };

    const user = await prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {},
      create: { clerkId: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress ?? "", role: "JOB_SEEKER" },
    });

    await prisma.activityLog.deleteMany({ where: { userId: user.id } });
    await prisma.reminder.deleteMany({ where: { userId: user.id } });
    await prisma.jobApplication.deleteMany({ where: { userId: user.id } });

    const statusCounts: Record<string, number> = {};
    const data = sampleJobs.map(job => {
      const count = statusCounts[job.status] ?? 0;
      statusCounts[job.status] = count + 1;
      const createdAt = subDays(new Date(), Math.floor(Math.random() * 30) + 1);
      return { company: job.company, role: job.role, link: job.link, notes: job.notes, status: job.status as "UNAPPLIED" | "WISHLIST" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED", source: job.source, position: count, userId: user.id, createdAt, updatedAt: createdAt };
    });

    await prisma.jobApplication.createMany({ data });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Seed error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to seed sample data" };
  }
}
