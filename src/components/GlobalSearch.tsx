'use client';

import { useState, useEffect, useTransition } from "react";
import { Search, Loader2, Briefcase, User, Calendar } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearch, type SearchResult } from "@/actions/search";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query);
        if (res.success && res.data) {
          setResults(res.data);
        }
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  function getIcon(type: string) {
    switch (type) {
      case "application": return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "candidate": return <User className="h-4 w-4 text-emerald-500" />;
      case "interview": return <Calendar className="h-4 w-4 text-indigo-500" />;
      default: return <Search className="h-4 w-4" />;
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border rounded-lg transition-colors w-full sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-xl gap-0 overflow-hidden shadow-2xl border-border">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search applications, interviews, or candidates..."
              className="border-0 shadow-none focus-visible:ring-0 rounded-none h-12 text-sm px-3"
              autoFocus
            />
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {query.length > 0 && query.length < 2 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Type at least 2 characters to search</div>
            )}
            {query.length >= 2 && results.length === 0 && !isPending && (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found for &quot;{query}&quot;</div>
            )}
            {results.length > 0 && (
              <div className="p-2 space-y-1">
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOpen(false);
                      window.location.href = item.url;
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
