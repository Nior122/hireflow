import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { InterviewCenter } from "@/components/InterviewCenter";

export default async function InterviewsPage() {
  const user = await createOrGetUser();
  if (user.role === "EMPLOYER") redirect("/dashboard");
  return <InterviewCenter />;
}
