'use client';

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft, Building2, Briefcase, Mail, FileText, MessageSquare,
  Brain, Calendar, Clock, MapPin, ExternalLink, Sparkles, Target,
  CheckCircle2, AlertCircle, TrendingUp, ChevronRight, Plus, Star,
  BarChart3, BookOpen, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS, STATUS_COLORS, type ApplicationStatus } from "@/lib/types";
import { createResume } from "@/actions/resume-studio";
import { createInterview } from "@/actions/interviews";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────

interface JobData {
  id: string;
  company: string;
  role: string;
  status: string;
  link?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  contactName?: string | null;
  contactEmail?: string | null;
  resumes: ResumeData[];
  interviews: InterviewData[];
  practices: PracticeData[];
  activities: { id: string; action: string; detail: string | null; createdAt: string }[];
}

interface ResumeData {
  id: string;
  name: string;
  title: string;
  atsScore: number;
  updatedAt: string;
  sections: { id: string; type: string; title: string }[];
}

interface InterviewData {
  id: string;
  company: string;
  position: string;
  interviewType: string;
  interviewRound: number;
  scheduledAt: string | null;
  status: string;
  interviewerName?: string | null;
  meetingLink?: string | null;
}

interface PracticeData {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  score: number | null;
  createdAt: string;
}

interface EmailData {
  id: string;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  category: string | null;
  receivedAt: string | null;
  jobRelated: boolean;
  interviewRelated: boolean;
}

interface CareerProfileData {
  id: string;
  summary: string | null;
  skills: string[];
  technicalSkills: string[];
  softSkills: string[];
  experience: unknown;
  education: unknown;
  preferredRoles: string[];
  preferredLocations: string[];
  strengths: string[];
  weaknesses: string[];
}

type Tab = "overview" | "resume" | "interview" | "emails" | "intelligence";

interface JobWorkspaceProps {
  job: JobData;
  emails: EmailData[];
  careerProfile: CareerProfileData | null;
}

// ─── Component ──────────────────────────────────────────────────

export function JobWorkspace({ job, emails, careerProfile }: JobWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Target className="h-4 w-4" /> },
    { id: "intelligence", label: "Intelligence", icon: <Brain className="h-4 w-4" /> },
    { id: "resume", label: "Resume", icon: <FileText className="h-4 w-4" />, count: job.resumes.length },
    { id: "interview", label: "Interview", icon: <MessageSquare className="h-4 w-4" />, count: job.interviews.length },
    { id: "emails", label: "Emails", icon: <Mail className="h-4 w-4" />, count: emails.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-muted transition-colors mt-1 shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{job.role}</h1>
              <Badge variant="secondary" className={`${STATUS_COLORS[job.status as ApplicationStatus]}`}>
                {STATUS_LABELS[job.status as ApplicationStatus] || job.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
              {job.source && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.source}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Added {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.link && (
            <Button render={<a href={job.link} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Job Listing</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <OverviewTab job={job} emails={emails} careerProfile={careerProfile} onTabChange={setActiveTab} />
          )}
          {activeTab === "intelligence" && (
            <IntelligenceTab job={job} careerProfile={careerProfile} />
          )}
          {activeTab === "resume" && (
            <ResumeTab job={job} isPending={isPending} startTransition={startTransition} router={router} />
          )}
          {activeTab === "interview" && (
            <InterviewTab job={job} isPending={isPending} startTransition={startTransition} router={router} />
          )}
          {activeTab === "emails" && (
            <EmailsTab emails={emails} company={job.company} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────

function OverviewTab({ job, emails, careerProfile, onTabChange }: {
  job: JobData; emails: EmailData[]; careerProfile: CareerProfileData | null;
  onTabChange: (tab: Tab) => void;
}) {
  const interviewEmails = emails.filter(e => e.interviewRelated);
  const upcomingInterviews = job.interviews.filter(i => i.status === "SCHEDULED" && i.scheduledAt);
  const avgScore = job.practices.length > 0
    ? Math.round(job.practices.filter(p => p.score != null).reduce((a, p) => a + (p.score ?? 0), 0) / (job.practices.filter(p => p.score != null).length || 1))
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FileText className="h-4 w-4 text-blue-500" />} label="Resumes" value={String(job.resumes.length)} />
          <StatCard icon={<Calendar className="h-4 w-4 text-green-500" />} label="Interviews" value={String(job.interviews.length)} />
          <StatCard icon={<BookOpen className="h-4 w-4 text-purple-500" />} label="Practices" value={String(job.practices.length)} />
          <StatCard icon={<Mail className="h-4 w-4 text-orange-500" />} label="Emails" value={String(emails.length)} />
        </div>

        {/* Upcoming Interviews */}
        {upcomingInterviews.length > 0 && (
          <Card className="border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                <Calendar className="h-4 w-4" />Upcoming Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingInterviews.map(interview => (
                <div key={interview.id} className="flex items-center justify-between p-3 bg-background/80 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{interview.interviewType.replace(/_/g, " ")} — Round {interview.interviewRound}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {interview.scheduledAt && format(new Date(interview.scheduledAt), "PPP 'at' p")}
                      {interview.interviewerName && ` with ${interview.interviewerName}`}
                    </p>
                  </div>
                  {interview.meetingLink && (
                    <Button render={<a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">Join</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {job.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Application Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />Application Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-l border-muted ml-3 space-y-6">
              {[...job.activities.map(a => ({ id: a.id, title: a.action, desc: a.detail, date: a.createdAt, type: 'activity' })),
                ...emails.map(e => ({ id: e.id, title: e.subject || 'Email', desc: e.sender, date: e.receivedAt || new Date().toISOString(), type: 'email' })),
                ...job.interviews.map(i => ({ id: i.id, title: i.interviewType.replace(/_/g, " ") + " Interview", desc: i.status, date: i.scheduledAt || new Date().toISOString(), type: 'interview' }))
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
               .slice(0, 10).map((event) => (
                <div key={event.id} className="relative pl-6">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">{event.desc}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
              {job.activities.length === 0 && emails.length === 0 && job.interviews.length === 0 && (
                <p className="text-sm text-muted-foreground pl-4">No timeline events yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Emails */}
        {emails.length > 0 && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />Recent Related Emails
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onTabChange("emails")} className="text-xs">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {emails.slice(0, 5).map(email => (
                <div key={email.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{email.subject || "(no subject)"}</p>
                    <p className="text-xs text-muted-foreground truncate">{email.sender || "Unknown sender"}</p>
                  </div>
                  {email.category && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{email.category}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Contact Info */}
        {(job.contactName || job.contactEmail) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.contactName && <p className="text-sm">{job.contactName}</p>}
              {job.contactEmail && (
                <a href={`mailto:${job.contactEmail}`} className="text-sm text-primary hover:underline">{job.contactEmail}</a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Profile Match Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />AI Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {careerProfile ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Your profile is connected. View the Intelligence tab for AI-powered analysis.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onTabChange("intelligence")}>
                  <Brain className="h-3.5 w-3.5 mr-1.5" />View Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Complete your Career Profile to unlock AI-powered job matching and tailored resume generation.</p>
                <Button render={<Link href="/dashboard/settings" />} variant="outline" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Setup Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => onTabChange("resume")}>
              <FileText className="h-3.5 w-3.5 mr-2" />Create Tailored Resume
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => onTabChange("interview")}>
              <MessageSquare className="h-3.5 w-3.5 mr-2" />Prepare for Interview
            </Button>
            <Button render={<Link href="/dashboard/copilot" />} variant="outline" size="sm" className="w-full justify-start">
              <Brain className="h-3.5 w-3.5 mr-2" />Ask Copilot About This Job
            </Button>
          </CardContent>
        </Card>

        {/* Practice Score */}
        {avgScore !== null && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />Practice Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-primary">{avgScore}%</div>
                <div className="text-xs text-muted-foreground">
                  Average across {job.practices.length} practice session{job.practices.length !== 1 ? "s" : ""}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Intelligence Tab ───────────────────────────────────────────

function IntelligenceTab({ job, careerProfile }: { job: JobData; careerProfile: CareerProfileData | null }) {
  if (!careerProfile) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Career Profile Required</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Complete your Career Profile in Settings to unlock AI-powered job intelligence, skill gap analysis, and tailored recommendations.
          </p>
          <Button render={<Link href="/dashboard/settings" />}>Setup Career Profile</Button>
        </CardContent>
      </Card>
    );
  }

  const skills = careerProfile.skills || [];
  const jobNotes = job.notes || "";

  // Simple keyword matching for skill gaps (real AI analysis would use Groq)
  const matchedSkills = skills.filter(skill =>
    jobNotes.toLowerCase().includes(skill.toLowerCase()) ||
    job.role.toLowerCase().includes(skill.toLowerCase())
  );

  const matchPercentage = skills.length > 0
    ? Math.round((matchedSkills.length / skills.length) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Match Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />Profile Match
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${matchPercentage >= 70 ? "text-green-500" : matchPercentage >= 40 ? "text-amber-500" : "text-red-500"}`}>
              {matchPercentage}%
            </div>
            <div>
              <p className="text-sm font-medium">
                {matchPercentage >= 70 ? "Strong Match" : matchPercentage >= 40 ? "Moderate Match" : "Needs Improvement"}
              </p>
              <p className="text-xs text-muted-foreground">
                {matchedSkills.length} of {skills.length} skills aligned
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${matchPercentage >= 70 ? "bg-green-500" : matchPercentage >= 40 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />Skills Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matchedSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />Matching Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map(skill => (
                  <Badge key={skill} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {skills.filter(s => !matchedSkills.includes(s)).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />Other Profile Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.filter(s => !matchedSkills.includes(s)).map(skill => (
                  <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RecommendationCard
              icon={<FileText className="h-5 w-5 text-blue-500" />}
              title="Tailored Resume"
              description={`Create a resume highlighting ${matchedSkills.length > 0 ? matchedSkills.slice(0, 3).join(", ") : "relevant skills"} for this role.`}
            />
            <RecommendationCard
              icon={<MessageSquare className="h-5 w-5 text-green-500" />}
              title="Mock Interview"
              description={`Practice ${job.role}-specific questions to strengthen your interview performance.`}
            />
            <RecommendationCard
              icon={<Mail className="h-5 w-5 text-orange-500" />}
              title="Follow Up"
              description={job.contactEmail ? `Consider following up with ${job.contactName || job.contactEmail}.` : "Add a contact to track your follow-ups."}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Resume Tab ─────────────────────────────────────────────────

function ResumeTab({ job, isPending, startTransition, router }: {
  job: JobData; isPending: boolean; startTransition: (fn: () => void) => void; router: ReturnType<typeof useRouter>;
}) {
  async function handleCreateTailoredResume() {
    startTransition(async () => {
      const result = await createResume({
        name: `${job.role} at ${job.company}`,
        jobApplicationId: job.id,
      });
      if (result.success && result.data) {
        router.push("/dashboard/resume");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Resumes for {job.company}</h2>
          <p className="text-sm text-muted-foreground">Tailored resumes linked to this job application</p>
        </div>
        <Button onClick={handleCreateTailoredResume} disabled={isPending} className="gap-2">
          <Plus className="h-4 w-4" />{isPending ? "Creating..." : "Create Tailored Resume"}
        </Button>
      </div>

      {job.resumes.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tailored Resume Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Create a resume specifically tailored for the {job.role} role at {job.company}. HireFlow will use your Career Profile and the job details to generate a targeted resume.
            </p>
            <Button onClick={handleCreateTailoredResume} disabled={isPending}>
              <Sparkles className="h-4 w-4 mr-2" />Create Tailored Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {job.resumes.map(resume => (
            <Card key={resume.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{resume.name}</h3>
                    {resume.title && <p className="text-xs text-muted-foreground mt-0.5">{resume.title}</p>}
                  </div>
                  {resume.atsScore > 0 && (
                    <Badge variant="secondary" className={`text-xs ${resume.atsScore >= 80 ? "bg-green-100 text-green-700" : resume.atsScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      ATS: {resume.atsScore}%
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{resume.sections.length} sections</span>
                  <span>•</span>
                  <span>Updated {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}</span>
                </div>
                <Button render={<Link href="/dashboard/resume" />} variant="outline" size="sm" className="w-full">Open in Resume Studio</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Interview Tab ──────────────────────────────────────────────

function InterviewTab({ job, isPending, startTransition, router }: {
  job: JobData; isPending: boolean; startTransition: (fn: () => void) => void; router: ReturnType<typeof useRouter>;
}) {
  async function handleScheduleInterview() {
    startTransition(async () => {
      await createInterview({
        company: job.company,
        position: job.role,
        applicationId: job.id,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Interviews for {job.company}</h2>
          <p className="text-sm text-muted-foreground">Track interviews and practice sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/dashboard/interviews" />} variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-1.5" />Full Interview Center
          </Button>
          <Button onClick={handleScheduleInterview} disabled={isPending} className="gap-2">
            <Plus className="h-4 w-4" />{isPending ? "Creating..." : "Schedule Interview"}
          </Button>
        </div>
      </div>

      {job.interviews.length === 0 && job.practices.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Interviews Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Schedule interviews and practice with job-specific mock interview questions for {job.role} at {job.company}.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleScheduleInterview} disabled={isPending}>
                <Calendar className="h-4 w-4 mr-2" />Schedule Interview
              </Button>
              <Button render={<Link href="/dashboard/interviews" />} variant="outline">
                <Brain className="h-4 w-4 mr-2" />Start Mock Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Interviews */}
          {job.interviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Scheduled & Completed</h3>
              {job.interviews.map(interview => (
                <Card key={interview.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${interview.status === "SCHEDULED" ? "bg-blue-100 dark:bg-blue-900/30" : interview.status === "COMPLETED" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                        <Calendar className={`h-4 w-4 ${interview.status === "SCHEDULED" ? "text-blue-600" : interview.status === "COMPLETED" ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{interview.interviewType.replace(/_/g, " ")} — Round {interview.interviewRound}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {interview.scheduledAt && <span>{format(new Date(interview.scheduledAt), "PPP 'at' p")}</span>}
                          {interview.interviewerName && <span>• with {interview.interviewerName}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{interview.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Practice Sessions */}
          {job.practices.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Practice Sessions</h3>
              {job.practices.slice(0, 10).map(practice => (
                <Card key={practice.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-md">{practice.question}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{practice.category}</span>
                          <span>•</span>
                          <span>{practice.difficulty}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(practice.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    {practice.score != null && (
                      <Badge variant="secondary" className={`text-xs ${practice.score >= 80 ? "bg-green-100 text-green-700" : practice.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {practice.score}%
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Emails Tab ─────────────────────────────────────────────────

function EmailsTab({ emails, company }: { emails: EmailData[]; company: string }) {
  const categoryColors: Record<string, string> = {
    JOB_OPPORTUNITY: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    INTERVIEWS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    APPLICATIONS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    RECRUITERS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    REJECTIONS: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    OFFERS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    NETWORKING: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    CAREER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    IMPORTANT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email Timeline — {company}</h2>
        <p className="text-sm text-muted-foreground">All emails related to this company from your connected Gmail</p>
      </div>

      {emails.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Related Emails Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No emails matching &quot;{company}&quot; were found. Sync your Gmail inbox to discover job-related correspondence.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {emails.map((email, idx) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative flex items-start gap-4 pl-12"
              >
                {/* Timeline dot */}
                <div className={`absolute left-4 top-3 w-4 h-4 rounded-full border-2 border-background ${
                  email.interviewRelated ? "bg-green-500" : email.jobRelated ? "bg-blue-500" : "bg-muted-foreground/30"
                }`} />

                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{email.subject || "(no subject)"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{email.sender || "Unknown sender"}</p>
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{email.snippet}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {email.receivedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(email.receivedAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {email.category && (
                          <Badge variant="secondary" className={`text-[10px] ${categoryColors[email.category] || ""}`}>
                            {email.category.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


