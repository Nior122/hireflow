'use client';
import { useState } from 'react';
import { createFullCv } from '@/actions/create-cv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
export function CreateCvWizard({ onCreated }: { onCreated: () => void }) {
  const [data, setData] = useState({ name: '', email: '', role: '', skills: '', experience: '', education: '' });
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number>();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const result = await createFullCv(data); setScore(result.atsScore); toast.success('CV created'); onCreated(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not create CV'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-3 p-4 border rounded-lg">
    <h2 className="font-semibold">Create CV from scratch</h2>
    {(['name','email','role'] as const).map(key => <label key={key} className="block text-sm capitalize">{key}<Input required type={key === 'email' ? 'email' : 'text'} maxLength={120} value={data[key]} onChange={e => setData(v => ({ ...v, [key]: e.target.value }))} /></label>)}
    {(['skills','experience','education'] as const).map(key => <label key={key} className="block text-sm capitalize">{key}<Textarea required value={data[key]} onChange={e => setData(v => ({ ...v, [key]: e.target.value }))} /></label>)}
    <Button disabled={busy}>{busy ? 'Generating…' : 'Generate CV & ATS score'}</Button>
    {score !== undefined && <p>ATS score: {score}/100</p>}
  </form>;
}
