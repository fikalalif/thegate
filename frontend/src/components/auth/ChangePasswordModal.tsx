"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { KeyRound, X, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";

export function ChangePasswordModal() {
  const { isChangePasswordOpen, setIsChangePasswordOpen, changePassword, isDefaultPassword } = useAuth();
  const { t } = useI18n();

  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isChangePasswordOpen || !mounted) return null;

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsChangePasswordOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg(t("auth.pw_too_short"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("auth.pw_mismatch"));
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Failed to update password");
    } else {
      setSuccessMsg(t("auth.pw_updated"));
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 select-none"
    >
      <div className="w-full max-w-md border-2 border-black bg-retro-night shadow-pixel-lg animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-retro-plum p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-retro-amber shrink-0" />
            <h3 className="font-pixel text-xs text-white uppercase tracking-wider">
              {t("auth.change_pw_title")}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-retro-paper hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 font-mono text-xs">
          {isDefaultPassword && (
            <div className="border border-retro-amber bg-retro-amber/10 p-2.5 text-slate-300 space-y-1">
              <span className="font-bold text-retro-amber flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Default Credentials Active
              </span>
              <p className="text-[11px]">
                Your gateway is currently using default password &quot;12345678&quot;. Set a secure custom password below.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="border-2 border-red-600 bg-red-950/60 p-2.5 flex items-center gap-2 text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="border-2 border-emerald-600 bg-emerald-950/60 p-2.5 flex items-center gap-2 text-emerald-200 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-retro-paper font-bold block">
              {t("auth.current_pw")}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream focus:border-retro-amber focus:outline-hidden"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-retro-paper font-bold block">
              {t("auth.new_pw")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream focus:border-retro-amber focus:outline-hidden"
            />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-retro-paper font-bold block">
              {t("auth.confirm_pw")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream focus:border-retro-amber focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={handleClose}
              className="border-2 border-black bg-retro-coal text-retro-paper px-4 py-2 font-pixel text-xs hover:bg-retro-sand hover:text-black cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`border-2 border-black px-4 py-2 font-pixel text-xs transition-none cursor-pointer ${
                loading
                  ? "bg-retro-sand text-black animate-pulse cursor-wait"
                  : "bg-retro-amber hover:bg-amber-400 text-black font-bold shadow-pixel-sm"
              }`}
            >
              {loading ? t("auth.updating") : t("auth.save_pw")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
