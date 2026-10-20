"use client";

import React from "react";

interface PixelPanelProps {
  title?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  variant?: "dark" | "cream" | "amber" | "mint";
  className?: string;
  headerRight?: React.ReactNode;
}

export function PixelPanel({
  title,
  icon,
  badge,
  children,
  variant = "dark",
  className = "",
  headerRight,
}: PixelPanelProps) {
  const panelBg = {
    dark: "bg-retro-plum text-retro-cream border-2 border-black shadow-pixel",
    cream: "bg-retro-cream text-retro-night border-2 border-black shadow-pixel",
    amber: "bg-retro-night text-retro-cream border-2 border-retro-amber shadow-pixel-amber",
    mint: "bg-retro-night text-retro-cream border-2 border-retro-mint shadow-pixel-mint",
  }[variant];

  const headerBg = {
    dark: "bg-retro-ink border-b-2 border-black text-retro-amber",
    cream: "bg-retro-paper border-b-2 border-black text-retro-night",
    amber: "bg-retro-amber text-black border-b-2 border-black",
    mint: "bg-retro-mint text-black border-b-2 border-black",
  }[variant];

  return (
    <div className={`flex flex-col relative overflow-hidden ${panelBg} ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between px-3 py-2 select-none ${headerBg}`}
        >
          <div className="flex items-center gap-2">
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            <span className="font-pixel text-[11px] uppercase tracking-wide">
              {title}
            </span>
            {badge && <span>{badge}</span>}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
