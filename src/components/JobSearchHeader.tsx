'use client';

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobSearchParams, RemoteType, JobSort } from "@/lib/types";

interface Props {
  onSearch: (params: JobSearchParams) => void;
  loading: boolean;
}

export function JobSearchHeader({ onSearch, loading }: Props) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<RemoteType>("any");
  const [salary, setSalary] = useState("");
  const [jobType, setJobType] = useState("");
  const [datePosted] = useState("");
  const [sort, setSort] = useState<JobSort>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Remember previous search from sessionStorage
  useEffect(() => {
    const prev = sessionStorage.getItem("hf_last_search");
    if (prev) {
      try {
        const params = JSON.parse(prev);
        setKeyword(params.keyword ?? "");
        setLocation(params.location ?? "");
        setRemote(params.remote ?? "any");
      } catch {}
    }
  }, []);

  function handleSearch() {
    if (!keyword.trim()) return;
    const params: JobSearchParams = {
      keyword,
      location,
      remote,
      salary: salary ? Number(salary) : undefined,
      jobType,
      datePosted,
      sort,
    };
    sessionStorage.setItem("hf_last_search", JSON.stringify(params));
    onSearch(params);
  }

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b py-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Job title, keywords, or company..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="pl-9 h-11"
          />
        </div>
        <div className="relative flex-1">
          <Input
            placeholder="City, state, or country"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="h-11"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !keyword.trim()} className="h-11 px-6">
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="h-11 w-11"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex items-end gap-3 pb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Remote</Label>
            <Select value={remote} onValueChange={v => setRemote(v as RemoteType)}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Salary Min ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 80000"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              className="h-9 w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Job Type</Label>
            <Select value={jobType} onValueChange={v => setJobType(v ?? "")}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Sort</Label>
            <Select value={sort} onValueChange={v => setSort(v as JobSort)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(salary || jobType) && (
            <Button variant="ghost" size="sm" onClick={() => { setSalary(""); setJobType(""); }} className="h-9 gap-1 text-xs">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
