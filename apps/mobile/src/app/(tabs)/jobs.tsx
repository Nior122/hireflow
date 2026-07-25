import { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

export default function JobsScreen() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function searchJobs(keyword: string) {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await api.get<{ jobs: any[] }>(`/discover/search?keyword=${encodeURIComponent(keyword)}&remote=any`);
      setJobs(res?.jobs ?? []);
    } catch { setJobs([]); }
    setLoading(false);
  }

  const onRefresh = async () => { setRefreshing(true); await searchJobs(query); setRefreshing(false); };

  function formatSalary(min?: number | null, max?: number | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    if (min && max) return `${fmt(min)}-${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
  }

  function JobCard({ item }: { item: any }) {
    const salary = formatSalary(item.salaryMin, item.salaryMax);
    const skills = Array.isArray(item.skills) ? item.skills : [];

    return (
      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
          {item.companyLogo ? (
            <Image source={{ uri: item.companyLogo }} style={{ width: 36, height: 36, borderRadius: 8 }} />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#2563eb10", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="business-outline" size={18} color="#2563eb" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{item.company}</Text>
          </View>
          <View style={{ backgroundColor: "#f1f5f9", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, color: "#64748b" }}>{item.source}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {item.location && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="location-outline" size={12} color="#64748b" />
              <Text style={{ fontSize: 11, color: "#64748b" }}>{item.location.length > 25 ? item.location.slice(0, 25) + "..." : item.location}</Text>
            </View>
          )}
          {salary && <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "500" }}>{salary}</Text>}
        </View>
        {skills.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {skills.slice(0, 3).map((s: string) => (
              <View key={s} style={{ backgroundColor: "#e0e7ff", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: "#4338ca" }}>{s}</Text>
              </View>
            ))}
            {skills.length > 3 && <Text style={{ fontSize: 10, color: "#94a3b8" }}>+{skills.length - 3}</Text>}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => { savedIds.add(item.externalId); setSavedIds(new Set(savedIds)); }}
            disabled={savedIds.has(item.externalId)}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: savedIds.has(item.externalId) ? "#f1f5f9" : "#2563eb", borderRadius: 8, paddingVertical: 8 }}
          >
            <Ionicons name={savedIds.has(item.externalId) ? "checkmark-circle" : "bookmark-outline"} size={14} color={savedIds.has(item.externalId) ? "#64748b" : "#fff"} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: savedIds.has(item.externalId) ? "#64748b" : "#fff" }}>
              {savedIds.has(item.externalId) ? "Saved" : "Save Job"}
            </Text>
          </TouchableOpacity>
          {item.applicationUrl && (
            <TouchableOpacity style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" }}>
              <Ionicons name="open-outline" size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Search Bar */}
      <View style={{ padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8fafc", borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Job title, keywords..."
              returnKeyType="search"
              onSubmitEditing={() => searchJobs(query)}
              style={{ flex: 1, fontSize: 14, paddingVertical: 10 }}
            />
          </View>
          <TouchableOpacity onPress={() => searchJobs(query)} style={{ backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" }}>
            <Ionicons name="search" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.externalId}
        renderItem={({ item }) => <JobCard item={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="search-outline" size={50} color="#cbd5e1" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 12 }}>Search for jobs</Text>
              <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Find opportunities from multiple providers</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Searching...</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}