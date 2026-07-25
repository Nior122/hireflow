import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

export default function InterviewsScreen() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { const res = await api.get<any[]>("/interviews"); setInterviews(res ?? []); } catch {}
  }

  useEffect(() => { load(); }, []);

  const upcoming = interviews.filter(i => i.status === "SCHEDULED");
  const completed = interviews.filter(i => i.status === "COMPLETED");

  const TYPE_LABELS: Record<string, string> = {
    PHONE_SCREEN: "Phone", TECHNICAL: "Technical", HR: "HR", BEHAVIORAL: "Behavioral",
    SYSTEM_DESIGN: "System Design", PAIR_PROGRAMMING: "Pair", MANAGER_ROUND: "Manager",
    EXECUTIVE: "Executive", FINAL_ROUND: "Final", ASSESSMENT: "Assessment",
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <FlatList
        data={upcoming.length > 0 ? upcoming : completed.slice(0, 10)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: "#8b5cf610", borderRadius: 10, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#8b5cf6" }}>{upcoming.length}</Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>Upcoming</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#10b98110", borderRadius: 10, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#10b981" }}>{completed.length}</Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>Completed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#ef444410", borderRadius: 10, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#ef4444" }}>{interviews.filter(i => i.status === "MISSED").length}</Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>Missed</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }}>{item.company}</Text>
              <View style={{ backgroundColor: item.status === "SCHEDULED" ? "#8b5cf620" : "#10b98120", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: item.status === "SCHEDULED" ? "#8b5cf6" : "#10b981" }}>{TYPE_LABELS[item.interviewType] ?? item.interviewType}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{item.position}</Text>
            {item.scheduledAt && <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>📅 {new Date(item.scheduledAt).toLocaleDateString()}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Ionicons name="calendar-outline" size={50} color="#cbd5e1" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 12 }}>No interviews yet</Text>
          </View>
        }
      />
    </View>
  );
}