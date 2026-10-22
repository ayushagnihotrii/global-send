import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'globalsend_auth_token';
const USER_KEY = 'globalsend_auth_user';
const SERVER_URL_KEY = 'globalsend_server_url';

// Default server URLs: Android emulator uses 10.0.2.2, production uses gsend.in
export const DEFAULT_SERVER_URL = 'http://10.0.2.2:3000';

class MobileSecureStorage {
  private inMemoryFallback: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
    } catch {
      // Fallback if SecureStore unavailable
    }
    return this.inMemoryFallback.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fallback
    }
    this.inMemoryFallback.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Fallback
    }
    this.inMemoryFallback.delete(key);
  }

  async getAuthToken(): Promise<string | null> {
    return this.getItem(TOKEN_KEY);
  }

  async setAuthToken(token: string): Promise<void> {
    return this.setItem(TOKEN_KEY, token);
  }

  async clearAuth(): Promise<void> {
    await this.removeItem(TOKEN_KEY);
    await this.removeItem(USER_KEY);
  }

  async getServerUrl(): Promise<string> {
    const custom = await this.getItem(SERVER_URL_KEY);
    return custom || DEFAULT_SERVER_URL;
  }

  async setServerUrl(url: string): Promise<void> {
    return this.setItem(SERVER_URL_KEY, url);
  }
}

export const mobileStorage = new MobileSecureStorage();
