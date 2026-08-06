'use client';

import { Inter } from "next/font/google";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RefreshCcw } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-background text-foreground`}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertOctagon className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">A critical error occurred</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
            We encountered a critical system error that prevented this page from loading. Our engineering team has been notified.
          </p>
          {error.digest && (
            <div className="mb-8 p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground border">
              Error ID: {error.digest}
            </div>
          )}
          <Button onClick={() => reset()} size="lg" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try to recover
          </Button>
        </div>
      </body>
    </html>
  );
}
