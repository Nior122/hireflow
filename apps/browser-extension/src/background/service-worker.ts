import { saveJob, analyzeMatch, generateCoverLetter, checkDuplicate, getAuth, syncOfflineQueue } from "../shared/api";
import type { DetectedJob } from "../shared/types";

// ─── Message Handler ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handle = async () => {
    const auth = await getAuth();
    if (!auth.authenticated && msg.action !== "CHECK_AUTH") {
      return sendResponse({ success: false, error: "Not authenticated. Please sign in to HireFlow." });
    }

    switch (msg.action) {
      case "SAVE_JOB": {
        const job = msg.data as DetectedJob;
        const dup = await checkDuplicate(job.applicationUrl, job.company, job.title);
        if (dup) return sendResponse({ success: false, error: "Already saved", duplicate: true });

        const result = await saveJob({
          title: job.title, company: job.company, location: job.location,
          remoteType: job.remote ? "remote" : null, salaryMin: job.salaryMin,
          salaryMax: job.salaryMax, description: job.description,
          applicationUrl: job.applicationUrl, companyLogo: job.companyLogo,
          source: job.source, skills: job.skills,
        });
        return sendResponse(result);
      }
      case "ANALYZE_MATCH": {
        const result = await analyzeMatch(msg.data.description, msg.data.title);
        return sendResponse(result);
      }
      case "GENERATE_COVER": {
        const result = await generateCoverLetter(msg.data);
        return sendResponse(result);
      }
      case "CHECK_AUTH": {
        return sendResponse({ authenticated: auth.authenticated });
      }
      default:
        return sendResponse({ error: "Unknown action" });
    }
  };

  handle().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
  return true; // Keep message channel open
});

// ─── Context Menu ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "hireflow-save",
    title: "Save to HireFlow",
    contexts: ["page", "link"],
  });

  chrome.contextMenus.create({
    id: "hireflow-open",
    title: "Open HireFlow Dashboard",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "hireflow-save" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "DETECT_AND_SAVE" });
  } else if (info.menuItemId === "hireflow-open") {
    chrome.tabs.create({ url: "https://hireflow.vercel.app/dashboard" });
  }
});

// ─── Periodic Offline Sync ──────────────────────────────────────

chrome.alarms.create("sync-offline", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync-offline") {
    await syncOfflineQueue();
  }
});

// ─── Notifications ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "HireFlow Extension Installed",
      message: "Navigate to a job site to start saving jobs!",
    });
  }
});
