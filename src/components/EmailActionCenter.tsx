'use client';

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Inbox, Loader2, Briefcase, CalendarCheck, UserCheck,
  XCircle, Gift, Mail, AlertTriangle, Clock, ArrowRight,
  CheckCircle2, Star, Award, FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInboxEmails, getGmailSyncStatus } from "@/actions/gmail-sync";
import { formatDistanceToNow } from "date-fns";

interface ActionEmail {
  id: string;
  subject: string | null;
  sender: string | null;
  senderEmail: string | null;
  category: string | null;
  urgency: number | null;
  importance: number | null;
  action: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  jobRelated: boolean;
}

interface UrgencyGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  dotColor: string;
  emails: ActionEmail[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  JOB_OPPORTUNITY: <Briefcase className="h-3 w-3" />,
  APPLICATION_CONFIRMATION: <CheckCircle2 className="h-3 w-3" />,
  APPLICATION_UPDATE: <FileCheck className="h-3 w-3" />,
  RECRUITER_CONTACT: <UserCheck className="h-3 w-3" />,
  INTERVIEW_INVITATION: <CalendarCheck className="h-3 w-3" />,
  INTERVIEW_REMINDER: <Clock className="h-3 w-3" />,
  REJECTION: <XCircle className="h-3 w-3" />,
  OFFER: <Gift className="h-3 w-3" />,
  ASSESSMENT: <Award className="h-3 w-3" />,
  CAREER_EVENT: <Star className="h-3 w-3" />,
};

function getCategoryIcon(category: string | null) {
  if (!category) return <Mail className="h-3 w-3" />;
  return CATEGORY_ICONS[category] ?? <Mail className="h-3 w-3" />;
}

function getCategoryLabel(category: string | null): string {
  if (!category) return "Other";
  return category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/\bContact\b/, "").trim();
}

export function EmailActionCenter() {
  const [emails, setEmails] = useState<ActionEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statusRes, emailsRes] = await Promise.all([
      getGmailSyncStatus(),
      getInboxEmails({ jobRelatedOnly: false, pageSize: 50 }),
    ]);

    if (statusRes.success && statusRes.data) {
      setConnected(statusRes.data.connected);
    }

    if (emailsRes.success && emailsRes.data) {
      setEmails(emailsRes.data.emails as ActionEmail[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group emails by urgency tier
  const groups: UrgencyGroup[] = [
    {
      key: "urgent",
      label: "Urgent",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      dotColor: "bg-red-500",
      emails: emails.filter(e => (e.urgency ?? 0) > 0.7),
    },
    {
      key: "important",
      label: "Important",
      icon: <Star className="h-4 w-4 text-orange-500" />,
      dotColor: "bg-orange-400",
      emails: emails.filter(e => (e.urgency ?? 0) > 0.4 && (e.urgency ?? 0) <= 0.7),
    },
    {
      key: "opportunities",
      label: "Opportunities",
      icon: <Briefcase className="h-4 w-4 text-yellow-500" />,
      dotColor: "bg-yellow-400",
      emails: emails.filter(e => (e.urgency ?? 0) <= 0.4 && (e.importance ?? 0) > 0.5),
    },
    {
      key: "updates",
      label: "Updates",
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      dotColor: "bg-green-400",
      emails: emails.filter(e => (e.urgency ?? 0) <= 0.4 && (e.importance ?? 0) > 0.2 && (e.importance ?? 0) <= 0.5),
    },
    {
      key: "other",
      label: "Other",
      icon: <Mail className="h-4 w-4 text-blue-400" />,
      dotColor: "bg-blue-300",
      emails: emails.filter(e => (e.urgency ?? 0) <= 0.4 && (e.importance ?? 0) <= 0.2),
    },
  ];

  const nonEmptyGroups = groups.filter(g => g.emails.length > 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Action Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-muted rounded" />
                  <div className="h-2 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!connected || emails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Action Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-2">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {!connected
                ? "Connect Gmail and sync your inbox to see career activity here."
                : "No actionable items yet. Sync your inbox to discover career opportunities."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Action Center
          <Badge variant="outline" className="ml-auto text-[10px]">
            {emails.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nonEmptyGroups.map((group, gi) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              {group.icon}
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
              <Badge variant="outline" className="text-[9px] ml-1 py-0">
                {group.emails.length}
              </Badge>
            </div>

            <div className="space-y-1.5">
              {group.emails.slice(0, 5).map((email, i) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: gi * 0.05 + i * 0.02, duration: 0.2 }}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className={`block h-2 w-2 rounded-full shrink-0 ${group.dotColor}`} />

                  <span className="text-muted-foreground shrink-0">
                    {getCategoryIcon(email.category)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {email.subject || "(No Subject)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {email.sender || "Unknown"}
                      {email.receivedAt && (
                        <span className="ml-1 opacity-60">
                          · {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                        </span>
                      )}
                    </p>
                  </div>

                  {email.action && (
                    <span className="hidden group-hover:inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0 whitespace-nowrap">
                      <ArrowRight className="h-2.5 w-2.5" /> {email.action}
                    </span>
                  )}
                </motion.div>
              ))}
              {group.emails.length > 5 && (
                <p className="text-[10px] text-muted-foreground pl-6">
                  +{group.emails.length - 5} more
                </p>
              )}
            </div>
          </div>
        ))}

        {nonEmptyGroups.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">All caught up! No pending actions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
