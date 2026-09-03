import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { DiscordUser } from '../types';

interface AuthContextType {
  user: DiscordUser | null;
  loading: boolean;
  loginWithDiscord: () => void;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithDiscord = () => {
    window.location.href = '/api/auth/login';
  };

  const devLogin = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; user: DiscordUser };
        setUser(data.user);
      } else {
        window.location.href = '/api/auth/dev-login';
      }
    } catch {
      window.location.href = '/api/auth/dev-login';
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithDiscord,
        devLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};
