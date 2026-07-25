import { detectCurrentSite } from "./detectors";
import type { DetectedJob } from "../shared/types";

let currentJob: DetectedJob | null = null;
let fabContainer: HTMLDivElement | null = null;
let popupContainer: HTMLDivElement | null = null;

function createStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .hf-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .hf-fab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
      transition: all 0.2s ease;
    }
    .hf-fab-btn:hover {
      background: #1d4ed8;
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(37, 99, 235, 0.5);
    }
    .hf-fab-btn svg { width: 18px; height: 18px; }
    .hf-popup {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 380px;
      max-height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      overflow: hidden;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .hf-popup-header {
      padding: 16px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
    }
    .hf-popup-body { padding: 16px; max-height: 360px; overflow-y: auto; }
    .hf-action-btn {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.15s;
      margin-bottom: 8px;
    }
    .hf-action-btn:hover { background: #f3f4f6; border-color: #2563eb; }
    .hf-action-btn.primary { background: #2563eb; color: white; border-color: #2563eb; }
    .hf-action-btn.primary:hover { background: #1d4ed8; }
    .hf-success { color: #059669; font-weight: 600; text-align: center; padding: 20px; }
    .hf-job-info { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
    .hf-job-info strong { color: #1f2937; }
    @media (prefers-color-scheme: dark) {
      .hf-popup { background: #1f2937; }
      .hf-popup-body { color: #e5e7eb; }
      .hf-action-btn { border-color: #374151; background: #111827; color: #e5e7eb; }
      .hf-action-btn:hover { background: #374151; }
    }
  `;
  document.head.appendChild(style);
}

function createFAB() {
  if (fabContainer) return;
  createStyles();

  fabContainer = document.createElement("div");
  fabContainer.className = "hf-fab";
  fabContainer.innerHTML = `
    <button class="hf-fab-btn" id="hf-fab-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      Save to HireFlow
    </button>
  `;
  document.body.appendChild(fabContainer);

  document.getElementById("hf-fab-btn")?.addEventListener("click", togglePopup);
}

function togglePopup() {
  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
    return;
  }

  popupContainer = document.createElement("div");
  popupContainer.className = "hf-popup";

  if (!currentJob) {
    popupContainer.innerHTML = `
      <div class="hf-popup-header">
        <h3 style="font-size:16px;font-weight:700;margin:0">HireFlow</h3>
        <p style="font-size:12px;opacity:0.8;margin:4px 0 0">No job detected on this page</p>
      </div>
      <div class="hf-popup-body" style="text-align:center;padding:32px 16px">
        <p style="color:#6b7280">Navigate to a job posting to auto-detect job details.</p>
      </div>
    `;
    document.body.appendChild(popupContainer);
    return;
  }

  popupContainer.innerHTML = `
    <div class="hf-popup-header">
      <h3 style="font-size:16px;font-weight:700;margin:0">HireFlow</h3>
      <p style="font-size:12px;opacity:0.8;margin:4px 0 0">Job detected with ${currentJob.confidence}% confidence</p>
    </div>
    <div class="hf-popup-body">
      <div class="hf-job-info">
        <strong>${currentJob.title}</strong> at ${currentJob.company}<br>
        ${currentJob.location ? `📍 ${currentJob.location} ` : ""}
        ${currentJob.remote ? "🏠 Remote " : ""}
        ${currentJob.salaryMin ? `💰 $${(currentJob.salaryMin / 1000).toFixed(0)}k ` : ""}
        <br>Source: ${currentJob.source}
      </div>
      <button class="hf-action-btn primary" id="hf-save">📋 Save Job</button>
      <button class="hf-action-btn" id="hf-match">🎯 Analyze Match</button>
      <button class="hf-action-btn" id="hf-cover">📝 Generate Cover Letter</button>
      <button class="hf-action-btn" id="hf-view">🔗 View in HireFlow</button>
      <div id="hf-result" style="margin-top:8px"></div>
    </div>
  `;
  document.body.appendChild(popupContainer);

  document.getElementById("hf-save")?.addEventListener("click", handleSave);
  document.getElementById("hf-match")?.addEventListener("click", handleMatch);
  document.getElementById("hf-cover")?.addEventListener("click", handleCoverLetter);
  document.getElementById("hf-view")?.addEventListener("click", () => {
    window.open("https://hireflow.vercel.app/dashboard/discover", "_blank");
  });
}

async function handleSave() {
  const btn = document.getElementById("hf-save");
  if (!btn || !currentJob) return;
  btn.textContent = "Saving...";
  btn.setAttribute("disabled", "true");

  chrome.runtime.sendMessage({ action: "SAVE_JOB", data: currentJob }, (response) => {
    const resultDiv = document.getElementById("hf-result");
    if (response?.success) {
      resultDiv!.innerHTML = '<div class="hf-success">✅ Job saved successfully!</div>';
      btn.textContent = "✅ Saved";
    } else {
      resultDiv!.innerHTML = `<div style="color:#dc2626;text-align:center;padding:8px;font-size:13px">${response?.error ?? "Failed to save"}</div>`;
      btn.textContent = "📋 Save Job";
      btn.removeAttribute("disabled");
    }
  });
}

async function handleMatch() {
  const btn = document.getElementById("hf-match");
  if (!btn || !currentJob) return;
  btn.textContent = "Analyzing...";

  chrome.runtime.sendMessage({ action: "ANALYZE_MATCH", data: { description: currentJob.description, title: currentJob.title } }, (response) => {
    const resultDiv = document.getElementById("hf-result");
    if (response?.success && response.data) {
      resultDiv!.innerHTML = `
        <div style="padding:12px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
          <p style="font-size:14px;font-weight:700;color:#166534;margin:0 0 8px">Match Score: ${response.data.matchPercentage ?? 0}%</p>
          ${response.data.missingSkills?.length ? `<p style="font-size:12px;margin:4px 0"><strong>Missing Skills:</strong> ${response.data.missingSkills.join(", ")}</p>` : ""}
          ${response.data.improvements?.length ? `<p style="font-size:12px;margin:4px 0"><strong>Tips:</strong> ${response.data.improvements[0]}</p>` : ""}
        </div>
      `;
    }
    btn.textContent = "🎯 Analyze Match";
  });
}

async function handleCoverLetter() {
  const btn = document.getElementById("hf-cover");
  if (!btn || !currentJob) return;
  btn.textContent = "Generating...";

  chrome.runtime.sendMessage({ action: "GENERATE_COVER", data: { company: currentJob.company, position: currentJob.title, jobDescription: currentJob.description } }, (response) => {
    const resultDiv = document.getElementById("hf-result");
    if (response?.success && response.data) {
      resultDiv!.innerHTML = `
        <div style="padding:12px;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd;max-height:200px;overflow-y:auto">
          <p style="font-size:12px;font-weight:700;margin:0 0 8px">📝 Cover Letter</p>
          <p style="font-size:11px;white-space:pre-wrap;color:#334155;margin:0">${response.data}</p>
          <button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)" style="margin-top:8px;padding:6px 12px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer">Copy</button>
        </div>
      `;
    }
    btn.textContent = "📝 Generate Cover Letter";
  });
}

// ─── Init ───────────────────────────────────────────────────────

function init() {
  currentJob = detectCurrentSite();
  if (currentJob) createFAB();
}

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Re-detect on SPA navigation (LinkedIn, etc.)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (popupContainer) { popupContainer.remove(); popupContainer = null; }
    currentJob = detectCurrentSite();
    if (currentJob && !fabContainer) createFAB();
    else if (!currentJob && fabContainer) { fabContainer.remove(); fabContainer = null; }
  }
}).observe(document, { subtree: true, childList: true });

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "SHOW_NOTIFICATION") {
    if (Notification.permission === "granted") {
      new Notification(msg.title ?? "HireFlow", { body: msg.body ?? "", icon: "icons/icon128.png" });
    }
  }
});
