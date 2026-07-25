import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#8b5cf6", ADMIN: "#2563eb", RECRUITER: "#10b981",
  HIRING_MANAGER: "#f59e0b", INTERVIEWER: "#06b6d4", VIEWER: "#64748b",
};

export default function TeamScreen() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { const res = await api.get<any[]>("/organizations"); setOrgs(res ?? []); } catch {}
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <FlatList
        data={orgs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#2563eb10", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "#2563eb" }}>{item.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{item.memberCount ?? 0} members</Text>
              </View>
              <View style={{ backgroundColor: `${ROLE_COLORS[item.myRole] ?? "#64748b"}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: ROLE_COLORS[item.myRole] ?? "#64748b", fontWeight: "500" }}>{item.myRole}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="briefcase-outline" size={14} color="#64748b" />
                <Text style={{ fontSize: 11, color: "#64748b" }}>{item.jobPostings?.length ?? 0} jobs</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="people-outline" size={14} color="#64748b" />
                <Text style={{ fontSize: 11, color: "#64748b" }}>{item.memberCount ?? 0} team</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Ionicons name="business-outline" size={50} color="#cbd5e1" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 12 }}>No organizations</Text>
            <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Create an organization on the web app</Text>
          </View>
        }
      />
    </View>
  );
}