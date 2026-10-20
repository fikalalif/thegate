"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDefaultPassword: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  isDefaultPassword: false,
  login: async () => ({ success: false }),
  changePassword: async () => ({ success: false }),
  logout: () => {},
  isChangePasswordOpen: false,
  setIsChangePasswordOpen: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDefaultPassword, setIsDefaultPassword] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Check authentication status on startup
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("thegate_auth_token") : null;
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const status = await api.getAuthStatus();
      setIsAuthenticated(status.authenticated);
      setIsDefaultPassword(status.is_default_password);
    } catch {
      // If server unreachable or error, remain locked
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.login(password);
      if (res.success && res.token) {
        try {
          localStorage.setItem("thegate_auth_token", res.token);
        } catch {}
        setIsAuthenticated(true);
        setIsDefaultPassword(res.is_default_password);
        return { success: true };
      }
      return { success: false, error: "Authentication failed" };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid password" };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      if (res.success && res.token) {
        try {
          localStorage.setItem("thegate_auth_token", res.token);
        } catch {}
        setIsDefaultPassword(false);
        return { success: true };
      }
      return { success: false, error: "Failed to update password" };
    } catch (err: any) {
      return { success: false, error: err.message || "Password change failed" };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("thegate_auth_token");
      api.logout().catch(() => {});
    } catch {}
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isDefaultPassword,
        login,
        changePassword,
        logout,
        isChangePasswordOpen,
        setIsChangePasswordOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
