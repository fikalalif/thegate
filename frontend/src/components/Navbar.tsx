"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Layers,
  Database,
  Sliders,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Overview", icon: Activity },
    { href: "/requests", label: "Request Logs", icon: Layers },
    { href: "/policies", label: "Policies", icon: Sliders },
    { href: "/models", label: "Models & Pricing", icon: Database },
    { href: "/playground", label: "Interactive Playground", icon: PlayCircle, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-mono shadow-md shadow-blue-500/20">
              G
            </span>
            <span>The<span className="text-blue-500">Gate</span></span>
            <span className="rounded bg-blue-950/80 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-800/60">
              Dev
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700"
                      : link.highlight
                      ? "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30 font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${link.highlight && !isActive ? "text-blue-400" : ""}`} />
                  {link.label}
                  {link.highlight && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Zero Prompt Persistence (Privacy On)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-md px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Gateway: 4848
          </div>
        </div>
      </div>
    </header>
  );
}
