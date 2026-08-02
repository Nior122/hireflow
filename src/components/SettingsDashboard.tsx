'use client';

import { useState, useEffect, useTransition } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  User,
  Plug,
  Bot,
  CreditCard,
  Key,
  SunMoon,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Loader2,
  Mail,
  Calendar,
  Sparkles,
  ShieldCheck,
  Unplug,
  Bell,
  RefreshCw,
  AlertTriangle,
  Lock,
  History,
  Building,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "./ThemeToggle";
import { getGmailStatus, disconnectGmail } from "@/actions/gmail";
import { getCalendarStatus, disconnectCalendar } from "@/actions/calendar";
import { getSubscription, openBillingPortal } from "@/actions/billing";
import { getCareerScore } from "@/actions/copilot";
import { getApiKeys, createApiKey, revokeApiKey, type ApiKeyItem } from "@/actions/api-keys";
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from "@/actions/notifications";
import { GROQ_MODEL } from "@/lib/ai-config";

type SettingsTab = "profile" | "integrations" | "ai" | "billing" | "apikeys" | "notifications" | "appearance";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  createdAt: string;
  planDetails?: {
    name: string;
    description: string;
    price: number;
    features: string[];
  };
}

interface CareerScoreData {
  score: number;
  factors?: Array<{ label: string; value: number; weight: number }>;
}

export function SettingsDashboard() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(true);

  // Integrations state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [confirmDisconnectGmail, setConfirmDisconnectGmail] = useState(false);
  const [confirmDisconnectCalendar, setConfirmDisconnectCalendar] = useState(false);

  // Billing state
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // AI state
  const [careerScore, setCareerScore] = useState<CareerScoreData | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState("read");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    interviewReminders: true,
    applicationUpdates: true,
    weeklyDigest: false,
    marketingEmails: false,
  });
  const [isPendingNotif, startNotifTransition] = useTransition();

  useEffect(() => {
    loadSettingsData();
  }, []);

  async function loadSettingsData() {
    setLoading(true);
    const [gmailRes, calRes, subRes, scoreRes, keysRes, notifRes] = await Promise.all([
      getGmailStatus(),
      getCalendarStatus(),
      getSubscription(),
      getCareerScore(),
      getApiKeys(),
      getNotificationPreferences(),
    ]);

    if (gmailRes.success && gmailRes.data) setGmailConnected(gmailRes.data.connected);
    if (calRes.success && calRes.data) setCalendarConnected(calRes.data.connected);
    if (subRes.success && subRes.data) setSubscription(subRes.data as SubscriptionData);
    if (scoreRes.success && scoreRes.data) setCareerScore(scoreRes.data as CareerScoreData);
    if (keysRes.success && keysRes.data) setApiKeys(keysRes.data);
    if (notifRes.success && notifRes.data) setNotifications(notifRes.data);

    setLoading(false);
  }

  async function handleDisconnectGmail() {
    setConfirmDisconnectGmail(false);
    const res = await disconnectGmail();
    if (res.success) {
      toast.success("Gmail disconnected successfully");
      setGmailConnected(false);
    } else {
      toast.error(res.error ?? "Failed to disconnect Gmail");
    }
  }

  async function handleDisconnectCalendar() {
    setConfirmDisconnectCalendar(false);
    const res = await disconnectCalendar();
    if (res.success) {
      toast.success("Calendar disconnected successfully");
      setCalendarConnected(false);
    } else {
      toast.error(res.error ?? "Failed to disconnect Calendar");
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    const res = await openBillingPortal();
    if (res.success) {
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } else {
      toast.error(res.error);
    }
    setPortalLoading(false);
  }

  async function handleCreateKey() {
    if (!keyName.trim()) return;
    setCreatingKey(true);
    const res = await createApiKey(keyName.trim(), keyScope);
    if (res.success) {
      setNewRawKey(res.data.rawKey);
      toast.success("API Key generated");
      const updated = await getApiKeys();
      if (updated.success && updated.data) setApiKeys(updated.data);
    } else {
      toast.error(res.error);
    }
    setCreatingKey(false);
  }

  async function handleRevokeKey() {
    if (!revokeKeyId) return;
    const id = revokeKeyId;
    setRevokeKeyId(null);
    const res = await revokeApiKey(id);
    if (res.success) {
      toast.success("API Key revoked");
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, revokedAt: new Date() } : k));
    } else {
      toast.error(res.error);
    }
  }

  function handleToggleNotification(key: keyof NotificationPreferences) {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated); // Optimistic update

    startNotifTransition(async () => {
      const res = await updateNotificationPreferences(updated);
      if (res.success) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(res.error ?? "Failed to save preferences");
        setNotifications(notifications); // Revert on failure
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = (user?.publicMetadata?.role as string) || "JOB_SEEKER";
  const memberSince = user?.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "Recently";
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email";

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage profile, connected services, AI, billing, API keys, and preferences</p>
      </div>

      {/* Navigation: Sidebar on desktop, horizontal scrollable tabs on mobile */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
              { id: "profile", label: "Profile", icon: User },
              { id: "integrations", label: "Integrations", icon: Plug },
              { id: "ai", label: "AI & Copilot", icon: Bot },
              { id: "billing", label: "Billing & Plans", icon: CreditCard },
              { id: "apikeys", label: "API Keys", icon: Key },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "appearance", label: "Appearance", icon: SunMoon },
            ].map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-left ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal Profile</CardTitle>
                  <CardDescription>Your account details and Clerk authentication metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border bg-muted/20">
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="Avatar" className="w-16 h-16 rounded-full border shadow-sm object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary">
                        {user?.firstName?.[0] ?? "U"}
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{user?.fullName ?? user?.username ?? "HireFlow User"}</h3>
                      <p className="text-sm text-muted-foreground">{email}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="secondary" className="text-xs">{role === "EMPLOYER" ? "Employer Account" : "Job Seeker Account"}</Badge>
                        <Badge variant="outline" className="text-xs">Member since {memberSince}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">Account ID</p>
                      <p className="text-sm font-mono truncate mt-0.5">{user?.id}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">Workspace Role</p>
                      <p className="text-sm font-medium mt-0.5">{role}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-wrap gap-2">
                    <Button onClick={() => openUserProfile()} variant="default" className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Manage Account
                    </Button>
                    <Button onClick={() => openUserProfile()} variant="outline" className="gap-2">
                      <Lock className="h-4 w-4" /> Change Password
                    </Button>
                    <Button onClick={() => openUserProfile()} variant="outline" className="gap-2">
                      <History className="h-4 w-4" /> Manage Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === "integrations" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Gmail Integration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-red-500" /> Google Gmail</CardTitle>
                    <Badge className={gmailConnected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                      {gmailConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  <CardDescription>Automatically scan your inbox for interview invites and job application responses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gmailConnected ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-muted/40">
                          <p className="text-muted-foreground">Sync Status</p>
                          <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> Active</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40">
                          <p className="text-muted-foreground">Connected Email</p>
                          <p className="font-semibold truncate mt-0.5">{email}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground">Last Inbox Scan</p>
                          <p className="font-semibold mt-0.5">Automated</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => window.location.href = "/api/auth/gmail/connect"} className="gap-2">
                          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmDisconnectGmail(true)} className="gap-2 text-destructive">
                          <Unplug className="h-3.5 w-3.5" /> Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl space-y-3">
                      <Mail className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium">No Gmail account connected</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Connect Gmail to automatically import job applications from your inbox</p>
                      </div>
                      <Button size="sm" onClick={() => window.location.href = "/api/auth/gmail/connect"} className="gap-2">
                        <Plug className="h-4 w-4" /> Connect Gmail
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Google Calendar Integration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-500" /> Google Calendar</CardTitle>
                    <Badge className={calendarConnected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                      {calendarConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  <CardDescription>Sync interview invitations and automatically check availability slots</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {calendarConnected ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-muted/40">
                          <p className="text-muted-foreground">Sync Status</p>
                          <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> Active</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40">
                          <p className="text-muted-foreground">Calendar Email</p>
                          <p className="font-semibold truncate mt-0.5">{email}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground">Scheduling</p>
                          <p className="font-semibold mt-0.5">Google Meet Enabled</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => window.location.href = "/api/auth/calendar/connect"} className="gap-2">
                          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmDisconnectCalendar(true)} className="gap-2 text-destructive">
                          <Unplug className="h-3.5 w-3.5" /> Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl space-y-3">
                      <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium">No Google Calendar connected</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Connect Calendar to check availability and schedule interviews automatically</p>
                      </div>
                      <Button size="sm" onClick={() => window.location.href = "/api/auth/calendar/connect"} className="gap-2">
                        <Plug className="h-4 w-4" /> Connect Calendar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AI & COPILOT TAB */}
          {activeTab === "ai" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Groq AI Engine</CardTitle>
                  <CardDescription>Powering resume matching, copilot chat, and automated reply generation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">AI Provider</p>
                      <p className="font-semibold text-sm mt-0.5">Groq Cloud AI</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Current Model</p>
                      <p className="font-semibold text-sm mt-0.5">{GROQ_MODEL}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold text-sm text-emerald-600 mt-0.5">Active</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Token Usage</p>
                      <p className="font-semibold text-sm mt-0.5">Managed by administrator</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                      <ShieldCheck className="h-4 w-4" /> API Management Notice
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Groq API integration is managed centrally via system environment configuration. No manual user key required.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {careerScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /> Career Score</CardTitle>
                    <CardDescription>AI-calculated application velocity and responsiveness index</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="text-4xl font-bold text-primary">{careerScore.score}/100</div>
                      <div>
                        <h4 className="font-semibold text-sm">Overall Velocity Score</h4>
                        <p className="text-xs text-muted-foreground">Based on active applications, follow-up consistency, and interview rate</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {careerScore.factors?.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="font-semibold">{f.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Current Subscription</CardTitle>
                  <CardDescription>Manage your plan and billing portal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-muted/20 gap-4">
                    <div>
                      <Badge className="text-xs bg-primary/10 text-primary">{subscription?.plan ?? "FREE"} PLAN</Badge>
                      <h3 className="font-semibold text-lg mt-1">{subscription?.planDetails?.name ?? "Free Plan"}</h3>
                      <p className="text-xs text-muted-foreground">{subscription?.planDetails?.description ?? "Basic job tracking & AI feature set"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleOpenPortal} disabled={portalLoading} className="gap-2">
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Manage Subscription
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-muted-foreground">Monthly Usage</p>
                      <p className="font-semibold text-sm mt-0.5">Active Usage</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-muted-foreground">Subscription Status</p>
                      <p className="font-semibold text-sm text-emerald-600 mt-0.5">{subscription?.status ?? "ACTIVE"}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-muted-foreground">Renewal Date</p>
                      <p className="font-semibold text-sm mt-0.5">Monthly Cycle</p>
                    </div>
                  </div>

                  {subscription?.planDetails?.features && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground">Included Features:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {subscription.planDetails.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* API KEYS TAB */}
          {activeTab === "apikeys" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> REST API Keys</CardTitle>
                    <CardDescription>Manage API keys to access HireFlow programmatically</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCreateKeyOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Create Key
                  </Button>
                </CardHeader>
                <CardContent>
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-xl space-y-2">
                      <Key className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <p className="text-sm font-medium">No API keys generated</p>
                      <p className="text-xs text-muted-foreground">Generate a key to integrate with external tools</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{key.name}</span>
                              <Badge variant="outline" className="text-[10px]">{key.scopes}</Badge>
                              {key.revokedAt && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
                            </div>
                            <p className="text-xs font-mono text-muted-foreground">
                              {key.key.slice(0, 8)}••••••••••••••••
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                          {!key.revokedAt && (
                            <Button size="sm" variant="ghost" onClick={() => setRevokeKeyId(key.id)} className="text-destructive h-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Preferences</CardTitle>
                  <CardDescription>Control email alerts and application reminder notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "emailNotifications", title: "Email Notifications", desc: "Receive email alerts for application updates" },
                    { key: "interviewReminders", title: "Interview Reminders", desc: "Get reminded 24h before scheduled interviews" },
                    { key: "applicationUpdates", title: "Application Updates", desc: "Alerts when job status changes on your board" },
                    { key: "weeklyDigest", title: "Weekly Digest", desc: "Receive weekly summary report of job search activity" },
                    { key: "marketingEmails", title: "Product Updates", desc: "Receive feature updates and tips" },
                  ].map(item => {
                    const k = item.key as keyof NotificationPreferences;
                    const isChecked = notifications[k];
                    return (
                      <div key={k} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={isChecked}
                          disabled={isPendingNotif}
                          onClick={() => handleToggleNotification(k)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isChecked ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isChecked ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><SunMoon className="h-5 w-5 text-primary" /> Appearance & Theme</CardTitle>
                  <CardDescription>Customize the application theme preference</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                    <div>
                      <p className="text-sm font-medium">Color Theme Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Switch between Light, Dark, or System theme</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* CREATE API KEY DIALOG */}
      <Dialog open={createKeyOpen} onOpenChange={(val) => { setCreateKeyOpen(val); if (!val) { setNewRawKey(null); setKeyName(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          {!newRawKey ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. Zapier Integration" />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={keyScope} onValueChange={(v) => setKeyScope(v ?? "read")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="read_write">Read & Write</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateKey} disabled={creatingKey || !keyName.trim()} className="w-full">
                {creatingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-amber-600 font-semibold">Copy this key now. It will never be shown again!</p>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all flex items-center justify-between gap-2">
                <span>{newRawKey}</span>
                <Button size="icon-xs" variant="ghost" onClick={() => copyToClipboard(newRawKey)}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button onClick={() => { setCreateKeyOpen(false); setNewRawKey(null); setKeyName(""); }} className="w-full">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DISCONNECT GMAIL CONFIRMATION DIALOG */}
      <AlertDialog open={confirmDisconnectGmail} onOpenChange={setConfirmDisconnectGmail}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect Gmail? Automated application scanning will stop until reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnectGmail} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DISCONNECT CALENDAR CONFIRMATION DIALOG */}
      <AlertDialog open={confirmDisconnectCalendar} onOpenChange={setConfirmDisconnectCalendar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect Google Calendar? Interview sync and availability lookup will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnectCalendar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REVOKE API KEY CONFIRMATION DIALOG */}
      <AlertDialog open={!!revokeKeyId} onOpenChange={(val) => !val && setRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any application using this API key will lose access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
