import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const { signUp, setActive } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const result = await signUp.create({ emailAddress: email, password, username: name || undefined });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/auth/role-select");
      }
    } catch (e: any) {
      Alert.alert("Error", e.errors?.[0]?.message ?? "Sign up failed");
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Ionicons name="flash" size={48} color="#2563eb" />
            <Text style={{ fontSize: 28, fontWeight: "bold", marginTop: 12 }}>Create Account</Text>
            <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Start your career journey</Text>
          </View>

          <View style={{ gap: 12 }}>
            <TextInput value={name} onChangeText={setName} placeholder="Full Name" style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 16 }} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 16 }} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 16 }} />
            <TouchableOpacity onPress={handleSignUp} disabled={loading} style={{ backgroundColor: loading ? "#93c5fd" : "#2563eb", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{loading ? "Creating..." : "Sign Up"}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
            <Text style={{ color: "#64748b" }}>Already have an account? </Text>
            <Link href="/auth/sign-in" asChild>
              <TouchableOpacity><Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign In</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
