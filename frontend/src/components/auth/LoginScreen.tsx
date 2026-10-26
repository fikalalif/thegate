"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";

type ThemeMode = "system" | "light" | "dark";

export function LoginScreen() {
  const { login } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // System & User Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveAndApply = (mode: ThemeMode) => {
      let activeDark = false;
      if (mode === "dark") {
        activeDark = true;
      } else if (mode === "light") {
        activeDark = false;
      } else {
        // System / OS default
        activeDark = mediaQuery.matches;
      }

      if (activeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      setIsDark(activeDark);
      setThemeMode(mode);
    };

    const saved = (localStorage.getItem("thegate-theme-mode") as ThemeMode) || "system";
    resolveAndApply(saved);

    const handleOSChange = () => {
      const curMode = (localStorage.getItem("thegate-theme-mode") as ThemeMode) || "system";
      if (curMode === "system") {
        resolveAndApply("system");
      }
    };

    const handleThemeEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.mode) {
        resolveAndApply(custom.detail.mode);
      }
    };

    mediaQuery.addEventListener("change", handleOSChange);
    window.addEventListener("themechange", handleThemeEvent);
    return () => {
      mediaQuery.removeEventListener("change", handleOSChange);
      window.removeEventListener("themechange", handleThemeEvent);
    };
  }, []);

  const cycleTheme = () => {
    let nextMode: ThemeMode = "system";
    if (themeMode === "system") {
      nextMode = "light";
    } else if (themeMode === "light") {
      nextMode = "dark";
    } else {
      nextMode = "system";
    }

    try {
      localStorage.setItem("thegate-theme-mode", nextMode);
    } catch {}

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const activeDark = nextMode === "dark" ? true : nextMode === "light" ? false : mediaQuery.matches;

    if (activeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setThemeMode(nextMode);
    setIsDark(activeDark);
    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme: activeDark ? "dark" : "light", mode: nextMode } })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setErrorMsg(null);

    const result = await login(password);
    if (!result.success) {
      setErrorMsg(result.error || t("auth.invalid_password"));
    }
    setLoading(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none transition-colors duration-200 ${
        isDark ? "bg-retro-night/95 text-retro-cream" : "bg-[#F5EFE6]/98 text-slate-900"
      }`}
    >
      {/* Top Floating Controls: Theme Switcher & Language Switcher */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-2">
        {/* Day / Night Theme Switcher */}
        <button
          type="button"
          onClick={cycleTheme}
          className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1 font-pixel text-[10px] shadow-pixel-sm transition-none cursor-pointer ${
            isDark
              ? "bg-retro-night text-retro-amber hover:bg-retro-sand hover:text-black"
              : "bg-[#FAF5EE] text-amber-800 hover:bg-amber-100"
          }`}
          title={
            themeMode === "system"
              ? `Theme: Auto (Following OS: ${isDark ? "Dark" : "Light"}). Click to switch.`
              : `Theme: ${themeMode.toUpperCase()}. Click to switch.`
          }
        >
          {themeMode === "system" ? (
            <>
              <Laptop className="h-3.5 w-3.5" />
              <span>AUTO ({isDark ? "DARK" : "LIGHT"})</span>
            </>
          ) : themeMode === "light" ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-600" />
              <span>LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-retro-blue" />
              <span>DARK</span>
            </>
          )}
        </button>

        {/* Language Switcher Bar */}
        <div
          className={`flex items-center border-2 border-black p-0.5 shadow-pixel-sm ${
            isDark ? "bg-retro-night" : "bg-[#FAF5EE]"
          }`}
        >
          <Globe className="h-3 w-3 text-retro-amber ml-1 mr-0.5" />
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-1.5 py-0.5 font-pixel text-[10px] transition-none cursor-pointer ${
              language === "en"
                ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-black"
            }`}
          >
            EN
          </button>
          <span className="text-slate-500 text-[10px] mx-0.5">|</span>
          <button
            type="button"
            onClick={() => setLanguage("id")}
            className={`px-1.5 py-0.5 font-pixel text-[10px] transition-none cursor-pointer ${
              language === "id"
                ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-black"
            }`}
          >
            ID
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div
        className={`w-full max-w-md border-2 border-black shadow-pixel-lg ${
          isDark ? "bg-retro-night text-retro-cream" : "bg-[#FAF5EE] text-slate-900"
        }`}
      >
        {/* Header Strip */}
        <div
          className={`border-b-2 border-black p-4 flex items-center justify-between ${
            isDark ? "bg-retro-plum text-white" : "bg-[#E6D7C3] text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="TheGate Icon"
              className={`h-9 w-9 border-2 border-black object-cover shadow-pixel-xs ${
                isDark ? "bg-retro-night" : "bg-white"
              }`}
              style={{ imageRendering: "pixelated" }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-pixel text-xs tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>
                  The<span className="text-retro-amber">Gate</span>
                </span>
                <PixelBadge variant="amber" size="xs">
                  16-BIT
                </PixelBadge>
              </div>
              <span className={`font-pixel text-[9px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {t("sidebar.brand_subtitle")}
              </span>
            </div>
          </div>
          <PixelBadge variant="mint" size="xs">
            PORT: 4848
          </PixelBadge>
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="flex justify-center mb-2">
              <div
                className={`h-12 w-12 border-2 border-black flex items-center justify-center shadow-pixel-sm ${
                  isDark ? "bg-retro-coal text-retro-amber" : "bg-[#EFE4D6] text-amber-700"
                }`}
              >
                <Lock className="h-6 w-6" />
              </div>
            </div>
            <h2 className={`font-pixel text-sm tracking-wide ${isDark ? "text-retro-cream" : "text-slate-900"}`}>
              {t("auth.login_title")}
            </h2>
            <p className={`font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t("auth.login_subtitle")}
            </p>
          </div>

          {/* Default Password Hint Banner */}
          <div
            className={`border-2 border-dashed p-2.5 flex items-center justify-between font-mono text-[11px] ${
              isDark
                ? "border-retro-amber/60 bg-retro-amber/10 text-slate-300"
                : "border-amber-600/60 bg-amber-500/15 text-slate-800"
            }`}
          >
            <span>Default Password:</span>
            <span
              className={`font-bold px-2 py-0.5 border ${
                isDark
                  ? "text-retro-amber bg-retro-night border-retro-amber"
                  : "text-amber-800 bg-white border-amber-600 shadow-pixel-xs"
              }`}
            >
              12345678
            </span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="border-2 border-red-600 bg-red-950/60 p-2.5 flex items-center gap-2 font-mono text-xs text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 font-mono">
              <label className={`text-xs font-bold block ${isDark ? "text-retro-paper" : "text-slate-700"}`}>
                {t("auth.password_label")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.password_placeholder")}
                  required
                  autoFocus
                  className={`w-full border-2 border-black px-3 py-2.5 pr-10 font-mono text-sm focus:outline-hidden ${
                    isDark
                      ? "bg-retro-coal text-retro-cream placeholder:text-slate-500 focus:border-retro-amber"
                      : "bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3 cursor-pointer ${
                    isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-black"
                  }`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className={`w-full flex items-center justify-center gap-2 border-2 border-black px-4 py-2.5 font-pixel text-xs transition-none cursor-pointer ${
                loading
                  ? "bg-retro-sand text-black animate-pulse cursor-wait"
                  : "bg-retro-amber hover:bg-amber-400 text-black font-bold shadow-pixel-sm active:translate-y-0.5"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>{loading ? t("auth.unlocking") : t("auth.unlock_button")}</span>
            </button>
          </form>

          {/* Privacy Security Note */}
          <div
            className={`border-t pt-3 flex items-center justify-center gap-2 font-mono text-[10px] ${
              isDark ? "border-retro-ink text-slate-500" : "border-slate-300 text-slate-500"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-retro-mint" />
            <span>Zero-Prompt Privacy • Enterprise Gateway Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
