'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedSampleData } from "@/actions/seed";

export function EmptyState() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedSampleData();
      if (result.success) {
        toast.success("Sample data loaded! Explore your board.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to load sample data");
      }
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center py-24 px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring" }} className="mb-8 relative">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center ring-1 ring-primary/10">
          <ClipboardCheck className="h-14 w-14 text-primary/60" />
        </div>
        <motion.div className="absolute -top-2 -right-2" animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
          <Sparkles className="h-6 w-6 text-amber-500" />
        </motion.div>
      </motion.div>

      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-2xl font-bold tracking-tight mb-3">Your job hunt starts here</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-muted-foreground text-center max-w-md mb-10 leading-relaxed">
        Track every application from wishlist to offer. Load our sample data to see the board in action.
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex flex-col sm:flex-row items-center gap-3">
        <Button size="lg" className="gap-2 shimmer" onClick={handleSeed} disabled={isPending}>
          <Sparkles className="h-4 w-4" />
          {isPending ? "Loading..." : "Load Sample Jobs"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
