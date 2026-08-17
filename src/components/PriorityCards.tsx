'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { getDashboardPriorities, type PriorityItem } from "@/actions/priorities";

export function PriorityCards() {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardPriorities().then(r => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyzing your job search...</span>
      </div>
    );
  }

  if (items.length === 0) return null;

  const urgencyStyles = {
    high: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10",
    medium: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
    low: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">What Should I Do Next?</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatePresence>
          {items.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            >
              {item.link ? (
                <Link href={item.link} className={`block rounded-xl border p-4 transition-all ${urgencyStyles[item.urgency]}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{item.icon}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground leading-tight mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                </Link>
              ) : (
                <div className={`rounded-xl border p-4 ${urgencyStyles[item.urgency]}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-tight mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
