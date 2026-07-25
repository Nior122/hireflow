import type { AuthState } from "./types";

const API_BASE = "https://hireflow.vercel.app";

export async function getAuth(): Promise<AuthState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["auth"], (result) => {
      resolve(result.auth ?? { authenticated: false, userId: null, token: null });
    });
  });
}

export async function setAuth(auth: AuthState): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set({ auth }, resolve));
}

export async function clearAuth(): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove(["auth"], resolve));
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const auth = await getAuth();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
  });
}

export async function saveJob(job: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch("/api/extension/save-job", { method: "POST", body: JSON.stringify(job) });
    if (!res.ok) return { success: false, error: "Failed to save" };
    return await res.json();
  } catch {
    // Offline: queue it
    await queueAction({ id: crypto.randomUUID(), type: "save_job", data: job, timestamp: Date.now() });
    return { success: true };
  }
}

export async function analyzeMatch(jobDescription: string, jobTitle: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await apiFetch("/api/extension/analyze-match", { method: "POST", body: JSON.stringify({ jobDescription, jobTitle }) });
    return await res.json();
  } catch { return { success: false, error: "Offline" }; }
}

export async function generateCoverLetter(data: { company: string; position: string; jobDescription: string; tone?: string }): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/extension/cover-letter", { method: "POST", body: JSON.stringify(data) });
    return await res.json();
  } catch { return { success: false, error: "Offline" }; }
}

export async function checkDuplicate(url: string, company: string, title: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/extension/check-duplicate?url=${encodeURIComponent(url)}&company=${encodeURIComponent(company)}&title=${encodeURIComponent(title)}`);
    const data = await res.json();
    return data.duplicate ?? false;
  } catch { return false; }
}

// ─── Offline Queue ──────────────────────────────────────────────

async function queueAction(action: { id: string; type: string; data: unknown; timestamp: number }) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["offlineQueue"], (result) => {
      const queue = result.offlineQueue ?? [];
      queue.push(action);
      chrome.storage.local.set({ offlineQueue: queue }, resolve);
    });
  });
}

export async function getOfflineQueue(): Promise<{ id: string; type: string; data: unknown; timestamp: number }[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["offlineQueue"], (result) => resolve(result.offlineQueue ?? []));
  });
}

export async function clearOfflineQueue(): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set({ offlineQueue: [] }, resolve));
}

export async function syncOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const action of queue) {
    try {
      if (action.type === "save_job") {
        const res = await apiFetch("/api/extension/save-job", { method: "POST", body: JSON.stringify(action.data) });
        if (res.ok) synced++;
      }
    } catch {}
  }

  if (synced > 0) await clearOfflineQueue();
  return synced;
}
