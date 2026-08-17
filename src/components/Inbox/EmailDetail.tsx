'use client';

import { format } from 'date-fns';
import { Sparkles, Briefcase, XCircle, Mail } from 'lucide-react';

interface EmailDetailProps {
  email: {
    id: string;
    subject: string | null;
    sender: string | null;
    senderEmail: string | null;
    snippet: string | null;
    receivedAt: Date | null;
    category: string | null;
    jobRelated: boolean;
  };
}

export default function EmailDetail({ email }: EmailDetailProps) {
  const isJobRelated = email.jobRelated;
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Actions */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#111]">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition-colors flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            Extract Job
          </button>
          <button className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition-colors flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Summarize
          </button>
        </div>
        <div>
          <button className="px-3 py-1.5 rounded-md hover:bg-white/5 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Dismiss
          </button>
        </div>
      </div>

      {/* Email Header */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-2xl font-semibold text-white mb-4 leading-tight">
          {email.subject || '(No Subject)'}
        </h2>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {email.sender ? email.sender.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="font-medium text-gray-200 flex items-center gap-2">
                {email.sender || 'Unknown Sender'}
                <span className="text-sm text-gray-500 font-normal">&lt;{email.senderEmail || 'unknown@email.com'}&gt;</span>
              </div>
              <div className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
                {email.receivedAt ? format(new Date(email.receivedAt), 'MMM d, yyyy, h:mm a') : 'Unknown Date'}
              </div>
            </div>
          </div>
          
          {email.category && (
            <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-gray-300 uppercase tracking-wider">
              {email.category.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>

      {/* AI Summary / Insights (Mocked for now) */}
      <div className="p-6 bg-indigo-500/5 border-b border-indigo-500/10">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-indigo-300 mb-1">AI Insight</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {email.snippet ? email.snippet + '...' : 'No summary available for this email.'}
            </p>
            {isJobRelated && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-indigo-400">
                <Briefcase className="w-3.5 h-3.5" />
                Detected as job-related communication
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Body (Snippet for now) */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 text-gray-300">
        <div className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed opacity-80">
            {email.snippet || 'No content available.'}
          </p>
          
          <div className="mt-8 p-4 rounded-lg border border-dashed border-white/10 text-center text-sm text-gray-500 flex flex-col items-center">
            <Mail className="w-6 h-6 mb-2 opacity-50" />
            <p>Full email body rendering requires Gmail scope expansion.</p>
            <p>Showing snippet metadata only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
