import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (process.env.DEMO_MODE === "true") redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
