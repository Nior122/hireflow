import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const SUGGESTIONS = [
  "Summarize my job search",
  "Which jobs need follow-up?",
  "Help prepare for interview",
  "Improve my resume",
  "What should I do today?",
];

interface Message { id: string; role: "user" | "assistant"; content: string; }

export default function CopilotScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI career copilot. I know about your applications, saved jobs, reminders, and activity. Ask me anything about your job search!",
      }]);
    }
  }, []);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setStreaming(true);

    try {
      // Use fetch to stream from Groq directly
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: "You are HireFlow AI Copilot, a career assistant. Be concise, actionable, and data-driven." },
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: msg },
          ],
          stream: true,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let contentBuffer = "";
      const assistantId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                contentBuffer += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") last.content = contentBuffer;
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      if (!contentBuffer) {
        // Fallback for non-streaming
        const fallbackRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-70b-versatile",
            messages: [
              { role: "system", content: "You are HireFlow AI Copilot, a career assistant. Be concise, actionable, and data-driven." },
              { role: "user", content: msg },
            ],
            temperature: 0.3,
            max_tokens: 1024,
          }),
        });
        const fallbackData = await fallbackRes.json();
        const fallbackContent = fallbackData.choices?.[0]?.message?.content ?? "I couldn't process that request. Please try again.";
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") last.content = fallbackContent;
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") last.content = "I couldn't process that request. Please try again.";
        return updated;
      });
    }

    setStreaming(false);
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>AI Copilot</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}>Ask about your job search</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", justifyContent: item.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <View style={{
                maxWidth: "82%", padding: 12, borderRadius: 14,
                backgroundColor: item.role === "user" ? "#2563eb" : "#f1f5f9",
                borderBottomRightRadius: item.role === "user" ? 4 : 14,
                borderBottomLeftRadius: item.role === "assistant" ? 4 : 14,
              }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: item.role === "user" ? "#fff" : "#0f172a" }}>
                  {item.content}
                </Text>
                {streaming && item.role === "assistant" && item.id === messages[messages.length - 1]?.id && (
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#94a3b8" }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#94a3b8" }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#94a3b8" }} />
                  </View>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={
            messages.length === 1 ? (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>Try asking:</Text>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity key={s} onPress={() => sendMessage(s)} style={{ padding: 12, borderRadius: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: "#0f172a" }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#fff" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your AI copilot..."
            multiline
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, backgroundColor: "#f8fafc", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#e2e8f0", maxHeight: 100 }}
            onSubmitEditing={() => sendMessage()}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{ marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: input.trim() ? "#2563eb" : "#e2e8f0", alignItems: "center", justifyContent: "center" }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={input.trim() ? "#fff" : "#94a3b8"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}