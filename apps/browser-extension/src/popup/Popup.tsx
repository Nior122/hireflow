import { useState, useEffect } from "react";
import { getAuth, clearAuth, saveJob, analyzeMatch, generateCoverLetter, checkDuplicate } from "../shared/api";
import type { DetectedJob } from "../shared/types";

type Tab = "save" | "match" | "cover" | "settings";

export function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [job, setJob] = useState<DetectedJob | null>(null);
  const [tab, setTab] = useState<Tab>("save");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAuth().then(a => setAuthenticated(a.authenticated));
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "DETECT_JOB" }, (response) => {
          if (response?.job) setJob(response.job);
        });
      }
    });
  }, []);

  function handleLogin() {
    chrome.tabs.create({ url: "https://hireflow.vercel.app/sign-in?redirect=extension" });
  }

  function handleLogout() {
    clearAuth().then(() => setAuthenticated(false));
  }

  async function handleSave() {
    if (!job) return;
    setSaving(true);
    const dup = await checkDuplicate(job.applicationUrl, job.company, job.title);
    if (dup) { setSaving(false); return; }
    const result = await saveJob({
      title: job.title, company: job.company, location: job.location,
      remoteType: job.remote ? "remote" : null, salaryMin: job.salaryMin,
      salaryMax: job.salaryMax, description: job.description,
      applicationUrl: job.applicationUrl, companyLogo: job.companyLogo,
      source: job.source, skills: job.skills,
    });
    setSaved(result.success);
    setSaving(false);
  }

  async function handleMatch() {
    if (!job) return;
    setLoading(true);
    const result = await analyzeMatch(job.description, job.title);
    setMatchResult(result.data);
    setLoading(false);
  }

  async function handleCover() {
    if (!job) return;
    setLoading(true);
    const result = await generateCoverLetter({ company: job.company, position: job.title, jobDescription: job.description });
    setCoverLetter(result.data ?? null);
    setLoading(false);
  }

  if (authenticated === null) {
    return <div style={{ padding: 32, textAlign: "center" }}><p>Loading...</p></div>;
  }

  if (!authenticated) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💼</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>HireFlow</h2>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>Sign in to save jobs from any website</p>
        <button onClick={handleLogin} style={{ padding: "10px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>Sign In</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>HireFlow</h1>
            <p style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              {job ? `${job.title} at ${job.company}` : "No job detected"}
            </p>
          </div>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
        {(["save", "match", "cover"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 0", border: "none", background: "transparent",
            fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#2563eb" : "#6b7280",
            borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
            cursor: "pointer", textTransform: "capitalize",
          }}>{t === "save" ? "Save" : t === "match" ? "Match" : "Cover Letter"}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {tab === "save" && (
          <div>
            {job ? (
              <>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                  <strong style={{ color: "#1f2937" }}>{job.title}</strong><br />
                  {job.company} · {job.location ?? "N/A"} · {job.source}
                </div>
                {!saved ? (
                  <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "Saving..." : "Save Job to HireFlow"}
                  </button>
                ) : (
                  <div style={{ textAlign: "center", padding: 16, color: "#059669", fontWeight: 600 }}>✅ Job saved successfully!</div>
                )}
              </>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280", padding: 24 }}>Navigate to a supported job site to detect job details.</p>
            )}
          </div>
        )}

        {tab === "match" && (
          <div>
            {!matchResult ? (
              <button onClick={handleMatch} disabled={loading || !job} style={{ width: "100%", padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {loading ? "Analyzing..." : "Analyze Resume Match"}
              </button>
            ) : (
              <div>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: matchResult.matchPercentage >= 70 ? "#059669" : matchResult.matchPercentage >= 40 ? "#d97706" : "#dc2626" }}>{matchResult.matchPercentage}%</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>Match Score</p>
                </div>
                {matchResult.missingSkills?.length > 0 && <p style={{ fontSize: 11, marginBottom: 4 }}><strong>Missing:</strong> {matchResult.missingSkills.join(", ")}</p>}
                {matchResult.improvements?.length > 0 && <p style={{ fontSize: 11 }}><strong>Tips:</strong> {matchResult.improvements[0]}</p>}
              </div>
            )}
          </div>
        )}

        {tab === "cover" && (
          <div>
            {!coverLetter ? (
              <button onClick={handleCover} disabled={loading || !job} style={{ width: "100%", padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {loading ? "Generating..." : "Generate Cover Letter"}
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 11, whiteSpace: "pre-wrap", lineHeight: 1.5, marginBottom: 12 }}>{coverLetter}</p>
                <button onClick={() => navigator.clipboard.writeText(coverLetter)} style={{ width: "100%", padding: "8px", background: "#059669", color: "white", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Copy to Clipboard</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
        <a href="https://hireflow.vercel.app/dashboard" target="_blank" rel="noopener" style={{ fontSize: 11, color: "#2563eb", textDecoration: "none" }}>Open HireFlow Dashboard →</a>
      </div>
    </div>
  );
}
