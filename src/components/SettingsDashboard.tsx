'use client';

import { useState, useEffect, useTransition } from "react";
import { 
  User, 
  Link as LinkIcon, 
  Brain, 
  CreditCard, 
  Settings, 
  Mail, 
  Shield, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGmailSyncStatus, syncGmailInbox } from "@/actions/gmail-sync";
import { LinkedInImport } from "./LinkedInImport";
import { toast } from "sonner";

export function SettingsDashboard() {
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    lastSyncedAt: Date | null;
    emailCount: number;
    jobsDiscovered: number;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSyncing, startSync] = useTransition();

  useEffect(() => {
    async function loadGmailStatus() {
      const res = await getGmailSyncStatus();
      if (res.success && res.data) {
        setGmailStatus(res.data);
      }
      setLoading(false);
    }
    loadGmailStatus();
  }, []);

  const handleSync = () => {
    startSync(async () => {
      try {
        const result = await syncGmailInbox();
        if (result.success) {
          toast.success(`Synced! Processed ${result.data?.emailsProcessed ?? 0} emails, found ${result.data?.jobsDiscovered ?? 0} jobs.`);
          // Refresh Gmail status
          const res = await getGmailSyncStatus();
          if (res.success && res.data) setGmailStatus(res.data);
        } else {
          toast.error(result.error ?? "Failed to sync Gmail.");
        }
      } catch (err) {
        toast.error("Network error while syncing Gmail. Please try again.");
      }
    });
  };

  const handleLinkedInImport = (company: string, role: string) => {
    toast.success(`Imported: ${role} at ${company}`);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          Settings
        </h2>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="w-full justify-start h-12 p-1 bg-muted/50 backdrop-blur-xl border border-border/50 rounded-xl">
            <TabsTrigger value="profile" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LinkIcon className="h-4 w-4" /> Integrations
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Brain className="h-4 w-4" /> AI & Groq
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" /> Preferences
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4 outline-none">
          <Card className="border-border/50 shadow-sm overflow-hidden backdrop-blur-xl bg-card/50">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Manage your personal information and resume data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" className="max-w-md bg-background/50" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" disabled className="max-w-md bg-muted/50" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> Auto-fill from External Sources
                </h4>
                <div className="flex flex-col gap-4 items-start bg-muted/30 p-4 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Import your current job details directly from your public LinkedIn profile.
                  </p>
                  <LinkedInImport onImport={handleLinkedInImport} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 border-t border-border/50">
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-4 outline-none">
          <Card className="border-border/50 shadow-sm overflow-hidden backdrop-blur-xl bg-card/50">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected services like Gmail for automated job tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border/50 rounded-xl bg-background/50 gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      Gmail Sync
                      {!loading && gmailStatus?.connected ? (
                        <span className="flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Disconnected
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically extract jobs and interviews from your inbox.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  {!loading && gmailStatus?.connected ? (
                    <Button variant="outline" className="w-full sm:w-auto shadow-sm gap-2" onClick={handleSync} disabled={isSyncing}>
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full sm:w-auto shadow-sm gap-2" 
                      onClick={() => { window.location.href = "/api/auth/gmail/connect"; }}
                    >
                      <Mail className="w-4 h-4" /> Connect Gmail
                    </Button>
                  )}
                  
                  {!loading && gmailStatus?.connected && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> 
                      Last synced: {gmailStatus.lastSyncedAt ? new Date(gmailStatus.lastSyncedAt).toLocaleString() : 'Never'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI & GROQ TAB */}
        <TabsContent value="ai" className="space-y-4 outline-none">
          <Card className="border-border/50 shadow-sm overflow-hidden backdrop-blur-xl bg-card/50 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" /> AI Configuration
              </CardTitle>
              <CardDescription>
                Configure the LLM models that power your automated extractions and insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-background/50">
                <div className="grid gap-2">
                  <Label htmlFor="groq-key">Groq API Key</Label>
                  <div className="flex gap-2">
                    <Input id="groq-key" type="password" placeholder="gsk_..." className="font-mono bg-muted/50" />
                    <Button variant="outline">Verify</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your key is stored securely and only used for your job extractions.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-background/50">
                <h4 className="font-medium text-sm">Model Preferences</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-3 border border-primary/20 rounded-lg bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                    <h5 className="font-medium flex justify-between items-center text-sm">
                      Llama 3 8B
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1">Faster, great for basic extraction.</p>
                  </div>
                  <div className="p-3 border border-border/50 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <h5 className="font-medium text-sm">Llama 3 70B</h5>
                    <p className="text-xs text-muted-foreground mt-1">More accurate, best for complex emails.</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 border-t border-border/50">
              <Button>Save AI Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-4 outline-none">
          <Card className="border-border/50 shadow-sm overflow-hidden backdrop-blur-xl bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and payment methods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-muted/20 rounded-xl border border-dashed border-border/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-lg">Pro Plan Status</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You are currently on the free tier. Upgrade to Pro for unlimited AI extractions and premium support.
                </p>
                <Button className="mt-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-4 outline-none">
          <Card className="border-border/50 shadow-sm overflow-hidden backdrop-blur-xl bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> App Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience and notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-background/50">
                <h4 className="font-medium text-sm mb-4">Notifications</h4>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Summaries</Label>
                    <p className="text-xs text-muted-foreground">Receive weekly reports of your job hunt progress.</p>
                  </div>
                  <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Interview Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get notified 24h before an upcoming interview.</p>
                  </div>
                  <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
