'use client';
import { useEffect, useState } from 'react';
import { getReviewDrafts, saveReviewDraft, rejectReviewDraft, sendReviewDraft } from '@/actions/review-inbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
type Draft = Awaited<ReturnType<typeof getReviewDrafts>>[number];
export function ReviewInbox() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getReviewDrafts().then(setDrafts).catch(() => toast.error('Could not load drafts')); }, []);
  async function run(action: () => Promise<void>, id: string, remove = false) {
    setBusy(true);
    try { await action(); if(remove) setDrafts(v => v.filter(d => d.id !== id)); toast.success('Draft updated'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Review inbox — nothing sends without your approval</h2>
    {!drafts.length && <p>No drafts awaiting review.</p>}
    {drafts.map(d => <div key={d.id} className="border rounded-lg p-4 space-y-2">
      <p className="font-medium">{d.candidate.name} · {d.candidate.email} · {d.candidate.positionApplied}</p>
      <Textarea value={d.body} onChange={e => setDrafts(v => v.map(x => x.id === d.id ? { ...x, body: e.target.value } : x))} rows={6} />
      <div className="flex gap-2"><Button disabled={busy} variant="outline" onClick={() => run(() => saveReviewDraft(d.id,d.body),d.id)}>Save edit</Button>
      <Button disabled={busy} onClick={() => run(async () => { await saveReviewDraft(d.id,d.body); await sendReviewDraft(d.id); },d.id,true)}>Send via Gmail</Button>
      <Button disabled={busy} variant="outline" onClick={() => run(() => rejectReviewDraft(d.id),d.id,true)}>Skip / reject</Button></div>
    </div>)}
  </section>;
}
