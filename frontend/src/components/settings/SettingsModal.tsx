"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Settings,
  ShieldCheck,
  Zap,
  Moon,
  Sun,
  Laptop,
  Globe,
  KeyRound,
  Lock,
  Server,
  CheckCircle2,
  AlertTriangle,
  Info,
  Heart,
  Save,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/auth";
import { useI18n, Language } from "@/lib/i18n";
import {
  DonationConfig,
  getDonationConfig,
  saveDonationConfig,
} from "@/lib/donation";

type ThemeMode = "system" | "light" | "dark";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { language, setLanguage, t } = useI18n();
  const { setIsChangePasswordOpen, logout, isDefaultPassword } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "security" | "gateway" | "sponsorship">("general");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [donationConfig, setDonationConfig] = useState<DonationConfig>(getDonationConfig());
  const [donateSaveStatus, setDonateSaveStatus] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const current = (localStorage.getItem("thegate-theme-mode") as ThemeMode) || "system";
    setThemeMode(current);
    setDonationConfig(getDonationConfig());

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.mode) {
        setThemeMode(custom.detail.mode);
      }
    };

    const handleDonationChange = () => {
      setDonationConfig(getDonationConfig());
    };

    window.addEventListener("themechange", handleThemeChange);
    window.addEventListener("donationconfigchange", handleDonationChange);
    return () => {
      window.removeEventListener("themechange", handleThemeChange);
      window.removeEventListener("donationconfigchange", handleDonationChange);
    };
  }, []);

  if (!isOpen || !mounted) return null;

  const handleApplyTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem("thegate-theme-mode", mode);
    } catch {}

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const activeDark = mode === "dark" ? true : mode === "light" ? false : mediaQuery.matches;

    if (activeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme: activeDark ? "dark" : "light", mode } })
    );
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs select-none"
    >
      <div className="relative w-full max-w-2xl border-2 border-black bg-retro-night text-retro-cream shadow-pixel-lg max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-retro-plum px-3 sm:px-4 py-2.5 sm:py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-retro-amber shadow-pixel-xs shrink-0">
              <Settings className="h-4 w-4 text-black" />
            </div>
            <div>
              <h2 className="font-pixel text-xs text-white tracking-wider">
                {t("settings.title", "SYSTEM SETTINGS & PREFERENCES")}
              </h2>
              <p className="font-mono text-[10px] text-retro-paper line-clamp-1 sm:line-clamp-none">
                {t("settings.subtitle", "Configure interface theme, access credentials, language, and gateway policies.")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-2 border-black bg-retro-coal text-retro-paper hover:bg-red-600 hover:text-white transition-none cursor-pointer shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b-2 border-black bg-retro-coal overflow-x-auto whitespace-nowrap no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 min-w-[100px] py-2 px-2.5 sm:px-3 font-pixel text-[10px] sm:text-[11px] border-r-2 border-black transition-none cursor-pointer ${
              activeTab === "general"
                ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                : "text-slate-300 hover:bg-retro-ink hover:text-white"
            }`}
          >
            {t("settings.tab_general", "General & Theme")}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 min-w-[100px] py-2 px-2.5 sm:px-3 font-pixel text-[10px] sm:text-[11px] border-r-2 border-black transition-none cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "security"
                ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                : "text-slate-300 hover:bg-retro-ink hover:text-white"
            }`}
          >
            <span>{t("settings.tab_security", "Security & Auth")}</span>
            {isDefaultPassword && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("gateway")}
            className={`flex-1 min-w-[100px] py-2 px-2.5 sm:px-3 font-pixel text-[10px] sm:text-[11px] border-r-2 border-black transition-none cursor-pointer ${
              activeTab === "gateway"
                ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                : "text-slate-300 hover:bg-retro-ink hover:text-white"
            }`}
          >
            {t("settings.tab_gateway", "Gateway Policies")}
          </button>
          <button
            onClick={() => setActiveTab("sponsorship")}
            className={`flex-1 min-w-[110px] py-2 px-2.5 sm:px-3 font-pixel text-[10px] sm:text-[11px] transition-none cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "sponsorship"
                ? "bg-pink-600 text-white font-bold shadow-pixel-xs"
                : "text-pink-300 hover:bg-retro-ink hover:text-white"
            }`}
          >
            <Heart className="h-3 w-3 fill-pink-400" />
            <span>{t("settings.tab_sponsorship", "Sponsor & Donate")}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-5 font-mono text-xs flex-1">
          {/* TAB 1: GENERAL & THEME */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* Theme Settings */}
              <div>
                <label className="block text-[11px] font-pixel text-retro-amber mb-2 uppercase">
                  {t("settings.theme_title", "Interface Theme")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dark Mode */}
                  <div
                    onClick={() => handleApplyTheme("dark")}
                    className={`border-2 p-3 cursor-pointer transition-none ${
                      themeMode === "dark"
                        ? "border-retro-amber bg-retro-ink shadow-pixel-sm"
                        : "border-black bg-retro-coal hover:border-retro-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-retro-amber" />
                        <span className="font-pixel text-[11px] text-white">
                          {t("settings.theme_dark", "Dark Theme")}
                        </span>
                      </div>
                      {themeMode === "dark" && (
                        <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t("settings.theme_dark_desc", "Obsidian retro night with cyan & amber neon highlights.")}
                    </p>
                  </div>

                  {/* Light Mode */}
                  <div
                    onClick={() => handleApplyTheme("light")}
                    className={`border-2 p-3 cursor-pointer transition-none ${
                      themeMode === "light"
                        ? "border-retro-amber bg-retro-sand text-black shadow-pixel-sm"
                        : "border-black bg-retro-coal hover:border-retro-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <span className={`font-pixel text-[11px] ${themeMode === "light" ? "text-black" : "text-white"}`}>
                          {t("settings.theme_light", "Light Theme")}
                        </span>
                      </div>
                      {themeMode === "light" && (
                        <CheckCircle2 className="h-4 w-4 text-black" />
                      )}
                    </div>
                    <p className={`text-[10px] ${themeMode === "light" ? "text-slate-700" : "text-slate-400"}`}>
                      {t("settings.theme_light_desc", "Warm parchment paper with crisp pixel borders.")}
                    </p>
                  </div>

                  {/* System Mode */}
                  <div
                    onClick={() => handleApplyTheme("system")}
                    className={`border-2 p-3 cursor-pointer transition-none ${
                      themeMode === "system"
                        ? "border-retro-amber bg-retro-ink shadow-pixel-sm"
                        : "border-black bg-retro-coal hover:border-retro-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-retro-mint" />
                        <span className="font-pixel text-[11px] text-white">
                          {t("settings.theme_system", "System / OS Auto")}
                        </span>
                      </div>
                      {themeMode === "system" && (
                        <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t("settings.theme_system_desc", "Follows your operating system dark/light mode preference.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Language Settings */}
              <div>
                <label className="block text-[11px] font-pixel text-retro-amber mb-2 uppercase">
                  {t("settings.lang_title", "System Language (i18n)")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* English */}
                  <div
                    onClick={() => setLanguage("en")}
                    className={`border-2 p-3 cursor-pointer transition-none ${
                      language === "en"
                        ? "border-retro-amber bg-retro-ink shadow-pixel-sm"
                        : "border-black bg-retro-coal hover:border-retro-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇬🇧</span>
                        <span className="font-pixel text-[11px] text-white">
                          {t("settings.lang_en", "English (Default)")}
                        </span>
                      </div>
                      {language === "en" && (
                        <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t("settings.lang_en_desc", "Standard global developer terminology.")}
                    </p>
                  </div>

                  {/* Indonesian */}
                  <div
                    onClick={() => setLanguage("id")}
                    className={`border-2 p-3 cursor-pointer transition-none ${
                      language === "id"
                        ? "border-retro-amber bg-retro-ink shadow-pixel-sm"
                        : "border-black bg-retro-coal hover:border-retro-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇮🇩</span>
                        <span className="font-pixel text-[11px] text-white">
                          {t("settings.lang_id", "Bahasa Indonesia")}
                        </span>
                      </div>
                      {language === "id" && (
                        <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t("settings.lang_id_desc", "Terjemahan lengkap konsol TheGate.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & AUTH */}
          {activeTab === "security" && (
            <div className="space-y-4">
              {/* Default Password Alert */}
              {isDefaultPassword ? (
                <div className="border-2 border-red-500 bg-red-950/40 p-3.5 flex items-start gap-3 text-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-pixel text-[11px] text-red-400">
                      {t("settings.default_pass_badge", "DEFAULT PASS ACTIVE (12345678)")}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {t(
                        "auth.default_warning",
                        "Warning: Running on default password '12345678'. Please update it for production security."
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-retro-mint bg-retro-mint/10 p-3 flex items-center gap-3 text-retro-mint">
                  <CheckCircle2 className="h-5 w-5 text-retro-mint shrink-0" />
                  <div>
                    <div className="font-pixel text-[11px]">CUSTOM PASSWORD ENFORCED</div>
                    <p className="text-[10px] text-slate-300">
                      Console protected with PBKDF2-HMAC-SHA256 salted hash.
                    </p>
                  </div>
                </div>
              )}

              {/* Password Action Card */}
              <div className="border-2 border-black bg-retro-coal p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-retro-amber" />
                    <span className="font-pixel text-[11px] text-white">
                      {t("settings.password_title", "Console Access Password")}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setIsChangePasswordOpen(true);
                    }}
                    className="border-2 border-black bg-retro-amber px-3 py-1 font-pixel text-[10px] text-black font-bold shadow-pixel-xs hover:bg-amber-400 transition-none cursor-pointer"
                  >
                    {t("settings.change_password_btn", "CHANGE PASSWORD")}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {t(
                    "settings.password_desc",
                    "Password used to unlock gateway control room. Default is 12345678."
                  )}
                </p>
              </div>

              {/* Session Lockout */}
              <div className="border-2 border-black bg-retro-coal p-4 flex items-center justify-between">
                <div>
                  <div className="font-pixel text-[11px] text-white">Console Session Lock</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Immediately revoke session token and return to authentication screen.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="flex items-center gap-1.5 border-2 border-black bg-red-600 px-3 py-1.5 font-pixel text-[10px] text-white font-bold shadow-pixel-xs hover:bg-red-700 transition-none cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{t("settings.lock_session_btn", "LOCK CONSOLE SESSION")}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GATEWAY POLICIES */}
          {activeTab === "gateway" && (
            <div className="space-y-4">
              {/* Privacy Mode Policy */}
              <div className="border-2 border-black bg-retro-coal p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-retro-mint" />
                    <span className="font-pixel text-[11px] text-white">
                      {t("settings.privacy_title", "Privacy Mode: Zero-Log Policy")}
                    </span>
                  </div>
                  <PixelBadge variant="mint" size="xs">
                    ZERO-LOG PERSISTENCE
                  </PixelBadge>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t(
                    "settings.privacy_desc",
                    "TheGate strictly enforces zero prompt or completion persistence. Your proprietary prompts and completions are never stored to SQLite or logs."
                  )}
                </p>
                <div className="mt-2 border border-black bg-retro-ink p-2 text-[10px] text-slate-400">
                  <div className="font-bold text-retro-paper mb-1">Audited Telemetry (Recorded):</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Token counts (prompt_tokens & completion_tokens)</li>
                    <li>Time-to-first-token (TTFT) and total latency (ms)</li>
                    <li>Selected model routing decisions & verified cost ($)</li>
                  </ul>
                </div>
              </div>

              {/* Sentinel Watchdog */}
              <div className="border-2 border-black bg-retro-coal p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-retro-amber" />
                    <span className="font-pixel text-[11px] text-white">
                      {t("settings.sentinel_title", "Sentinel & Failover Watchdog")}
                    </span>
                  </div>
                  <PixelBadge variant="amber" size="xs">
                    SLA &lt;650ms ARMED
                  </PixelBadge>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t(
                    "settings.sentinel_desc",
                    "Monitors upstream latency (<650ms SLA). Transparently fails over to secondary models if upstream fails before first stream token."
                  )}
                </p>
              </div>

              {/* Downstream Router Ingress */}
              <div className="border-2 border-black bg-retro-coal p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-retro-blue" />
                    <span className="font-pixel text-[11px] text-white">
                      {t("settings.active_router_title", "Downstream Router Ingress")}
                    </span>
                  </div>
                  <PixelBadge variant="cyan" size="xs">
                    ONLINE (PORT 8001)
                  </PixelBadge>
                </div>
                <div className="text-[10px] text-slate-400">
                  Currently connected to:{" "}
                  <span className="text-retro-amber font-mono font-bold">
                    http://localhost:20128/v1 (9Router)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SPONSORSHIP & DONATION HANDLES */}
          {activeTab === "sponsorship" && (
            <div className="space-y-4">
              <div className="border border-pink-500/40 bg-pink-950/30 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400 fill-pink-500" />
                  <span className="font-pixel text-[11px] text-pink-300 uppercase">
                    Configure Open-Source Donation Handles
                  </span>
                </div>
                <p className="text-[11px] text-retro-paper">
                  Set your custom Saweria (Indonesia/QRIS) or PayPal (International) receiving details. These handles are displayed when visitors click the Donate button.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-retro-paper font-bold block">
                    🇮🇩 Saweria URL (QRIS & Indo E-Wallets):
                  </label>
                  <input
                    type="url"
                    value={donationConfig.saweriaUrl}
                    onChange={(e) => setDonationConfig({ ...donationConfig, saweriaUrl: e.target.value })}
                    className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                    placeholder="https://saweria.co/fikalalif26"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-retro-paper font-bold block">
                    🌍 PayPal Payment / QR URL:
                  </label>
                  <input
                    type="url"
                    value={donationConfig.paypalUrl}
                    onChange={(e) => setDonationConfig({ ...donationConfig, paypalUrl: e.target.value })}
                    className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                    placeholder="https://www.paypal.com/qrcodes/p2pqrc/..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-retro-paper font-bold block">
                    🌍 PayPal Account Name:
                  </label>
                  <input
                    type="text"
                    value={donationConfig.paypalName}
                    onChange={(e) => setDonationConfig({ ...donationConfig, paypalName: e.target.value })}
                    className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                    placeholder="fikal alif"
                  />
                </div>
              </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      saveDonationConfig(donationConfig);
                      setDonateSaveStatus(true);
                      setTimeout(() => setDonateSaveStatus(false), 2000);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 font-pixel text-[10px] border-2 border-black bg-retro-amber text-black font-bold hover:bg-amber-400 transition-none cursor-pointer shadow-pixel-xs"
                  >
                    {donateSaveStatus ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>CONFIG SAVED!</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>SAVE DONATION HANDLES</span>
                      </>
                    )}
                  </button>
                </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t-2 border-black bg-retro-ink px-4 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-retro-mint" />
            <span>TheGate v1.0.0-rc1</span>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-black bg-retro-coal px-4 py-1 font-pixel text-xs text-retro-paper hover:bg-retro-sand hover:text-black transition-none cursor-pointer"
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
