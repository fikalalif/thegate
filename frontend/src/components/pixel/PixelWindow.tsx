"use client";

import React from "react";
import { X, Minus, Square } from "lucide-react";

interface PixelWindowProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  variant?: "dark" | "amber" | "cream";
}

export function PixelWindow({
  title,
  icon,
  children,
  onClose,
  className = "",
  variant = "dark",
}: PixelWindowProps) {
  const windowStyles = {
    dark: "bg-retro-plum border-2 border-black text-retro-cream shadow-pixel-lg",
    amber: "bg-retro-night border-2 border-retro-amber text-retro-cream shadow-pixel-amber",
    cream: "bg-retro-cream border-2 border-black text-retro-night shadow-pixel-lg",
  }[variant];

  const titleStyles = {
    dark: "bg-retro-ink text-retro-amber border-b-2 border-black",
    amber: "bg-retro-amber text-black border-b-2 border-black",
    cream: "bg-retro-paper text-retro-night border-b-2 border-black",
  }[variant];

  return (
    <div className={`relative flex flex-col overflow-hidden select-none ${windowStyles} ${className}`}>
      {/* Title Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${titleStyles}`}>
        <div className="flex items-center gap-2">
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          <span className="font-pixel text-[10px] uppercase tracking-wide truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center border border-black bg-retro-night text-retro-cream hover:bg-slate-700 active:translate-x-[1px] active:translate-y-[1px]"
            aria-label="Minimize"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center border border-black bg-retro-night text-retro-cream hover:bg-slate-700 active:translate-x-[1px] active:translate-y-[1px]"
            aria-label="Maximize"
          >
            <Square className="h-2 w-2" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-4 w-4 items-center justify-center border border-black bg-retro-coral text-white hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px]"
              aria-label="Close"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">{children}</div>
    </div>
  );
}
