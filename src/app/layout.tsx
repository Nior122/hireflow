import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { assertEnv, getEnvStatusHtml } from "@/lib/validate-env";

export const metadata: Metadata = {
  title: {
    default: "HireFlow - AI-Powered Job Tracker & Recruitment Platform",
    template: "%s | HireFlow",
  },
  description:
    "Track job applications, optimize resumes with AI, practice interviews, and manage hiring pipelines. The complete recruitment platform for job seekers and employers.",
  keywords: [
    "job tracker",
    "job application tracker",
    "resume builder",
    "AI career assistant",
    "recruitment platform",
    "ATS software",
    "hiring platform",
    "job search",
    "interview prep",
    "career management",
  ],
  authors: [{ name: "HireFlow" }],
  creator: "HireFlow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hireflow.com",
    siteName: "HireFlow",
    title: "HireFlow - AI-Powered Job Tracker & Recruitment Platform",
    description:
      "Track job applications, optimize resumes with AI, practice interviews, and manage hiring pipelines.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HireFlow - AI-Powered Recruitment Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HireFlow - AI-Powered Job Tracker",
    description:
      "Track job applications, optimize resumes with AI, practice interviews, and manage hiring pipelines.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://hireflow.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Validate environment variables at startup
  if (typeof process !== "undefined") {
    assertEnv();
  }

  const envBanner = process.env.NODE_ENV !== "production" ? getEnvStatusHtml() : "";

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="min-h-full flex flex-col">
        {envBanner && (
          <div dangerouslySetInnerHTML={{ __html: envBanner }} />
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
