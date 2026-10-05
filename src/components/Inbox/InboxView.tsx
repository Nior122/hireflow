'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { getInboxEmails, getGmailSyncStatus, syncGmailInbox } from '@/actions/gmail-sync';
import { formatDistanceToNow } from 'date-fns';
import { Inbox, Briefcase, Users, Calendar, XCircle, Award, FileText, Loader2, Search, RefreshCw, Plug } from 'lucide-react';
import EmailDetail from './EmailDetail';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: Inbox },
  { id: 'APPLICATIONS', label: 'Applications', icon: FileText },
  { id: 'JOB_OPPORTUNITY', label: 'Jobs', icon: Briefcase },
  { id: 'INTERVIEWS', label: 'Interviews', icon: Calendar },
  { id: 'RECRUITERS', label: 'Recruiters', icon: Users },
  { id: 'REJECTIONS', label: 'Rejections', icon: XCircle },
  { id: 'OFFERS', label: 'Offers', icon: Award },
];

interface InboxEmail {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  category: string | null;
  confidence: number | null;
  jobRelated: boolean;
  applicationRelated: boolean;
  interviewRelated: boolean;
  rejectionRelated: boolean;
  offerRelated: boolean;
  createdAt: Date;
}

export default function InboxView() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [emailCount, setEmailCount] = useState(0);
  const [isSyncing, startSync] = useTransition();
  const autoSyncAttempted = useRef(false);

  async function fetchEmails(category = activeTab) {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, res] = await Promise.all([
        getGmailSyncStatus(),
        getInboxEmails({
          category: category === 'ALL' ? undefined : category,
          pageSize: 50,
        }),
      ]);

      if (statusRes.success && statusRes.data) {
        setConnected(statusRes.data.connected);
        setEmailCount(statusRes.data.emailCount);
      }

      if (!res.success) {
        setError(res.error || 'Failed to fetch emails');
      } else if (res.data) {
        setEmails(res.data.emails as InboxEmail[]);
        setSelectedEmailId((current) => {
          if (current && res.data!.emails.some((e) => e.id === current)) return current;
          return res.data!.emails[0]?.id ?? null;
        });
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      await fetchEmails();
      if (!mounted) return;
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (loading || autoSyncAttempted.current) return;
    if (connected && emailCount === 0) {
      autoSyncAttempted.current = true;
      handleSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, connected, emailCount]);

  function handleSync(forceFullSync = emailCount === 0) {
    startSync(async () => {
      try {
        const result = await syncGmailInbox({ forceFullSync });
        if (result.success) {
          const processed = result.data?.emailsProcessed ?? 0;
          const skipped = result.data?.emailsSkipped ?? 0;
          toast.success(
            processed + skipped === 0
              ? 'Sync finished. No inbox messages were returned — try Reconnect if this is unexpected.'
              : `Imported ${processed} email${processed === 1 ? '' : 's'}${skipped ? ` (${skipped} already stored)` : ''}.`
          );
          await fetchEmails();
        } else {
          toast.error(result.error ?? 'Failed to sync Gmail. Please connect in Settings.');
        }
      } catch {
        toast.error('Network error while syncing Gmail. Please try again.');
      }
    });
  }

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0a0a]">
      {/* Left Sidebar - Email List */}
      <div className="w-[400px] border-r border-white/10 flex flex-col bg-[#111]">
        {/* Tabs / Filters */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {connected ? (
              <button
                onClick={() => handleSync(emailCount === 0)}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 disabled:opacity-60"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isSyncing ? 'Syncing…' : 'Sync Inbox'}
              </button>
            ) : (
              <button
                onClick={() => { window.location.href = '/api/auth/gmail/connect'; }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400"
              >
                <Plug className="w-4 h-4" />
                Connect Gmail
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap outline-none ${
                    activeTab === cat.id
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {loading || isSyncing ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">{isSyncing ? 'Importing emails from Gmail…' : 'Loading emails...'}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-400 text-sm">{error}</div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 p-6 text-center">
              <Search className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm font-medium text-gray-400">No emails found</p>
              <p className="text-xs mt-1">
                {connected
                  ? 'Sync your inbox to import recent Gmail messages.'
                  : 'Connect Gmail, then sync to import your emails.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  className={`w-full text-left p-4 transition-colors hover:bg-white/5 outline-none ${
                    selectedEmailId === email.id ? 'bg-white/5 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-gray-200 truncate pr-2 text-sm">
                      {email.sender || 'Unknown Sender'}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {email.receivedAt ? formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-300 truncate mb-1">
                    {email.subject || '(No Subject)'}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {email.snippet}
                  </div>
                  {email.category && (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/10">
                      {email.category.replace('_', ' ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Email Detail */}
      <div className="flex-1 bg-[#0a0a0a] flex flex-col relative overflow-hidden">
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Select an email to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
