import { Stack } from "expo-router";

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#0f172a" }}>
      <Stack.Screen name="resume" options={{ title: "Resume Studio" }} />
      <Stack.Screen name="interviews" options={{ title: "Interview Center" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
      <Stack.Screen name="team" options={{ title: "Team Dashboard" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}