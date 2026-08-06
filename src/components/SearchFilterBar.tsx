'use client';

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STATUS_ORDER, STATUS_LABELS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";

interface Props { applications: ApplicationCard[]; onFilterChange: (filters: { search: string; statuses: ApplicationStatus[] }) => void; }

export function SearchFilterBar({ onFilterChange }: Props) {
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<ApplicationStatus[]>([]);

  function toggleStatus(status: ApplicationStatus) {
    const next = statuses.includes(status) ? statuses.filter(s => s !== status) : [...statuses, status];
    setStatuses(next);
    onFilterChange({ search, statuses: next });
  }

  function clearAll() {
    setSearch(""); setStatuses([]);
    onFilterChange({ search: "", statuses: [] });
  }

  const hasFilters = search || statuses.length > 0;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by company or role..." value={search} onChange={e => { setSearch(e.target.value); onFilterChange({ search: e.target.value, statuses }); }} className="pl-9 h-9" />
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map(status => (
          <Badge key={status} variant={statuses.includes(status) ? "default" : "secondary"} className="cursor-pointer text-xs" onClick={() => toggleStatus(status)}>
            {STATUS_LABELS[status]}
          </Badge>
        ))}
      </div>
    </div>
  );
}
