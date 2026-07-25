import { create } from "zustand";
import { useColorScheme } from "react-native";

interface User {
  id: string;
  role: string;
  email?: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isOnboarded: boolean;
  setIsOnboarded: (val: boolean) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  selectedOrg: string | null;
  setSelectedOrg: (orgId: string | null) => void;
  offlineQueue: Array<{ id: string; action: string; data: unknown; timestamp: number }>;
  addToOfflineQueue: (item: { action: string; data: unknown }) => void;
  processOfflineQueue: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  isOnboarded: false,
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  selectedOrg: null,
  setSelectedOrg: (selectedOrg) => set({ selectedOrg }),
  offlineQueue: [],
  addToOfflineQueue: (item) =>
    set((state) => ({
      offlineQueue: [
        ...state.offlineQueue,
        { ...item, id: Date.now().toString(), timestamp: Date.now() },
      ],
    })),
  processOfflineQueue: () => {
    const queue = get().offlineQueue;
    if (queue.length > 0) {
      set({ offlineQueue: [] });
    }
  },
}));
