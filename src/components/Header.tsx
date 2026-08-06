'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { Zap, Bell, CalendarClock, Check, Search, LayoutGrid, Bot, FileText, Video, BarChart3, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDistanceToNow, isPast } from "date-fns";
import { getReminders, completeReminder } from "@/actions/reminders";

export function Header() {
  const [reminders, setReminders] = useState<any[]>([]);
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, active: pathname === "/dashboard" },
    { href: "/dashboard/discover", label: "Job Discovery", icon: Search, active: pathname?.startsWith("/dashboard/discover") },
    { href: "/dashboard/copilot", label: "AI Copilot", icon: Bot, active: pathname?.startsWith("/dashboard/copilot") },
    { href: "/dashboard/resume", label: "Resume Studio", icon: FileText, active: pathname?.startsWith("/dashboard/resume") },
    { href: "/dashboard/interviews", label: "Interview Center", icon: Video, active: pathname?.startsWith("/dashboard/interviews") },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, active: pathname?.startsWith("/dashboard/analytics") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>HireFlow</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button 
                        variant={link.active ? "secondary" : "ghost"} 
                        className={`w-full justify-start gap-3 ${link.active ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <Icon className="h-4 w-4" /> {link.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">HireFlow</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 mx-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-1.5 text-sm transition-all duration-200 relative ${link.active ? 'text-primary bg-primary/5 hover:bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-current={link.active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" /> 
                  {link.label}
                  {link.active && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block mr-2 relative">
            <GlobalSearch />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative transition-all hover:bg-muted inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0 shadow-lg border-muted" align="end">
              <div className="p-4 border-b bg-muted/30">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <p className="text-xs text-muted-foreground">{pendingReminders.length} pending reminder{pendingReminders.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {overdueReminders.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider px-2 mb-1.5">Overdue</p>
                    {overdueReminders.map(r => (
                      <DropdownMenuItem key={r.id} className="flex items-start p-2.5 gap-3 cursor-default rounded-md">
                        <div className="mt-0.5"><CalendarClock className="h-4 w-4 text-destructive/70" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight mb-1">{r.title}</p>
                          <p className="text-xs text-destructive/90 font-medium">Due {formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
                        </div>
                        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }} className="h-6 w-6 rounded-full hover:bg-emerald-500/20 hover:text-emerald-600"><Check className="h-3 w-3" /></Button>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {overdueReminders.length > 0 && upcomingReminders.length > 0 && <DropdownMenuSeparator />}
                {upcomingReminders.length > 0 && (
                  <div className="p-2">
                    {overdueReminders.length === 0 && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">Upcoming</p>}
                    {upcomingReminders.map(r => (
                      <DropdownMenuItem key={r.id} className="flex items-start p-2.5 gap-3 cursor-default rounded-md">
                        <div className="mt-0.5"><CalendarClock className="h-4 w-4 text-muted-foreground/50" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight mb-1">{r.title}</p>
                          <p className="text-xs text-muted-foreground">Due {formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
                        </div>
                        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }} className="h-6 w-6 rounded-full hover:bg-emerald-500/20 hover:text-emerald-600"><Check className="h-3 w-3" /></Button>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {pendingReminders.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-5 w-5 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">You&apos;re all caught up!</p>
                    <p className="text-xs mt-1">No pending reminders</p>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Link href="/dashboard/settings" title="Settings" className="hidden sm:block">
            <Button variant={pathname?.startsWith("/dashboard/settings") ? "secondary" : "ghost"} size="icon" className="transition-all hover:bg-muted" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <div className="ml-1 pl-3 border-l">
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 ring-2 ring-background border shadow-sm transition-transform hover:scale-105" } }}>
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
      </div>
    </header>
  );
}

