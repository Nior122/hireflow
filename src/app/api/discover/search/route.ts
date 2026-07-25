import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchAllProviders } from "@/lib/providers/registry";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword") ?? "";
  const location = searchParams.get("location") ?? "";
  const remote = searchParams.get("remote") as "any" | "remote" | "hybrid" | "onsite" ?? "any";
  const salary = searchParams.get("salary") ? Number(searchParams.get("salary")) : undefined;
  const jobType = searchParams.get("jobType") ?? undefined;
  const sort = searchParams.get("sort") as "newest" | "salary" | "company" | "relevance" ?? "newest";

  if (!keyword.trim()) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }

  try {
    const results = await searchAllProviders({
      keyword,
      location,
      remote,
      salary,
      jobType,
      sort,
    });

    return NextResponse.json({ jobs: results });
  } catch (error) {
    console.error("Job search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
