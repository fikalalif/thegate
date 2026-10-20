"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { RefreshCw } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-retro-night flex flex-col items-center justify-center p-4 text-retro-paper select-none">
        <div className="flex items-center gap-2 border-2 border-black bg-retro-coal px-4 py-3 shadow-pixel font-pixel text-xs text-retro-amber animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-retro-amber" />
          <span>CHECKING CONSOLE ACCESS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      {children}
      <ChangePasswordModal />
    </>
  );
}
