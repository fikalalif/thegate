"use client";

import React from "react";

export type PixelBadgeVariant = "amber" | "mint" | "coral" | "blue" | "plum" | "cream" | "slate" | "cyan";

interface PixelBadgeProps {
  children: React.ReactNode;
  variant?: PixelBadgeVariant;
  size?: "xs" | "sm";
  icon?: React.ReactNode;
  className?: string;
}

export function PixelBadge({
  children,
  variant = "amber",
  size = "sm",
  icon,
  className = "",
}: PixelBadgeProps) {
  const sizeStyles = {
    xs: "px-1.5 py-0.5 text-[9px]",
    sm: "px-2 py-0.5 text-[10px]",
  }[size];

  const variantStyles = {
    amber: "bg-retro-amber text-black border-black",
    mint: "bg-retro-mint text-black border-black",
    coral: "bg-retro-coral text-white border-black",
    blue: "bg-retro-blue text-black border-black",
    cyan: "bg-retro-cyan text-black border-black",
    plum: "bg-retro-plum text-retro-cream border-black",
    cream: "bg-retro-cream text-retro-night border-black",
    slate: "bg-retro-ink text-slate-300 border-black",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider border-2 shadow-[1px_1px_0px_#000] select-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
