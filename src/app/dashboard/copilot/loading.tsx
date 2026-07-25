import { Skeleton } from "@/components/ui/skeleton";

export default function CopilotLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
