import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOrGetUser } from "@/lib/clerk";
import { getValidGmailToken } from "@/actions/gmail-sync";
import { prisma } from "@/lib/prisma";
import { GroqProvider } from "@/lib/ai/providers";
import { EmailClassificationSchema } from "@/lib/ai";

function safeBase64UrlDecode(str: string): string {
  if (!str) return "";
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractEmailBody(payload: any): string {
  if (!payload) return "";
  let body = "";

  if (payload.body?.data) {
    body += safeBase64UrlDecode(payload.body.data) + "\n";
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.body?.data) {
        body += safeBase64UrlDecode(part.body.data) + "\n";
      }
      if (part.parts) {
        body += extractEmailBody(part) + "\n";
      }
    }
  }

  return body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/<[^>]*>?/gm, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: raw, email: raw };
}

function parseJsonFromLlm(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

function inferCompanyAndRole(
  extractedCompany?: string | null,
  extractedRole?: string | null,
  subject?: string | null,
  senderName?: string | null,
  senderEmail?: string | null
): { company: string; role: string } {
  let company = extractedCompany?.trim() || "";
  let role = extractedRole?.trim() || "";

  const cleanSubject = subject || "";
  const cleanSender = senderName || "";
  const cleanEmail = senderEmail || "";

  if (!company) {
    const atMatch = cleanSubject.match(/(?:at|with|for)\s+([A-Z][A-Za-z0-9\s.&'-]+)/);
    if (atMatch) {
      company = atMatch[1].split(/[-–—|:]/)[0].trim();
    } else {
      const dashMatch = cleanSubject.match(/^([A-Z][A-Za-z0-9\s.&'-]+)\s*[-–—|:]/);
      if (dashMatch && !/thank|application|interview|rejection|status|your|job/i.test(dashMatch[1])) {
        company = dashMatch[1].trim();
      }
    }
  }

  if (!company && cleanSender) {
    const cleanSenderName = cleanSender.replace(/\b(Careers|Recruiting|Talent|HR|Team|Jobs|Notifications|No-Reply|Hiring)\b/gi, "").trim();
    if (cleanSenderName && cleanSenderName.length > 1) {
      company = cleanSenderName;
    }
  }

  if (!company && cleanEmail && cleanEmail.includes("@")) {
    const domain = cleanEmail.split("@")[1]?.toLowerCase();
    const commonMailers = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "greenhouse.io", "lever.co", "workday.com", "ashbyhq.com", "smartrecruiters.com"];
    if (domain && !commonMailers.includes(domain)) {
      const domainName = domain.split(".")[0];
      if (domainName) {
        company = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
  }

  if (!company) {
    company = cleanSender || "Company";
  }

  if (!role && cleanSubject) {
    const roleMatch = cleanSubject.match(/(?:for|role|position|as)\s+([A-Za-z0-9\s/-]+?)(?:\s+at|\s+with|\s*[-–—|:]|$)/i);
    if (roleMatch) {
      role = roleMatch[1].trim();
    }
  }
  if (!role) role = "Software Role";

  return { company, role };
}

function deterministicClassify(text: string): any {
  text = text.toLowerCase();
  let partial: any = { category: "OTHER", confidence: 0.5 };

  if (/interview|schedule|phone screen|video call|coding challenge|assessment|coderpad|hackerrank|availability|meet with/i.test(text)) {
    partial = { category: "INTERVIEWS", confidence: 0.8, interviewRelated: true, jobRelated: true };
  } else if (/unfortunately|not moving forward|not selected|not a fit|other candidates|regret to inform|position has been filled|pursuing other|decision on your/i.test(text)) {
    partial = { category: "REJECTIONS", confidence: 0.85, rejectionRelated: true, jobRelated: true };
  } else if (/pleased to offer|offer letter|compensation package|employment offer|congratulations/i.test(text)) {
    partial = { category: "OFFERS", confidence: 0.9, offerRelated: true, jobRelated: true };
  } else if (/thank you for applying|application received|we received|application update|application status|confirmation|submission|applied/i.test(text)) {
    partial = { category: "APPLICATIONS", confidence: 0.85, applicationRelated: true, jobRelated: true };
  } else if (/job opportunity|open position|hiring|exciting role|we are looking for|position available|join our team|engineer|developer|architect/i.test(text)) {
    partial = { category: "JOB_OPPORTUNITY", confidence: 0.75, jobRelated: true };
  } else if (/recruiter|talent acquisition|sourcing|headhunter|outreach|saw your profile|saw your linkedin/i.test(text)) {
    partial = { category: "RECRUITERS", confidence: 0.75, jobRelated: true };
  } else if (/deadline|action required|important/i.test(text)) {
    partial = { category: "IMPORTANT", confidence: 0.65, jobRelated: true };
  }

  return EmailClassificationSchema.parse(partial);
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await createOrGetUser();
    const accessToken = await getValidGmailToken(user.id);
    if (!accessToken) return NextResponse.json({ error: "No Gmail token" }, { status: 400 });

    const listRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    const messageList: { id: string }[] = listData.messages ?? [];

    let diagnostics = {
      gmailMessagesFetched: messageList.length,
      emailMessagesStored: 0,
      categoryCounts: {} as Record<string, number>,
      applicationsCreated: 0,
      opportunitiesCreated: 0,
      interviewsCreated: 0,
      offersCreated: 0,
      rejectionsDetected: 0,
      recruitersDetected: 0,
      failures: 0,
      messages: [] as any[]
    };

    for (const msg of messageList) {
      try {
        const metaRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!metaRes.ok) continue;

        const meta = await metaRes.json();
        const headers: { name: string; value: string }[] = meta.payload?.headers ?? [];
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value ?? "";

        const subject = getHeader("Subject");
        const fromRaw = getHeader("From");
        const to = getHeader("To");
        const { name: sender, email: senderEmail } = parseEmailAddress(fromRaw);
        const snippet: string = meta.snippet ?? "";

        const bodyText = extractEmailBody(meta.payload);
        const limitedBody = bodyText.slice(0, 1500);

        let classification;
        try {
          const provider = new GroqProvider();
          const response = await provider.chat([{
            role: "user",
            content: `Classify this email. If company or role cannot be determined, return null. Subject: ${subject} From: ${fromRaw} Body: ${limitedBody} Respond ONLY with a JSON object matching schema: {"category": "JOB_OPPORTUNITY|APPLICATIONS|INTERVIEWS|OFFERS|REJECTIONS|RECRUITERS|NETWORKING|CAREER|IMPORTANT|OTHER", "company": "company name or null", "role": "job title or null"}`
          }], { temperature: 0.1, maxTokens: 512 });
          classification = parseJsonFromLlm(response);
          if (!classification.category) classification.category = "OTHER";
        } catch {
          classification = deterministicClassify(`${subject} ${snippet}`);
        }

        const { company: inferredCompany, role: inferredRole } = inferCompanyAndRole(
          classification.company,
          classification.role,
          subject,
          sender,
          senderEmail
        );

        const savedEmail = await prisma.emailMessage.upsert({
          where: { gmailMessageId: msg.id },
          create: {
            userId: user.id,
            gmailMessageId: msg.id,
            sender: sender || null,
            senderEmail: senderEmail || null,
            recipients: to || null,
            subject: subject || null,
            snippet: snippet.slice(0, 500) || null,
            body: limitedBody || null,
            category: classification.category,
          },
          update: {
            category: classification.category,
          }
        });
        diagnostics.emailMessagesStored++;
        diagnostics.categoryCounts[classification.category] = (diagnostics.categoryCounts[classification.category] || 0) + 1;

        let dbStatus = "none";

        if (classification.category === "JOB_OPPORTUNITY") {
          await prisma.discoveredJob.create({
            data: { userId: user.id, sourceEmailId: savedEmail.id, title: inferredRole, company: inferredCompany, status: "NEW" }
          }).catch(() => {});
          diagnostics.opportunitiesCreated++;
          dbStatus = "DiscoveredJob created";
        } else if (classification.category === "APPLICATIONS") {
          await prisma.jobApplication.create({
            data: { userId: user.id, company: inferredCompany, role: inferredRole, status: "APPLIED", sourceEmailId: savedEmail.id }
          }).catch(() => {});
          diagnostics.applicationsCreated++;
          dbStatus = "JobApplication created";
        } else if (classification.category === "INTERVIEWS") {
          const existingApp = await prisma.jobApplication.create({
            data: { userId: user.id, company: inferredCompany, role: inferredRole, status: "INTERVIEW", sourceEmailId: savedEmail.id }
          }).catch(() => null);
          if (existingApp) {
            await prisma.interview.create({
              data: { userId: user.id, company: inferredCompany, position: inferredRole, applicationId: existingApp.id }
            }).catch(() => {});
          }
          diagnostics.interviewsCreated++;
          dbStatus = "Interview created";
        }

        diagnostics.messages.push({
          msgId: msg.id,
          subject: subject,
          sender: senderEmail,
          hasBody: !!limitedBody,
          bodyLength: limitedBody.length,
          category: classification.category,
          extractedCompany: classification.company,
          inferredCompany,
          extractedRole: classification.role,
          inferredRole,
          dbStatus
        });

      } catch (err) {
        diagnostics.failures++;
      }
    }

    return NextResponse.json(diagnostics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
