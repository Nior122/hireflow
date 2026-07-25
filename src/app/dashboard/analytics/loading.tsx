import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64 rounded-lg" />
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );
}
