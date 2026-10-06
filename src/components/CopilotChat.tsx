'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ToolCallState {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  result?: string;
  error?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallState[];
}

interface Props {
  conversationId: string | null;
  onNewMessage: (content: string) => void;
}

const SUGGESTIONS: Record<string, string[]> = {
  JOB_SEEKER: [
    "Which jobs need follow-up?",
    "Summarize my job search progress",
    "What should I do today?",
    "Analyze my application patterns",
    "Help prepare for my interview",
    "Show my career score",
  ],
  EMPLOYER: [
    "Which candidates should I interview?",
    "Summarize hiring progress",
    "Compare top candidates",
    "Draft interview questions",
    "Generate offer email",
    "Which applicants need review?",
  ],
};

export function CopilotChat({ conversationId, onNewMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    onNewMessage(text);

    let assistantContent = "";
    let assistantWasUpdated = false;
    const toolCalls: ToolCallState[] = [];
    const upsertAssistant = (content = assistantContent) => {
      assistantWasUpdated = true;
      setMessages(previous => {
        const index = previous.findIndex(message => message.id === assistantId);
        const assistant: Message = {
          id: assistantId,
          role: "assistant",
          content,
          toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
        };
        if (index < 0) return [...previous, assistant];
        const updated = [...previous];
        updated[index] = assistant;
        return updated;
      });
    };

    const updateTool = (id: string, name: string, patch: Partial<ToolCallState>) => {
      const index = toolCalls.findIndex(call => (id && call.id === id) || (!id && call.name === name && call.status === "running"));
      if (index < 0) return;
      toolCalls[index] = { ...toolCalls[index], ...patch };
      upsertAssistant();
    };

    const handleEvent = (data: string) => {
      if (!data || data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "text" && typeof parsed.content === "string" && parsed.content) {
          assistantContent += parsed.content;
          upsertAssistant();
        } else if (parsed.type === "tool_call") {
          const call: ToolCallState = {
            id: typeof parsed.id === "string" ? parsed.id : `${parsed.name ?? "tool"}-${toolCalls.length}`,
            name: typeof parsed.name === "string" ? parsed.name : "unknown tool",
            args: parsed.args && typeof parsed.args === "object" ? parsed.args : {},
            status: "running",
          };
          toolCalls.push(call);
          upsertAssistant();
        } else if (parsed.type === "tool_result") {
          updateTool(
            typeof parsed.id === "string" ? parsed.id : "",
            typeof parsed.name === "string" ? parsed.name : "",
            { status: "done", result: typeof parsed.result === "string" ? parsed.result : "" },
          );
        } else if (parsed.type === "tool_error") {
          updateTool(
            typeof parsed.id === "string" ? parsed.id : "",
            typeof parsed.name === "string" ? parsed.name : "",
            { status: "error", error: typeof parsed.error === "string" ? parsed.error : "Tool execution failed." },
          );
        } else if (parsed.type === "error" && typeof parsed.error === "string") {
          assistantContent = assistantContent
            ? `${assistantContent}\n\n${parsed.error}`
            : parsed.error;
          upsertAssistant();
        }
      } catch {
        // Ignore malformed SSE events; the stream may still contain valid later events.
      }
    };

    try {
      const history = [...messages, userMsg]
        .filter(message => (message.role === "user" || message.role === "assistant") && message.content.trim())
        .map(message => ({ role: message.role, content: message.content }));

      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, conversationId }),
      });

      if (!res.ok) {
        let detail = "Sorry, I encountered an error. Please try again.";
        try {
          const data = await res.json();
          if (typeof data.error === "string" && data.error.trim()) detail = data.error;
        } catch {
          // Keep the generic error if the response is not JSON.
        }
        assistantContent = detail;
        upsertAssistant();
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        assistantContent = "The AI response stream was unavailable. Please try again.";
        upsertAssistant();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
          if (normalized.startsWith("data:")) handleEvent(normalized.slice(5).replace(/^ /, ""));
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
          if (normalized.startsWith("data:")) handleEvent(normalized.slice(5).replace(/^ /, ""));
        }
      }

      if (!assistantWasUpdated) {
        assistantContent = "I received an empty response. Please try again.";
        upsertAssistant();
      }
    } catch {
      assistantContent = "Connection error. Please check your network and try again.";
      upsertAssistant();
    } finally {
      setStreaming(false);
    }
  }, [streaming, messages, conversationId, onNewMessage]);

  function handleSubmit() {
    if (!input.trim() || streaming) return;
    sendMessage(input);
  }

  function copyMessage(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-7 w-7 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">AI Career Copilot</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">Ask me anything about your job search or hiring pipeline</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {SUGGESTIONS.JOB_SEEKER.slice(0, 6).map((s, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs text-left justify-start h-auto py-2 px-3" onClick={() => sendMessage(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === "user" ? "order-2" : ""}`}>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc, ti) => (
                    <div key={tc.id || ti} title={tc.error || tc.result} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {tc.status === "running" ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : tc.status === "done" ? (
                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                      ) : (
                        <span className="w-2.5 text-center text-destructive">!</span>
                      )}
                      <span>
                        {tc.status === "done" ? "Used" : tc.status === "error" ? "Could not use" : "Using"}{" "}
                        <code className="bg-muted px-1 rounded">{tc.name}</code>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border"
              }`}>
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.content && (
                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon-xs" className="h-5 w-5" onClick={() => copyMessage(msg.content, i)}>
                    {copiedIdx === i ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </motion.div>
        ))}

        {streaming && messages.length > 0 && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-1 px-4 py-3 bg-muted/50 border rounded-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Ask about your job search, applications, or anything..."
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px]"
          />
          <Button onClick={handleSubmit} disabled={streaming || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0" aria-label="Send message">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
