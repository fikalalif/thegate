"use client";

import React from "react";

interface PixelProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  valueLabel?: string;
  variant?: "amber" | "mint" | "coral" | "blue";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PixelProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  variant = "amber",
  size = "md",
  className = "",
}: PixelProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightStyles = {
    sm: "h-2",
    md: "h-3.5",
    lg: "h-5",
  }[size];

  const fillColors = {
    amber: "bg-retro-amber",
    mint: "bg-retro-mint",
    coral: "bg-retro-coral",
    blue: "bg-retro-blue",
  }[variant];

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between text-[10px] font-mono">
          {label && <span className="text-slate-400 uppercase tracking-wider">{label}</span>}
          {valueLabel && (
            <span className="font-bold text-retro-cream">{valueLabel}</span>
          )}
        </div>
      )}
      {/* Outer 8-bit trough */}
      <div
        className={`w-full overflow-hidden border-2 border-black bg-retro-night p-0.5 shadow-pixel-sm ${heightStyles}`}
      >
        {/* Inner stepped fill */}
        <div
          className={`h-full transition-all duration-300 ${fillColors}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
