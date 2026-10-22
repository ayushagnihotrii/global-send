import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { mobileStorage } from '../services/storage';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  serverUrl: string;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>('http://10.0.2.2:3000');

  useEffect(() => {
    bootstrapSession();
  }, []);

  const bootstrapSession = async () => {
    try {
      const storedUrl = await mobileStorage.getServerUrl();
      setServerUrl(storedUrl);

      const storedToken = await mobileStorage.getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        const me = await api.getMe();
        if (me.authenticated && me.user) {
          setUser(me.user);
        } else {
          await mobileStorage.clearAuth();
          setToken(null);
          setUser(null);
        }
      }
    } catch {
      await mobileStorage.clearAuth();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (username: string, password: string): Promise<string> => {
    const res = await api.register(username, password);
    setToken(res.token);
    setUser(res.user);
    return res.recoveryCode;
  };

  const logout = async () => {
    await api.logout();
    setToken(null);
    setUser(null);
  };

  const updateServerUrl = async (url: string) => {
    const clean = url.trim().replace(/\/$/, '');
    await mobileStorage.setServerUrl(clean);
    setServerUrl(clean);
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      if (me.authenticated && me.user) {
        setUser(me.user);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        serverUrl,
        login,
        register,
        logout,
        updateServerUrl,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
