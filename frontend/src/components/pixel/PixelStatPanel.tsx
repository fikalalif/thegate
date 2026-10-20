"use client";

import React from "react";

interface PixelStatPanelProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: "amber" | "mint" | "blue" | "coral" | "plum";
  className?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
}

export function PixelStatPanel({
  label,
  value,
  subtext,
  icon,
  variant = "amber",
  className = "",
  trend,
}: PixelStatPanelProps) {
  const borderColors = {
    amber: "border-retro-amber",
    mint: "border-retro-mint",
    blue: "border-retro-blue",
    coral: "border-retro-coral",
    plum: "border-black",
  }[variant];

  const valueColors = {
    amber: "text-retro-amber",
    mint: "text-retro-mint",
    blue: "text-retro-blue",
    coral: "text-retro-coral",
    plum: "text-retro-cream",
  }[variant];

  return (
    <div
      className={`relative flex flex-col justify-between border-2 bg-retro-night p-3 shadow-pixel ${borderColors} ${className}`}
    >
      {/* Header with Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[10px] uppercase tracking-wider text-retro-paper font-bold truncate">
          {label}
        </span>
        {icon && <span className="text-retro-paper shrink-0">{icon}</span>}
      </div>

      {/* Primary Value */}
      <div className="my-1.5 flex items-baseline gap-2">
        <span className={`font-mono text-2xl font-bold tracking-tight ${valueColors}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`font-mono text-xs font-bold ${
              trend.positive ? "text-retro-mint" : "text-retro-coral"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <div className="font-sans text-xs font-medium text-slate-300 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
}
