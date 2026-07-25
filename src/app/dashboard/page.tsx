import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { JobSeekerDashboard } from "@/components/JobSeekerDashboard";
import { EmployerDashboard } from "@/components/EmployerDashboard";

export default async function DashboardPage() {
  const user = await createOrGetUser();

  if (user.role === "EMPLOYER") {
    return <EmployerDashboard userId={user.id} />;
  }

  return <JobSeekerDashboard userId={user.id} />;
}
