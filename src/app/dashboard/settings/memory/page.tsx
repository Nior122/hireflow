import { AIMemoryManager } from "@/components/AIMemoryManager";

export const metadata = {
  title: "AI Memory | Settings | HireFlow",
  description: "View and manage what HireFlow's AI remembers about your career.",
};

export default function AIMemoryPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Memory Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          HireFlow learns about your career from your Gmail, resumes, applications, and interviews.
          Here you can see, edit, confirm, or delete what it remembers.
        </p>
      </div>
      <AIMemoryManager />
    </div>
  );
}
