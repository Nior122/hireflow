import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { JobSeekerDashboard } from "@/components/JobSeekerDashboard";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { getDashboardWidgets } from "@/actions/widgets";

export default async function DashboardPage() {
  const user = await createOrGetUser();

  if (user.role === "EMPLOYER") {
    return <EmployerDashboard userId={user.id} />;
  }

  const widgetsRes = await getDashboardWidgets();
  const widgets = widgetsRes.success ? widgetsRes.data! : { showStats: true, showEmailDigest: false, showUpcomingInterviews: true, showSkillGaps: false };

  return <JobSeekerDashboard userId={user.id} widgets={widgets} />;
}
