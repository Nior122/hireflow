import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

const STATUSES = ["UNAPPLIED", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];
const STATUS_LABELS: Record<string, string> = {
  UNAPPLIED: "Unapplied", WISHLIST: "Wishlist", APPLIED: "Applied",
  INTERVIEW: "Interview", OFFER: "Offer", REJECTED: "Rejected",
};
const STATUS_COLORS: Record<string, string> = {
  UNAPPLIED: "#6b7280", WISHLIST: "#3b82f6", APPLIED: "#eab308",
  INTERVIEW: "#8b5cf6", OFFER: "#10b981", REJECTED: "#ef4444",
};

export default function KanbanScreen() {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadApplications(); }, []);

  async function loadApplications() {
    try {
      const res = await api.get<any[]>("/dashboard/applications");
      setApplications(res ?? []);
    } catch {}
  }

  const onRefresh = async () => { setRefreshing(true); await loadApplications(); setRefreshing(false); };

  const filtered = selectedStatus === "ALL" ? applications : applications.filter(a => a.status === selectedStatus);
  const statusCounts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.status === s).length }), {} as Record<string, number>);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function getRelativeDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Status Filter Bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["ALL", ...STATUSES]}
          keyExtractor={(s) => s}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedStatus(item)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                backgroundColor: selectedStatus === item ? (item === "ALL" ? "#2563eb" : STATUS_COLORS[item]) : "#f1f5f9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: selectedStatus === item ? "#fff" : "#64748b" }}>
                {item === "ALL" ? "All" : STATUS_LABELS[item]}
                {item === "ALL" ? ` (${applications.length})` : ` (${statusCounts[item] ?? 0})`}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[item.status] }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a", flex: 1 }} numberOfLines={1}>{item.company}</Text>
              <View style={{ backgroundColor: `${STATUS_COLORS[item.status]}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: STATUS_COLORS[item.status], fontWeight: "500" }}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{item.role}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>{getRelativeDate(item.createdAt)}</Text>
              {item.source && (
                <View style={{ backgroundColor: "#f1f5f9", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, color: "#64748b" }}>{item.source}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Ionicons name="layers-outline" size={50} color="#cbd5e1" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 12 }}>No applications</Text>
            <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Start by searching and saving jobs</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}