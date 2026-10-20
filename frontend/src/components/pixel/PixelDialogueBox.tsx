"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, ArrowRight, X } from "lucide-react";
import { PixelButton } from "./PixelButton";

interface PixelDialogueBoxProps {
  speakerName: string;
  speakerRole?: string;
  speakerAvatar?: React.ReactNode;
  dialogueText: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "amber" | "mint" | "coral" | "plum" | "cream";
    icon?: React.ReactNode;
  }>;
  onDismiss?: () => void;
  className?: string;
  isStreaming?: boolean;
}

export function PixelDialogueBox({
  speakerName,
  speakerRole,
  speakerAvatar,
  dialogueText,
  actions = [],
  onDismiss,
  className = "",
  isStreaming = false,
}: PixelDialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index <= dialogueText.length) {
        setDisplayedText(dialogueText.slice(0, index));
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [dialogueText]);

  // Click to reveal all instantly
  const handleBoxClick = () => {
    if (isTyping) {
      setDisplayedText(dialogueText);
      setIsTyping(false);
    }
  };

  return (
    <div
      onClick={handleBoxClick}
      className={`relative flex flex-col md:flex-row gap-4 border-2 border-black bg-retro-cream p-4 text-retro-night shadow-pixel-lg cursor-pointer ${className}`}
    >
      {/* Speaker Avatar / Portrait */}
      <div className="flex shrink-0 items-start">
        <div className="relative flex h-16 w-16 md:h-20 md:w-20 items-center justify-center border-2 border-black bg-retro-paper shadow-pixel-sm overflow-hidden">
          {speakerAvatar || (
            <div className="flex h-full w-full items-center justify-center bg-retro-ink text-retro-amber font-pixel text-xs">
              AI
            </div>
          )}
          {isStreaming && (
            <span className="absolute bottom-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-retro-mint opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-retro-mint" />
            </span>
          )}
        </div>
      </div>

      {/* Dialogue Content */}
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          {/* Name Tag */}
          <div className="flex items-center justify-between mb-1">
            <div className="inline-flex items-center gap-2 border-2 border-black bg-retro-night px-2.5 py-1 text-retro-amber shadow-pixel-sm">
              <span className="font-pixel text-xs uppercase tracking-wider">
                {speakerName}
              </span>
              {speakerRole && (
                <span className="font-sans text-xs font-semibold text-retro-paper">
                  | {speakerRole}
                </span>
              )}
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="flex h-5 w-5 items-center justify-center border border-black bg-retro-paper text-retro-night hover:bg-retro-coral hover:text-white"
                aria-label="Dismiss dialogue"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Dialogue Message */}
          <div className="font-sans text-sm md:text-base leading-relaxed text-retro-night font-semibold min-h-[48px]">
            <span>{displayedText}</span>
            {isTyping && <span className="retro-cursor" />}
          </div>
        </div>

        {/* Action Options */}
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-retro-paper">
            {actions.map((act, i) => (
              <PixelButton
                key={i}
                size="sm"
                variant={act.variant || "amber"}
                icon={act.icon}
                onClick={(e) => {
                  e.stopPropagation();
                  act.onClick();
                }}
              >
                {act.label}
              </PixelButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
