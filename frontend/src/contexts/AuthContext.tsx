"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/src/types";
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken } from "@/src/services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(savedToken);
      } else {
        removeAuthToken();
        setUser(null);
        setToken(null);
      }
    } catch {
      removeAuthToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.detail || "Đăng nhập thất bại" };
      }
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ" };
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setToken(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
