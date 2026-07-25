import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

export default function ResumeScreen() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadResumes() {
    try {
      const res = await api.get<any[]>("/resume/list");
      setResumes(res ?? []);
    } catch {}
  }

  useEffect(() => { loadResumes(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <FlatList
        data={resumes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadResumes(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>{item.name}</Text>
              {item.isDefault && <View style={{ backgroundColor: "#2563eb10", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: "#2563eb" }}>Default</Text></View>}
            </View>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{item.sections?.length ?? 0} sections · ATS Score: {item.atsScore ?? "--"}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Ionicons name="document-text-outline" size={50} color="#cbd5e1" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 12 }}>No resumes yet</Text>
            <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Create your first resume on the web app</Text>
          </View>
        }
      />
    </View>
  );
}