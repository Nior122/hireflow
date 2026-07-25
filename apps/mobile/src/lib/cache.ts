import * as SecureStore from "expo-secure-store";

export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch {
      return false;
    }
  },
  async removeToken(key: string) {
    try {
      return await SecureStore.deleteItemAsync(key);
    } catch {
      return false;
    }
  },
};
