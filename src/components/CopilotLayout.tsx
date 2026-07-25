'use client';

import { useState, useCallback } from "react";
import { CopilotSidebar } from "./CopilotSidebar";
import { CopilotChat } from "./CopilotChat";
import { CopilotContextPanel } from "./CopilotContextPanel";
import { createConversation } from "@/actions/copilot";

interface Props {
  roleContext: string;
}

export function CopilotLayout({ roleContext }: Props) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showContext, setShowContext] = useState(true);

  const handleNewMessage = useCallback(async (content: string) => {
    if (!activeConversationId) {
      const result = await createConversation(content.slice(0, 60), roleContext);
      if (result.success && result.data) {
        setActiveConversationId(result.data.id);
      }
    }
  }, [activeConversationId, roleContext]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -mt-8 bg-background">
      {/* Left Sidebar — Conversation History */}
      <div className={`${showSidebar ? "w-64" : "w-0"} flex-shrink-0 transition-all duration-200 overflow-hidden hidden md:block`}>
        <CopilotSidebar
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
          onNew={() => setActiveConversationId(null)}
          roleContext={roleContext}
        />
      </div>

      {/* Center — Chat Interface */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CopilotChat
          conversationId={activeConversationId}
          onNewMessage={handleNewMessage}
        />
      </div>

      {/* Right Panel — Context */}
      <div className={`${showContext ? "w-64" : "w-0"} flex-shrink-0 transition-all duration-200 overflow-hidden border-l hidden lg:block`}>
        <CopilotContextPanel role={roleContext} />
      </div>
    </div>
  );
}
