import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

export default function AnalyticsScreen() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { const res = await api.get<any>("/analytics/executive"); setData(res); } catch {}
  }

  useEffect(() => { load(); }, []);

  if (!data) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#94a3b8" }}>Loading...</Text></View>;

  const m = data.metrics ?? {};
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>Hiring Metrics</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          { label: "Open Positions", value: m.openPositions, icon: "briefcase", color: "#2563eb" },
          { label: "Applications", value: m.totalApplications, icon: "mail", color: "#10b981" },
          { label: "Interviews", value: m.totalInterviews, icon: "people", color: "#8b5cf6" },
          { label: "Offers", value: m.totalOffers, icon: "document-text", color: "#f59e0b" },
          { label: "Hires", value: m.totalHires, icon: "checkmark-circle", color: "#10b981" },
          { label: "Accept Rate", value: `${m.offerAcceptanceRate ?? 0}%`, icon: "trending-up", color: "#2563eb" },
          { label: "Time to Hire", value: `${m.avgTimeToHire ?? 0}d`, icon: "time", color: "#ef4444" },
          { label: "Velocity", value: `${m.pipelineVelocity ?? 0}%`, icon: "speedometer", color: "#8b5cf6" },
        ].map(kpi => (
          <View key={kpi.label} style={{ width: "47%", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14 }}>
            <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
            <Text style={{ fontSize: 22, fontWeight: "bold", color: kpi.color, marginTop: 8 }}>{kpi.value ?? 0}</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {data.insights?.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>AI Insights</Text>
          {data.insights.slice(0, 3).map((insight: any) => (
            <View key={insight.id} style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>{insight.title}</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{insight.description}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}