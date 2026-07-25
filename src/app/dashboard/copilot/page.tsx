import { createOrGetUser } from "@/lib/clerk";
import { redirect } from "next/navigation";
import { CopilotLayout } from "@/components/CopilotLayout";

export default async function CopilotPage() {
  const user = await createOrGetUser();
  return <CopilotLayout roleContext={user.role} />;
}
