import { NextRequest } from "next/server";
import { getExecutiveMetrics } from "@/lib/analytics/aggregation";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  try {
    const metrics = await getExecutiveMetrics();
    return Response.json({ data: metrics });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
