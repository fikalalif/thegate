"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ShieldCheck,
  Zap,
  Radio,
  Sun,
  Moon,
  Laptop,
  Globe,
  KeyRound,
  Lock,
  Menu,
  Settings,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useMobileNav } from "@/lib/nav";
import { SettingsModal } from "@/components/settings/SettingsModal";

type ThemeMode = "system" | "light" | "dark";

export function Header() {
  const { language, setLanguage, t } = useI18n();
  const { setIsChangePasswordOpen, logout, isDefaultPassword } = useAuth();
  const { toggle: toggleMobileNav } = useMobileNav();

  const [selectedTenant, setSelectedTenant] = useState("all");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Clean up any legacy stuck key
    try {
      localStorage.removeItem("thegate-theme");
    } catch {}

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveAndApply = (mode: ThemeMode) => {
      let activeDark = false;
      if (mode === "dark") {
        activeDark = true;
      } else if (mode === "light") {
        activeDark = false;
      } else {
        // OS preference
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

    const savedMode = (localStorage.getItem("thegate-theme-mode") as ThemeMode) || "system";
    resolveAndApply(savedMode);

    const handleOSChange = () => {
      const currentMode = (localStorage.getItem("thegate-theme-mode") as ThemeMode) || "system";
      if (currentMode === "system") {
        resolveAndApply("system");
        window.dispatchEvent(
          new CustomEvent("themechange", { detail: { theme: mediaQuery.matches ? "dark" : "light", mode: "system" } })
        );
      }
    };

    const handleExternalChange = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.mode) {
        setThemeMode(customEvt.detail.mode);
        setIsDark(customEvt.detail.theme === "dark");
      } else if (customEvt.detail?.theme) {
        setIsDark(customEvt.detail.theme === "dark");
      }
    };

    mediaQuery.addEventListener("change", handleOSChange);
    window.addEventListener("themechange", handleExternalChange);

    return () => {
      mediaQuery.removeEventListener("change", handleOSChange);
      window.removeEventListener("themechange", handleExternalChange);
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

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b-2 border-black bg-retro-plum px-2.5 sm:px-6 text-retro-cream shadow-pixel-sm select-none">
        {/* Left cluster metadata */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile Hamburger Drawer Toggle */}
          <button
            onClick={toggleMobileNav}
            className="flex lg:hidden h-8 w-8 items-center justify-center border-2 border-black bg-retro-night text-retro-amber shadow-pixel-xs hover:bg-retro-ink transition-none cursor-pointer shrink-0"
            title="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-pixel text-xs sm:text-sm text-white tracking-wider">
              The<span className="text-retro-amber">Gate</span>
            </span>
            <span className="hidden sm:inline font-pixel text-[11px] text-slate-300">
              EDGE GATEWAY
            </span>
            <div className="hidden sm:inline-flex">
              <PixelBadge variant="amber" size="xs">
                CLUSTER-01
              </PixelBadge>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 border-l-2 border-retro-ink pl-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Sentinel:</span>
              <span className="text-retro-mint font-bold">&lt; 650ms</span>
            </div>
            <div className="text-slate-500">|</div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Prefix Cache:</span>
              <span className="text-retro-amber font-bold">90.4% HIT</span>
            </div>
          </div>
        </div>

        {/* Right status & controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Switcher (EN default | ID) */}
          <div className="flex items-center border-2 border-black bg-retro-night p-0.5 shadow-pixel-xs shrink-0">
            <Globe className="h-3 w-3 text-retro-amber ml-1 mr-0.5 hidden sm:inline" />
            <button
              onClick={() => setLanguage("en")}
              className={`px-1.5 py-0.5 font-pixel text-[9px] sm:text-[10px] transition-none cursor-pointer ${
                language === "en"
                  ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="English (Default)"
            >
              EN
            </button>
            <span className="text-slate-600 text-[10px] mx-0.5">|</span>
            <button
              onClick={() => setLanguage("id")}
              className={`px-1.5 py-0.5 font-pixel text-[9px] sm:text-[10px] transition-none cursor-pointer ${
                language === "id"
                  ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Bahasa Indonesia"
            >
              ID
            </button>
          </div>

          {/* Day / Night Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="flex items-center justify-center h-8 px-2 sm:px-2.5 border-2 border-black bg-retro-night font-pixel text-[10px] text-retro-amber shadow-pixel-xs hover:bg-retro-sand hover:text-black transition-none cursor-pointer shrink-0"
            title={
              themeMode === "system"
                ? `Theme: Auto (${isDark ? "Dark" : "Light"}). Click to switch.`
                : themeMode === "light"
                ? "Theme: Light. Click to switch to Dark."
                : "Theme: Dark. Click to switch to Auto (OS)."
            }
          >
            {themeMode === "system" ? (
              <>
                <Laptop className="h-3.5 w-3.5 text-retro-amber" />
                <span className="hidden md:inline ml-1">AUTO</span>
              </>
            ) : themeMode === "light" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-retro-amber" />
                <span className="hidden md:inline ml-1">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-retro-blue" />
                <span className="hidden md:inline ml-1">DARK</span>
              </>
            )}
          </button>

          {/* Quick Settings Button (Includes Password, Theme, Router config) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="relative flex items-center justify-center h-8 px-2 sm:px-2.5 border-2 border-black bg-retro-night font-pixel text-[10px] text-retro-cream shadow-pixel-xs hover:bg-retro-sand hover:text-black transition-none cursor-pointer shrink-0"
            title="System Settings"
          >
            <Settings className="h-3.5 w-3.5 text-retro-paper" />
            <span className="hidden lg:inline ml-1">SETTINGS</span>
            {isDefaultPassword && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Change Password Button (Tablets & Desktops) */}
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="relative hidden md:flex items-center gap-1 border-2 border-black bg-retro-night text-retro-cream px-2 py-1 font-pixel text-[10px] shadow-pixel-xs hover:bg-retro-sand hover:text-black transition-none cursor-pointer shrink-0"
            title={isDefaultPassword ? "Default password in use! Click to change." : "Change console access password"}
          >
            <KeyRound className="h-3 w-3 text-retro-amber" />
            <span>{t("header.change_password")}</span>
            {isDefaultPassword && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Lock / Logout Button (Tablets & Desktops) */}
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-1 border-2 border-black bg-retro-night text-retro-cream px-2 py-1 font-pixel text-[10px] shadow-pixel-xs hover:bg-red-700 hover:text-white transition-none cursor-pointer shrink-0"
            title="Lock console session"
          >
            <Lock className="h-3 w-3 text-red-400" />
            <span>{t("header.logout")}</span>
          </button>

          {/* Multi-Tenant Filter */}
          <div className="relative hidden xl:block">
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="appearance-none border-2 border-black bg-retro-night py-1 pl-3 pr-8 font-mono text-xs text-retro-cream shadow-pixel-sm focus:border-retro-amber focus:outline-none cursor-pointer"
            >
              <option value="all">{t("header.tenant_all")}</option>
              <option value="finance">{t("header.tenant_finance")}</option>
              <option value="support">{t("header.tenant_support")}</option>
              <option value="code">{t("header.tenant_code")}</option>
              <option value="rag">{t("header.tenant_rag")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-retro-amber" />
          </div>

          {/* Port Status */}
          <div className="hidden sm:block">
            <PixelBadge variant="mint" size="sm">
              PORT: 8001
            </PixelBadge>
          </div>
        </div>
      </header>

      {/* Global Settings Modal Triggered from Header */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
