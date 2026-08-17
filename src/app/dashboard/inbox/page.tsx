import InboxView from "@/components/Inbox/InboxView";

export const metadata = {
  title: "Inbox - Gmail Intelligence Center",
};

export default function InboxPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-6 py-4 border-b border-white/10 bg-[#0a0a0a]">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Gmail Intelligence Center</h1>
        <p className="text-sm text-gray-400 mt-1">Manage and track your job search communications.</p>
      </div>
      <InboxView />
    </div>
  );
}
