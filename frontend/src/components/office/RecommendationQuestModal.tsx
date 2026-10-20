"use client";

import React, { useState } from "react";
import { Sparkles, Check, ArrowRight, X, Compass, Cpu, DollarSign, Zap } from "lucide-react";
import { PixelWindow } from "@/components/pixel/PixelWindow";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelDialogueBox } from "@/components/pixel/PixelDialogueBox";
import { ModelRegistryItem } from "@/lib/api";

interface RecommendationQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelRegistryItem[];
  onApplyModel?: (modelId: string) => void;
}

interface PresetTask {
  title: string;
  category: "coding" | "reasoning" | "speed";
  prompt: string;
  recommendedModelId: string;
  characterName: string;
  characterRole: string;
  characterColor: string;
  rationale: string;
  alternatives: Array<{ modelId: string; reason: string }>;
}

export function RecommendationQuestModal({
  isOpen,
  onClose,
  models,
  onApplyModel,
}: RecommendationQuestModalProps) {
  if (!isOpen) return null;

  const presets: PresetTask[] = [
    {
      title: "Refactor TypeScript Codebase",
      category: "coding",
      prompt: "Refactor our legacy API endpoints to use strict TypeScript types, AST validation, and Zod schemas.",
      recommendedModelId: "claude-3-5-sonnet",
      characterName: "The Engineer",
      characterRole: "Lead Software Architect",
      characterColor: "#2B5278",
      rationale:
        "Based on your coding and AST validation requirements, Claude 3.5 Sonnet is the strongest candidate. It has verified high coding benchmarks, a 200,000 token context window, and exact JSON schema adherence.",
      alternatives: [
        { modelId: "gpt-4o", reason: "Capable reasoning, but higher cost ($5/MTok vs $3/MTok)." },
        { modelId: "gpt-4o-mini", reason: "Ultra-fast and cheap, but lacks the deep multi-file AST context." },
      ],
    },
    {
      title: "Complex Multi-Step Proofs & Analytics",
      category: "reasoning",
      prompt: "Analyze Q3 financial discrepancies across multimodal CSV tables, PDF receipts, and transaction logs.",
      recommendedModelId: "gpt-4o",
      characterName: "The Analyst",
      characterRole: "Senior Logic & Vision Specialist",
      characterColor: "#6B4C35",
      rationale:
        "Your task demands cross-modal reasoning and verifiable financial deduction. GPT-4o supports full multimodal OCR extraction with high deductive accuracy for complex tables.",
      alternatives: [
        { modelId: "claude-3-5-sonnet", reason: "Excellent alternative for pure data analysis and tools." },
        { modelId: "gpt-4o-mini", reason: "May hallucinate edge-case numbers in dense financial tables." },
      ],
    },
    {
      title: "High-Volume Customer Support Bot",
      category: "speed",
      prompt: "Answer FAQ tickets from mobile users in under 150ms with friendly polite tone at lowest possible cost.",
      recommendedModelId: "gpt-4o-mini",
      characterName: "The Sprinter",
      characterRole: "High-Throughput Responder",
      characterColor: "#36C98F",
      rationale:
        "For high-volume, latency-critical customer conversations, GPT-4o Mini is unbeatable: measured P95 TTFT is only 85ms and input pricing is just $0.15 per million tokens—yielding an estimated ~93% cost reduction!",
      alternatives: [
        { modelId: "claude-3-5-sonnet", reason: "Too expensive for simple FAQ chat responses." },
        { modelId: "gpt-4o", reason: "Excessive latency and cost for standard support queries." },
      ],
    },
  ];

  const [customTask, setCustomTask] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PresetTask>(presets[0]);
  const [confirmed, setConfirmed] = useState(false);

  // Evaluate custom task
  const handleEvaluateCustom = () => {
    const text = customTask.toLowerCase();
    if (text.includes("code") || text.includes("typescript") || text.includes("bug") || text.includes("refactor")) {
      setSelectedPreset(presets[0]);
    } else if (text.includes("math") || text.includes("proof") || text.includes("financial") || text.includes("image")) {
      setSelectedPreset(presets[1]);
    } else {
      setSelectedPreset(presets[2]);
    }
    setConfirmed(false);
  };

  const handleConfirmSelection = () => {
    setConfirmed(true);
    if (onApplyModel) {
      onApplyModel(selectedPreset.recommendedModelId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150">
        <PixelWindow
          title="Quest: Find The Right Model"
          icon={<Compass className="h-4 w-4 text-retro-amber" />}
          onClose={onClose}
          variant="dark"
        >
          <div className="space-y-4">
            {/* Mission Prompt Input */}
            <div>
              <label className="block font-pixel text-[10px] text-slate-300 uppercase mb-1.5">
                Describe Your AI Task or Workload:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="e.g. Refactor React components, or fast chatbot responses..."
                  className="flex-1 border-2 border-black bg-retro-night px-3 py-2 text-xs font-mono text-retro-cream focus:outline-none focus:border-retro-amber"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEvaluateCustom();
                  }}
                />
                <PixelButton
                  size="sm"
                  variant="amber"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  onClick={handleEvaluateCustom}
                >
                  Analyze
                </PixelButton>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block font-pixel text-[9px] text-slate-400 uppercase mb-1">
                Or Select A Mission Template:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p);
                      setConfirmed(false);
                    }}
                    className={`border-2 p-2 text-left transition-all ${
                      selectedPreset.title === p.title
                        ? "border-retro-amber bg-retro-night text-retro-amber shadow-pixel-sm"
                        : "border-black bg-retro-ink text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.category === "coding" && <Cpu className="h-3 w-3 text-retro-blue" />}
                      {p.category === "reasoning" && <Sparkles className="h-3 w-3 text-retro-coral" />}
                      {p.category === "speed" && <Zap className="h-3 w-3 text-retro-mint" />}
                      <span className="font-pixel text-[8px] uppercase">{p.category}</span>
                    </div>
                    <div className="font-mono text-[11px] font-bold line-clamp-1">{p.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* RPG Character Dialogue Recommendation */}
            <div className="pt-2">
              <span className="block font-pixel text-[9px] text-retro-amber uppercase mb-1.5">
                ★ Recommendation Dialogue:
              </span>
              <PixelDialogueBox
                speakerName={selectedPreset.characterName}
                speakerRole={selectedPreset.characterRole}
                speakerAvatar={
                  <div
                    className="flex h-full w-full items-center justify-center font-pixel text-base font-bold text-white"
                    style={{ backgroundColor: selectedPreset.characterColor }}
                  >
                    {selectedPreset.characterName.charAt(4) || "AI"}
                  </div>
                }
                dialogueText={selectedPreset.rationale}
                actions={[
                  {
                    label: confirmed
                      ? `✓ Confirmed: ${selectedPreset.recommendedModelId}`
                      : `Confirm & Route to ${selectedPreset.recommendedModelId}`,
                    variant: confirmed ? "mint" : "amber",
                    icon: <Check className="h-3.5 w-3.5" />,
                    onClick: handleConfirmSelection,
                  },
                ]}
              />
            </div>

            {/* Alternative Candidates */}
            <div className="border-t border-retro-ink pt-3">
              <span className="block font-pixel text-[9px] text-slate-400 uppercase mb-1.5">
                Alternative Model Trade-offs:
              </span>
              <div className="space-y-1.5">
                {selectedPreset.alternatives.map((alt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border border-black bg-retro-night/60 p-2 text-xs font-mono"
                  >
                    <span className="text-retro-cream font-bold">{alt.modelId}:</span>
                    <span className="text-slate-400 text-[11px] font-sans truncate max-w-[360px]">
                      {alt.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] font-mono text-slate-500">
                Evaluation Provenance: TheGate Rule-Based Heuristic
              </span>
              <PixelButton size="sm" variant="plum" onClick={onClose}>
                Close Window
              </PixelButton>
            </div>
          </div>
        </PixelWindow>
      </div>
    </div>
  );
}
