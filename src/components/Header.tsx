'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { Zap, Bell, CalendarClock, Check, Search, LayoutGrid, Bot, FileText, Video, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, isPast } from "date-fns";
import { getReminders, completeReminder } from "@/actions/reminders";

export function Header() {
  const [reminders, setReminders] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    getReminders().then(r => { if (r.success) setReminders(r.data ?? []); });
  }, []);

  const pendingReminders = reminders.filter(r => !r.isCompleted);
  const overdueReminders = pendingReminders.filter(r => isPast(new Date(r.dueDate)));
  const upcomingReminders = pendingReminders.filter(r => !isPast(new Date(r.dueDate)));
  const hasNotifications = pendingReminders.length > 0;

  function handleComplete(id: string) {
    completeReminder(id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: true } : r));
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <Zap className="h-6 w-6 text-primary" />
          <span>HireFlow</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/dashboard">
            <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <LayoutGrid className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/discover">
            <Button variant={pathname?.startsWith("/dashboard/discover") ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <Search className="h-4 w-4" /> Job Discovery
            </Button>
          </Link>
          <Link href="/dashboard/copilot">
            <Button variant={pathname?.startsWith("/dashboard/copilot") ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <Bot className="h-4 w-4" /> AI Copilot
            </Button>
          </Link>
          <Link href="/dashboard/resume">
            <Button variant={pathname?.startsWith("/dashboard/resume") ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <FileText className="h-4 w-4" /> Resume Studio
            </Button>
          </Link>
          <Link href="/dashboard/interviews">
            <Button variant={pathname?.startsWith("/dashboard/interviews") ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <Video className="h-4 w-4" /> Interview Center
            </Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant={pathname?.startsWith("/dashboard/analytics") ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-sm">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="relative" />
              }
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-0" align="end">
              <div className="p-3 border-b">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <p className="text-xs text-muted-foreground">{pendingReminders.length} pending reminder{pendingReminders.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {overdueReminders.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-medium text-destructive uppercase tracking-wider px-2 mb-1">Overdue</p>
                    {overdueReminders.map(r => (
                      <DropdownMenuItem key={r.id} className="flex items-center justify-between p-2 gap-2 cursor-default">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.title}</p>
                          <p className="text-[10px] text-destructive">Due {formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
                        </div>
                        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }}><Check className="h-3 w-3" /></Button>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {overdueReminders.length > 0 && upcomingReminders.length > 0 && <DropdownMenuSeparator />}
                {upcomingReminders.length > 0 && (
                  <div className="p-2">
                    {overdueReminders.length === 0 && <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">Upcoming</p>}
                    {upcomingReminders.map(r => (
                      <DropdownMenuItem key={r.id} className="flex items-center justify-between p-2 gap-2 cursor-default">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground">Due {formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
                        </div>
                        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }}><Check className="h-3 w-3" /></Button>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {pendingReminders.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">
                    <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No pending reminders</p>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Link href="/dashboard/settings" title="Settings">
            <Button variant={pathname?.startsWith("/dashboard/settings") ? "secondary" : "ghost"} size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Settings"
                labelIcon={<Settings className="h-4 w-4" />}
                href="/dashboard/settings"
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
    </header>
  );
}
