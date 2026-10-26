"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useMobileNav } from "@/lib/nav";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { DonationModal } from "@/components/donate/DonationModal";
import {
  Activity,
  Layers,
  Database,
  Sliders,
  DollarSign,
  Cpu,
  FlaskConical,
  PlayCircle,
  ShieldCheck,
  Server,
  Zap,
  Briefcase,
  Gamepad2,
  Settings,
  Lock,
  X,
  Heart,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isDefaultPassword, logout } = useAuth();
  const { isOpen: isMobileOpen, close: closeMobileNav } = useMobileNav();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);

  const navigation = [
    { name: t("sidebar.pixel_office"), href: "/office", icon: Gamepad2, badge: "16-Bit", highlight: "World" },
    { name: t("sidebar.command_center"), href: "/", icon: Activity, badge: "Live" },
    { name: t("sidebar.workforce"), href: "/workforce", icon: Briefcase, badge: "Desk" },
    { name: t("sidebar.workloads"), href: "/workloads", icon: Cpu, badge: "4 Active" },
    { name: t("sidebar.live_activity"), href: "/requests", icon: Layers, badge: "Traces" },
    { name: t("sidebar.routing_policies"), href: "/policies", icon: Sliders },
    { name: t("sidebar.models_providers"), href: "/providers", icon: Server },
    { name: t("sidebar.cost_intelligence"), href: "/costs", icon: DollarSign, highlight: "-84%" },
    { name: t("sidebar.optimization_lab"), href: "/optimization", icon: FlaskConical, badge: "Canary" },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r-2 border-black bg-retro-plum text-retro-cream shadow-pixel-lg select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b-2 border-black bg-retro-ink px-4">
          <Link href="/" onClick={closeMobileNav} className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center border-2 border-black bg-retro-night shadow-pixel-sm overflow-hidden">
              <img
                src="/thegate-metaicon.png"
                alt="TheGate Meta Icon"
                className="h-full w-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="radar-beacon absolute inline-flex h-full w-full rounded-full bg-retro-mint opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-retro-mint" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[15px] tracking-wider text-white">
                  The<span className="text-retro-amber">Gate</span>
                </span>
              </div>
              <div className="text-[9px] font-pixel text-slate-400 mt-0.5">{t("sidebar.brand_subtitle")}</div>
            </div>
          </Link>

          {/* Mobile Drawer Close Button */}
          <button
            onClick={closeMobileNav}
            className="flex lg:hidden h-8 w-8 items-center justify-center border-2 border-black bg-retro-coal text-retro-paper hover:bg-red-600 hover:text-white transition-none cursor-pointer"
            title="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-3 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-pixel font-bold uppercase tracking-wider text-retro-paper">
          {t("sidebar.modules")}
        </div>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMobileNav}
              className={`group flex items-center justify-between px-3 py-2 text-xs font-sans font-bold transition-all ${
                isActive
                  ? "border-2 border-black bg-retro-amber text-black shadow-pixel-sm"
                  : "border-2 border-transparent text-slate-200 hover:border-black hover:bg-retro-ink hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-black" : "text-retro-paper group-hover:text-retro-amber"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`border border-black px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    isActive
                      ? "bg-black text-retro-amber"
                      : "bg-retro-night text-retro-paper"
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {item.highlight && (
                <span
                  className={`border border-black px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    isActive
                      ? "bg-black text-retro-mint"
                      : "bg-retro-mint text-black"
                  }`}
                >
                  {item.highlight}
                </span>
              )}
            </Link>
          );
        })}

        {/* Verification Sub-States & Testing */}
        <div className="pt-4 px-2 pb-1.5 text-[10px] font-pixel font-bold uppercase tracking-wider text-retro-paper">
          Testing
        </div>
        <Link
          href="/playground"
          onClick={closeMobileNav}
          className={`group flex items-center justify-between px-3 py-2 text-xs font-sans font-bold transition-all ${
            pathname === "/playground"
              ? "border-2 border-black bg-retro-mint text-black shadow-pixel-sm"
              : "border-2 border-transparent text-slate-200 hover:border-black hover:bg-retro-ink hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <PlayCircle
              className={`h-4 w-4 ${
                pathname === "/playground" ? "text-black" : "text-retro-mint"
              }`}
            />
            <span>Live Playground</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-retro-mint animate-pulse" />
        </Link>
      </nav>

      {/* Operator & Settings Control Footer */}
      <div className="border-t-2 border-black bg-retro-night p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-7 w-7 items-center justify-center border border-black bg-retro-ink font-pixel text-[10px] text-retro-amber shadow-pixel-xs">
              OP
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-retro-mint opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-retro-mint" />
              </span>
            </div>
            <div>
              <div className="font-pixel text-[10px] text-white">
                {t("settings.operator", "CONSOLE OPERATOR")}
              </div>
              <div className="font-mono text-[9px] text-retro-mint font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-retro-mint" />
                {t("settings.admin_active", "ONLINE (ADMIN)")}
              </div>
            </div>
          </div>
          {isDefaultPassword && (
            <span
              className="border border-red-500 bg-red-950/80 px-1.5 py-0.5 font-pixel text-[8px] text-red-300 animate-pulse"
              title="Running on default password (12345678)"
            >
              DEFAULT PASS
            </span>
          )}
        </div>

        {/* Support / Sponsor Open-Source Button */}
        <button
          onClick={() => {
            setIsDonateOpen(true);
            closeMobileNav();
          }}
          className="w-full flex items-center justify-between border-2 border-black bg-gradient-to-r from-[#291738] to-[#3B1738] px-2.5 py-1.5 font-pixel text-[10px] text-pink-300 shadow-pixel-xs hover:border-pink-400 hover:text-white transition-none cursor-pointer group"
          title="Support TheGate open-source development (Trakteer, QRIS, GitHub, BMC)"
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-500 group-hover:scale-110 transition-transform shrink-0" />
            <span className="tracking-wide truncate">{t("sidebar.support_dev", "SUPPORT THEGATE")}</span>
          </div>
          <span className="border border-pink-400/40 bg-pink-950/60 px-1.5 py-0.5 font-mono text-[8px] text-pink-200 uppercase font-bold shrink-0">
            ❤️ DONATE
          </span>
        </button>

        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          <button
            onClick={() => {
              setIsSettingsOpen(true);
              closeMobileNav();
            }}
            className="col-span-4 flex items-center justify-center gap-1.5 border-2 border-black bg-retro-coal px-2 py-1.5 font-pixel text-[10px] text-retro-cream shadow-pixel-xs hover:bg-retro-amber hover:text-black transition-none cursor-pointer"
            title="Open system settings (Theme, Language, Password, Policies)"
          >
            <Settings className="h-3.5 w-3.5 text-retro-amber" />
            <span>{t("settings.sidebar_btn", "SETTINGS")}</span>
          </button>

          <button
            onClick={logout}
            className="col-span-1 flex items-center justify-center border-2 border-black bg-retro-coal p-1.5 text-retro-paper hover:bg-red-600 hover:text-white transition-none cursor-pointer"
            title="Lock console session"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>

    {/* Modals rendered outside <aside> to escape sidebar CSS transform containment */}
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
    />

    <DonationModal
      isOpen={isDonateOpen}
      onClose={() => setIsDonateOpen(false)}
      onOpenSettings={() => {
        setIsDonateOpen(false);
        setIsSettingsOpen(true);
      }}
    />
    </>
  );
}
