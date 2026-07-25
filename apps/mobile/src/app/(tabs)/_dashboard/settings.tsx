import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Appearance */}
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Appearance</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="moon-outline" size={20} color="#8b5cf6" />
            <Text style={{ fontSize: 14, color: "#0f172a" }}>Dark Mode</Text>
          </View>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: "#8b5cf6", false: "#e2e8f0" }} />
        </View>
      </View>

      {/* Notifications */}
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Notifications</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="notifications-outline" size={20} color="#2563eb" />
            <Text style={{ fontSize: 14, color: "#0f172a" }}>Push Notifications</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: "#2563eb", false: "#e2e8f0" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="mail-outline" size={20} color="#10b981" />
            <Text style={{ fontSize: 14, color: "#0f172a" }}>Email Notifications</Text>
          </View>
          <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: "#10b981", false: "#e2e8f0" }} />
        </View>
      </View>

      {/* Account */}
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Account</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 }}>
        {[
          { icon: "key-outline", label: "Password & Security", color: "#64748b" },
          { icon: "link-outline", label: "Connected Accounts", color: "#2563eb" },
          { icon: "shield-checkmark-outline", label: "Privacy", color: "#10b981" },
          { icon: "trash-outline", label: "Delete Account", color: "#ef4444" },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            <Text style={{ flex: 1, fontSize: 14, color: item.color === "#ef4444" ? "#ef4444" : "#0f172a" }}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      {/* About */}
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>About</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
        {[
          { icon: "document-text-outline", label: "Terms of Service", color: "#64748b" },
          { icon: "lock-closed-outline", label: "Privacy Policy", color: "#64748b" },
          { icon: "information-circle-outline", label: "About HireFlow", color: "#64748b" },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            <Text style={{ flex: 1, fontSize: 14, color: "#0f172a" }}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 24 }}>HireFlow v1.0.0</Text>
    </ScrollView>
  );
}