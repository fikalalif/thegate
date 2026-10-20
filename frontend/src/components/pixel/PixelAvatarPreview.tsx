"use client";

import React from "react";

export function PixelAvatarPreview({
  hairColor,
  shirtColor,
  tieColor,
  hasGlasses,
  hasHeadset,
  size = "md",
}: {
  hairColor: string;
  shirtColor: string;
  tieColor?: string | null;
  hasGlasses?: boolean;
  hasHeadset?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const scale = size === "sm" ? 2 : size === "lg" ? 4 : 3;
  const w = 16 * scale;
  const h = 24 * scale;

  return (
    <div
      className="relative border-2 border-black bg-retro-night flex items-center justify-center p-2 shadow-pixel-sm shrink-0"
      style={{ width: `${w + 14}px`, height: `${h + 14}px` }}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 16 24"
        className="shape-rendering-crispEdges"
      >
        {/* Headset band */}
        {hasHeadset && <rect x="3" y="1" width="10" height="2" fill="#F59E0B" />}
        {hasHeadset && <rect x="2" y="2" width="2" height="6" fill="#F59E0B" />}
        {hasHeadset && <rect x="12" y="2" width="2" height="6" fill="#F59E0B" />}

        {/* Hair */}
        <rect x="3" y="2" width="10" height="4" fill={hairColor || "#4B2E1E"} />
        <rect x="2" y="3" width="2" height="4" fill={hairColor || "#4B2E1E"} />

        {/* Face */}
        <rect x="3" y="5" width="10" height="9" fill="#F6D5B8" />

        {/* Eyes */}
        <rect x="5" y="8" width="2" height="2" fill="#111827" />
        <rect x="9" y="8" width="2" height="2" fill="#111827" />

        {/* Glasses */}
        {hasGlasses && (
          <>
            <rect x="4" y="7" width="4" height="4" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <rect x="8" y="7" width="4" height="4" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <line x1="7" y1="9" x2="9" y2="9" stroke="#38BDF8" strokeWidth="1" />
          </>
        )}

        {/* Shirt / Torso */}
        <rect x="2" y="14" width="12" height="6" fill={shirtColor || "#2B5278"} stroke="#111827" strokeWidth="0.5" />

        {/* Tie */}
        {tieColor && (
          <polygon
            points="7.5,14 8.5,14 9,18 7.5,19 7,18"
            fill={tieColor}
          />
        )}

        {/* Pants & Shoes */}
        <rect x="4" y="20" width="3" height="4" fill="#1E293B" />
        <rect x="9" y="20" width="3" height="4" fill="#1E293B" />
      </svg>
    </div>
  );
}
