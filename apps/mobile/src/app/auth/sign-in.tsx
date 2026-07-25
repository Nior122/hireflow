import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Error", e.errors?.[0]?.message ?? "Sign in failed");
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Ionicons name="flash" size={48} color="#2563eb" />
            <Text style={{ fontSize: 28, fontWeight: "bold", marginTop: 12 }}>HireFlow</Text>
            <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Welcome back</Text>
          </View>

          <View style={{ gap: 12 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 16 }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 16 }}
            />
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={{ backgroundColor: loading ? "#93c5fd" : "#2563eb", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{loading ? "Signing in..." : "Sign In"}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
            <Text style={{ color: "#64748b" }}>Don't have an account? </Text>
            <Link href="/auth/sign-up" asChild>
              <TouchableOpacity><Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign Up</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
