'use client';

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          An unexpected error occurred while loading your dashboard view. We've logged this issue.
        </p>
        
        {error.digest && (
          <div className="w-full mb-8 p-3 rounded-lg bg-muted border text-xs font-mono text-muted-foreground/80 flex items-center justify-between">
            <span>Error Reference:</span>
            <span>{error.digest}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button onClick={reset} className="gap-2 w-full sm:w-auto">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

