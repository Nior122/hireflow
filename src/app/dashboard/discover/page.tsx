import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { DiscoverJobs } from "@/components/DiscoverJobs";

export default async function DiscoverPage() {
  const user = await createOrGetUser();
  if (user.role === "EMPLOYER") redirect("/dashboard");
  return <DiscoverJobs />;
}
