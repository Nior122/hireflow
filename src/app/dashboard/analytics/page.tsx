import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const user = await createOrGetUser();
  if (user.role === "JOB_SEEKER") redirect("/dashboard");
  return <AnalyticsDashboard />;
}
