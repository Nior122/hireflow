'use client';

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
        An unexpected error occurred while loading your dashboard. Please try again.
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCcw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
