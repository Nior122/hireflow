import { createOrGetUser } from "@/lib/clerk";
import { SettingsDashboard } from "@/components/SettingsDashboard";

export default async function SettingsPage() {
  await createOrGetUser();
  return <SettingsDashboard />;
}
