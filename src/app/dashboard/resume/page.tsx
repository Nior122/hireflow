import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { ResumeStudio } from "@/components/ResumeStudio";

export default async function ResumePage() {
  const user = await createOrGetUser();
  if (user.role === "EMPLOYER") redirect("/dashboard");
  return <ResumeStudio />;
}
