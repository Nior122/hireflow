import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem("theme_mode", mode);
  },
}));

// Load saved theme on startup
export async function loadSavedTheme() {
  try {
    const saved = await AsyncStorage.getItem("theme_mode");
    if (saved && ["light", "dark", "system"].includes(saved)) {
      useThemeStore.setState({ mode: saved as ThemeMode });
    }
  } catch {}
}
