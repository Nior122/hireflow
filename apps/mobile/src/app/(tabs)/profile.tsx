import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";

const MENU_SECTIONS = [
  {
    title: "Job Seeker",
    items: [
      { icon: "document-text-outline", label: "Resume Studio", route: "/(dashboard)/resume", color: "#2563eb" },
      { icon: "calendar-outline", label: "Interview Center", route: "/(dashboard)/interviews", color: "#8b5cf6" },
      { icon: "bookmark-outline", label: "Saved Jobs", route: "/jobs", color: "#10b981" },
    ],
  },
  {
    title: "Employer",
    items: [
      { icon: "people-outline", label: "Team Dashboard", route: "/(dashboard)/team", color: "#f59e0b" },
      { icon: "bar-chart-outline", label: "Analytics", route: "/(dashboard)/analytics", color: "#ef4444" },
    ],
  },
  {
    title: "Settings",
    items: [
      { icon: "notifications-outline", label: "Notifications", route: "/(dashboard)/settings", color: "#64748b" },
      { icon: "moon-outline", label: "Appearance", route: "/(dashboard)/settings", color: "#8b5cf6" },
      { icon: "shield-checkmark-outline", label: "Privacy & Security", route: "/(dashboard)/settings", color: "#10b981" },
      { icon: "help-circle-outline", label: "Help & Support", route: "/(dashboard)/settings", color: "#64748b" },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Card */}
        <View style={{ padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563eb10", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: "#2563eb" }}>
                {user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#0f172a" }}>
                {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "User"}
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b" }}>
                {user?.emailAddresses?.[0]?.emailAddress ?? ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </View>
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8 }}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: "#fff", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e2e8f0" }}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => router.push(item.route as any)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${item.color}10`, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: "#0f172a" }}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 14, borderRadius: 10, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#ef4444" }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>HireFlow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}