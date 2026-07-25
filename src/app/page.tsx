import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Briefcase, Users, ArrowRight, Sparkles, Zap, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-6 w-6 text-primary" />
            <span>HireFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/sign-up"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" /> AI-Powered Recruitment
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            The Future of <span className="text-primary">Hiring</span> is Here
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you&apos;re hunting for your dream job or building your dream team, HireFlow uses AI to automate the tedious parts of recruitment.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up"><Button size="lg" className="gap-2">Start for Free <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Briefcase className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Job Seekers</h3>
              <p className="text-muted-foreground mb-4">Track applications with a Kanban board, auto-import from Gmail with AI classification, and get smart reminders.</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> AI email scanning auto-detects job-related messages</li>
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> Drag-and-drop Kanban board with 6 columns</li>
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> Smart reminders and follow-up tracking</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Employers</h3>
              <p className="text-muted-foreground mb-4">AI-powered candidate pipeline that scans applications, drafts replies, and manages your hiring workflow.</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> Auto-extract applicant data from emails</li>
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> AI-drafted personalized reply templates</li>
                <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> Candidate pipeline with rating and tags</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            {[
              { icon: <Sparkles className="h-6 w-6 text-primary" />, title: "AI-Powered", desc: "Groq LLM classifies emails, extracts data, and drafts replies" },
              { icon: <Shield className="h-6 w-6 text-primary" />, title: "Secure", desc: "Clerk authentication with role-based access control" },
              { icon: <BarChart3 className="h-6 w-6 text-primary" />, title: "Analytics", desc: "Insights, response rates, and hiring funnel metrics" },
            ].map((f, i) => (
              <div key={i} className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, Clerk, Prisma, Groq AI, and shadcn/ui</p>
      </footer>
    </div>
  );
}
