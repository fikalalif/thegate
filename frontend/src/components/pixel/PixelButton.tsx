"use client";

import React from "react";

export type PixelButtonVariant = "amber" | "mint" | "coral" | "plum" | "cream" | "ghost";
export type PixelButtonSize = "xs" | "sm" | "md" | "lg";

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PixelButtonVariant;
  size?: PixelButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PixelButton({
  variant = "amber",
  size = "md",
  children,
  icon,
  className = "",
  disabled,
  ...props
}: PixelButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-mono font-bold tracking-tight select-none border-2 border-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-retro-amber disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

  const sizeStyles = {
    xs: "px-2 py-0.5 text-[10px] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
    sm: "px-2.5 py-1 text-xs shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
    md: "px-4 py-2 text-xs shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    lg: "px-5 py-2.5 text-sm shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  }[size];

  const variantStyles = {
    amber:
      "bg-retro-amber text-black hover:bg-[#ffc338] shadow-[3px_3px_0px_#000]",
    mint:
      "bg-retro-mint text-black hover:bg-[#85e5b0] shadow-[3px_3px_0px_#000]",
    coral:
      "bg-retro-coral text-white hover:bg-[#f38085] shadow-[3px_3px_0px_#000]",
    plum:
      "bg-retro-plum text-retro-cream hover:bg-[#352c46] border-black shadow-[3px_3px_0px_#000]",
    cream:
      "bg-retro-cream text-retro-night hover:bg-[#fff0d6] shadow-[3px_3px_0px_#000]",
    ghost:
      "bg-transparent text-slate-300 hover:bg-retro-plum hover:text-white border-dashed border-slate-600 shadow-none",
  }[variant];

  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
