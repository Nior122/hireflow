import type { DetectedJob } from "../../shared/types";

export interface SiteDetector {
  id: string;
  name: string;
  patterns: RegExp[];
  detect: () => DetectedJob | null;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function getText(selector: string): string | null {
  const el = document.querySelector(selector);
  return el?.textContent?.trim() ?? null;
}

function getAttr(selector: string, attr: string): string | null {
  const el = document.querySelector(selector);
  return el?.getAttribute(attr)?.trim() ?? null;
}

function getVisibleText(selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim()) return el.textContent.trim();
  }
  return null;
}

export const detectors: SiteDetector[] = [
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    patterns: [/linkedin\.com\/jobs\/view/i],
    detect() {
      try {
        const title = getText("h1.job-details-jobs-unified-top-card__job-title, h1.t-bold, .job-details-jobs-unified-top-card__job-title") ?? document.title.split(" - ")[0].trim();
        const company = getText(".job-details-jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description-container a, .app-aware-link.job-details-jobs-unified-top-card__company-name") ?? "";
        const location = getText(".job-details-jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description-container .tvm__text") ?? null;
        const salaryText = getVisibleText([".salary", ".job-details-jobs-unified-top-card__salary", "[class*='salary']"]);
        const salaryMin = salaryText ? parseInt(salaryText.replace(/[^0-9]/g, "")) || null : null;
        const descriptionEl = document.querySelector(".jobs-description__content, .show-more-less-html__markup, #job-details");
        const description = descriptionEl ? stripHtml(descriptionEl.innerHTML.slice(0, 5000)) : "";
        const posted = getText(".job-details-jobs-unified-top-card__posted-date") ?? null;
        const applyBtn = document.querySelector("a.apply-button, .jobs-apply-button, button[aria-label*='Apply']");
        const applyUrl = applyBtn instanceof HTMLAnchorElement ? applyBtn.href : window.location.href;
        const logoEl = document.querySelector("img.artdeco-entity-image, .job-details-jobs-unified-top-card__company-logo img");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: applyUrl, companyLogo: logo, postedAt: posted, source: "LinkedIn",
          confidence: title && company ? 90 : 50,
        };
      } catch { return null; }
    },
  },
  {
    id: "indeed",
    name: "Indeed",
    patterns: [/indeed\.com\/viewjob/i, /indeed\.com\/job\//i],
    detect() {
      try {
        const title = getText("h1.jobsearch-JobInfoHeader-title, h1.jobtitle, [data-testid='jobTitle']") ?? document.title.split(" - ")[0].trim();
        const company = getText("[data-testid='company-name'] span, .company_name a, .jobsearch-CompanyInfo strong, [data-testid='companyName']") ?? "";
        const location = getText("[data-testid='text-location'] span, .companyLocation, [data-testid='jobLocation']") ?? null;
        const descEl = document.querySelector("#jobDescriptionText, .jobsearch-jobDescriptionText, [id*='Description']");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";
        const logoEl = document.querySelector("[data-testid='company-logo'] img, .jobsearch-CompanyAvatar-image");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: logo, postedAt: null, source: "Indeed",
          confidence: title && company ? 90 : 50,
        };
      } catch { return null; }
    },
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    patterns: [/glassdoor\.com\/job-listing/i, /glassdoor\.com\/Job\//i],
    detect() {
      try {
        const title = getText("h1[data-test='job-title'], .job-title-font-size") ?? document.title.split(" - ")[0].trim();
        const company = getText("[data-test='employer-short-name'], .strong-700") ?? "";
        const location = getText("[data-test='emp-location'], .d-flex.flex-column") ?? null;
        const descEl = document.querySelector("#JobDescriptionContainer, [data-test='JobDescriptionContainer']");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: null, postedAt: null, source: "Glassdoor",
          confidence: title && company ? 85 : 45,
        };
      } catch { return null; }
    },
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    patterns: [/boards\.greenhouse\.io/i],
    detect() {
      try {
        const title = getText("h1[data-field='name'], h1.section-intro__title, #content h1") ?? document.title.split(" at ")[0].trim();
        const company = getText("a[data-field='company_link'], .company-name, header h2, #header h2") ?? window.location.pathname.split("/")[1] ?? "";
        const location = getText("[data-field='location'], .location, .section-intro__meta span:first-child") ?? null;
        const descEl = document.querySelector("[data-field='content'], #content .section, .content, .body");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";
        const logoEl = document.querySelector("img[data-field='company_image'], .company-logo img, header img");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: logo, postedAt: null, source: "Greenhouse",
          confidence: title && company ? 85 : 50,
        };
      } catch { return null; }
    },
  },
  {
    id: "lever",
    name: "Lever",
    patterns: [/jobs\.lever\.co/i],
    detect() {
      try {
        const title = getText(".posting-headline h2, .posting-name h2, h2.posting-name") ?? document.title.split(" at ")[0].trim();
        const company = getText(".posting-headline h4, .posting-company, .posting-apply h4 a") ?? window.location.pathname.split("/")[1] ?? "";
        const location = getText(".posting-categories .category, .location, .posting-meta .sort-time") ?? null;
        const descEl = document.querySelector(".posting-page .content, .section-wrapper, .posting-content");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";
        const logoEl = document.querySelector(".posting-logo, img.posting-logo");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: logo, postedAt: null, source: "Lever",
          confidence: title && company ? 85 : 50,
        };
      } catch { return null; }
    },
  },
  {
    id: "ashby",
    name: "Ashby",
    patterns: [/jobs\.ashbyhq\.com/i],
    detect() {
      try {
        const title = getText("h1, [class*='job-title'], [class*='position']") ?? document.title.split(" at ")[0].trim();
        const company = getText("[class*='company'], [class*='org']") ?? window.location.pathname.split("/")[1]?.replace(/-/g, " ") ?? "";
        const location = getText("[class*='location'], [class*='region']") ?? null;
        const descEl = document.querySelector("[class*='description'], .content, main");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: null, postedAt: null, source: "Ashby",
          confidence: title && company ? 80 : 40,
        };
      } catch { return null; }
    },
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    patterns: [/wellfound\.com\/role/i],
    detect() {
      try {
        const title = getText("h1[data-test='JobTitle'], h1") ?? document.title.split(" - ")[0].trim();
        const company = getText("[data-test='CompanyName'], .styles_companyName__D982y a, .styles_abbreviation__2LZ5J") ?? "";
        const location = getText("[data-test='JobLocation'], [class*='Location']") ?? null;
        const descEl = document.querySelector("[data-test='RoleDescription'], .styles_description__mQix0, .content");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";

        return {
          title, company, location, remote: (location ?? "").toLowerCase().includes("remote"),
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: null, postedAt: null, source: "Wellfound",
          confidence: title && company ? 85 : 45,
        };
      } catch { return null; }
    },
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    patterns: [/remoteok\.com\/remote-jobs/i, /remoteok\.com\/job\//i],
    detect() {
      try {
        const title = getText("h1[data-testid='job-title'], .job-title, h1") ?? document.title.split(" | ")[0].trim();
        const company = getText(".company-name, .company, h3") ?? "";
        const location = "Remote";
        const salaryText = getVisibleText(["[data-testid='salary']", ".salary", "[class*='salary']"]);
        const salaryMin = salaryText ? parseInt(salaryText.replace(/[^0-9]/g, "")) || null : null;
        const descEl = document.querySelector(".job-description, [class*='description'], .content");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";
        const logoEl = document.querySelector("img.company-logo, img[alt*='logo']");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location: "Remote", remote: true,
          employmentType: null, salaryMin, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: logo, postedAt: null, source: "RemoteOK",
          confidence: title && company ? 85 : 45,
        };
      } catch { return null; }
    },
  },
  {
    id: "remotive",
    name: "Remotive",
    patterns: [/remotive\.com\/remote-jobs/i, /remotive\.com\/job\//i],
    detect() {
      try {
        const title = getText("h1, .job-title, [class*='title']") ?? document.title.split(" - ")[0].trim();
        const company = getText(".company-name, [class*='company'] a, h2 a") ?? "";
        const location = "Remote";
        const descEl = document.querySelector(".job-description, [class*='description'], .content");
        const description = descEl ? stripHtml(descEl.innerHTML.slice(0, 5000)) : "";
        const logoEl = document.querySelector("img.company-logo, img[alt*='logo']");
        const logo = logoEl?.getAttribute("src") ?? null;

        return {
          title, company, location: "Remote", remote: true,
          employmentType: null, salaryMin: null, salaryMax: null,
          description: description.slice(0, 3000), requirements: null, skills: [],
          applicationUrl: window.location.href, companyLogo: logo, postedAt: null, source: "Remotive",
          confidence: title && company ? 85 : 45,
        };
      } catch { return null; }
    },
  },
];

export function detectCurrentSite(): DetectedJob | null {
  const url = window.location.href;
  for (const detector of detectors) {
    if (detector.patterns.some(p => p.test(url))) {
      try {
        return detector.detect();
      } catch { continue; }
    }
  }
  return null;
}
