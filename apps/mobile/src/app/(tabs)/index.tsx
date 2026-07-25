import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

const QUICK_ACTIONS = [
  { icon: "search-outline", label: "Find Jobs", route: "/jobs" },
  { icon: "document-text-outline", label: "Resume", route: "/(dashboard)/resume" },
  { icon: "calendar-outline", label: "Interviews", route: "/(dashboard)/interviews" },
  { icon: "chatbubbles-outline", label: "Copilot", route: "/copilot" },
  { icon: "bar-chart-outline", label: "Analytics", route: "/(dashboard)/analytics" },
  { icon: "settings-outline", label: "Settings", route: "/(dashboard)/settings" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    totalApps: number; interviews: number; offers: number; reminders: number;
    recentApps: any[]; savedJobs: any[];
  }>({ totalApps: 0, interviews: 0, offers: 0, reminders: 0, recentApps: [], savedJobs: [] });

  async function loadData() {
    try {
      const res = await api.get<{ applications: any[]; reminders: any[]; savedJobs: any[] }>("/dashboard?type=mobile");
      if (res) {
        setData({
          totalApps: res.applications?.length ?? 0,
          interviews: res.applications?.filter((a: any) => a.status === "INTERVIEW").length ?? 0,
          offers: res.applications?.filter((a: any) => a.status === "OFFER").length ?? 0,
          reminders: res.reminders?.length ?? 0,
          recentApps: (res.applications ?? []).slice(0, 5),
          savedJobs: (res.savedJobs ?? []).slice(0, 5),
        });
      }
    } catch {}
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, color: "#64748b" }}>{today}</Text>
          <Text style={{ fontSize: 26, fontWeight: "bold", color: "#0f172a", marginTop: 4 }}>Your Dashboard</Text>
        </View>

        {/* Stats Cards */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Applications", value: data.totalApps, color: "#2563eb" },
            { label: "Interviews", value: data.interviews, color: "#8b5cf6" },
            { label: "Offers", value: data.offers, color: "#10b981" },
            { label: "Reminders", value: data.reminders, color: "#f59e0b" },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: `${stat.color}10`, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 12 }}>Quick Actions</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => router.push(action.route as any)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f8fafc", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#e2e8f0" }}
            >
              <Ionicons name={action.icon as any} size={16} color="#2563eb" />
              <Text style={{ fontSize: 12, color: "#0f172a", fontWeight: "500" }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Applications */}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 12 }}>Recent Applications</Text>
        {data.recentApps.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Ionicons name="briefcase-outline" size={40} color="#94a3b8" />
            <Text style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>No applications yet</Text>
          </View>
        ) : (
          data.recentApps.map((app: any) => (
            <View key={app.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, backgroundColor: "#f8fafc", marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#2563eb10", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, color: "#2563eb", fontWeight: "600" }}>{app.company?.[0] ?? "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>{app.company}</Text>
                <Text style={{ fontSize: 11, color: "#64748b" }}>{app.role} · {app.status}</Text>
              </View>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{app.status}</Text>
            </View>
          ))
        )}

        {/* Daily Brief */}
        <View style={{ marginTop: 16, backgroundColor: "#2563eb10", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#2563eb20" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="bulb-outline" size={18} color="#2563eb" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>AI Daily Brief</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}>
            {data.reminders > 0 ? `You have ${data.reminders} pending reminders. ` : ""}
            {data.interviews > 0 ? `${data.interviews} interviews scheduled. ` : "No upcoming interviews. "}
            {data.offers > 0 ? `${data.offers} offers to review!` : "Keep applying!"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}