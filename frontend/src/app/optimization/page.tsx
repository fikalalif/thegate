"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  GitCompare,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  Cpu,
  Layers,
  ChevronRight,
  X,
  FileCode,
  Radio,
  FileText,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";

export default function OptimizationLabPage() {
  // Active Sub-State Modal trigger
  const [activeSubState, setActiveSubState] = useState<
    "none" | "7a_ast_diff" | "7b_replay" | "7c_canary10" | "7d_soak25" | "7e_rollback"
  >("none");

  // Replay Simulator State (7B)
  const [replayRunning, setReplayRunning] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // 25% Soak State (7D)
  const [soakTimeLeft, setSoakTimeLeft] = useState(2430); // 40m 30s remaining
  const [promotedToStage3, setPromotedToStage3] = useState(false);

  // Rollback Incident State (7E)
  const [incidentTriggered, setIncidentTriggered] = useState(false);

  // Countdown timer for soak
  useEffect(() => {
    const timer = setInterval(() => {
      setSoakTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulator Progress Loop
  function startReplaySimulation() {
    setReplayRunning(true);
    setReplayProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setReplayRunning(false);
      }
      setReplayProgress(p);
    }, 120);
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              OPTIMIZATION LAB
            </h1>
            <PixelBadge variant="amber" size="xs">
              CANARY ACTIVE
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Autonomous prefix prompt caching, speculative draft routing, multi-stage canary soak pipelines, and tripwire rollbacks.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <PixelBadge variant="amber" size="sm">
            STAGE 2: 25% CANARY SOAK
          </PixelBadge>
        </div>
      </div>

      {/* 5 Deep-Dive Verification Sub-States Launch Cards */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 uppercase text-[10px] font-bold tracking-wider">
          <span className="font-pixel text-[9px] text-retro-amber">Verification Sub-States Matrix (7A – 7E)</span>
          <span className="text-slate-500">Click any card to open inspection modal</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sub-State 7A Card */}
          <div
            onClick={() => setActiveSubState("7a_ast_diff")}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-amber hover:shadow-pixel-amber transition space-y-2 relative overflow-hidden active:translate-x-[1px] active:translate-y-[1px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-retro-amber text-[10px] font-pixel">SUB-STATE 7A</span>
              <FileCode className="h-4 w-4 text-retro-amber" />
            </div>
            <div className="font-bold text-white text-xs group-hover:text-brand transition">
              AST Breakpoint Diff Modal
            </div>
            <p className="text-slate-400 font-sans text-xs">
              Inspect side-by-side AST comparison of raw ingress prompts vs optimized router AST with Anthropic ephemeral cache breakpoints.
            </p>
            <div className="pt-2 text-[11px] text-healthy font-semibold flex items-center gap-1">
              Launch AST Diff Viewer →
            </div>
          </div>

          {/* Sub-State 7B Card */}
          <div
            onClick={() => setActiveSubState("7b_replay")}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-mint hover:bg-retro-plum transition space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-retro-mint font-bold">SUB-STATE 7B</span>
              <Play className="h-4 w-4 text-retro-mint" />
            </div>
            <div className="font-bold text-retro-cream text-xs group-hover:text-retro-mint transition font-sans">
              1,000-Trace Replay Simulator
            </div>
            <p className="text-retro-paper font-sans text-xs">
              Synthetic testing sandbox replaying 1,000 historic production traces. Verifies -84.2% cost reduction, -75% latency, and 0.00% drift.
            </p>
            <div className="pt-2 text-xs text-retro-mint font-bold flex items-center gap-1 font-mono">
              Run Replay Simulation →
            </div>
          </div>

          {/* Sub-State 7C Card */}
          <div
            onClick={() => setActiveSubState("7c_canary10")}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-blue hover:bg-retro-plum transition space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-retro-blue font-bold">SUB-STATE 7C</span>
              <ShieldCheck className="h-4 w-4 text-retro-blue" />
            </div>
            <div className="font-bold text-retro-cream text-xs group-hover:text-retro-blue transition font-sans">
              10% Canary Deployment Modal
            </div>
            <p className="text-retro-paper font-sans text-xs">
              High-stakes progressive rollout modal with 10% Canary / 90% Baseline split, &lt;650ms tripwires, and 4/4 verification gates.
            </p>
            <div className="pt-2 text-xs text-retro-blue font-bold flex items-center gap-1 font-mono">
              Inspect 10% Canary Gates →
            </div>
          </div>

          {/* Sub-State 7D Card */}
          <div
            onClick={() => setActiveSubState("7d_soak25")}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-amber hover:bg-retro-plum transition space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-retro-amber font-bold">SUB-STATE 7D (ACTIVE)</span>
              <Clock className="h-4 w-4 text-retro-amber" />
            </div>
            <div className="font-bold text-retro-cream text-xs group-hover:text-retro-amber transition font-sans">
              25% Canary Soak & Promotion Cockpit
            </div>
            <p className="text-retro-paper font-sans text-xs">
              Live progressive rollout cockpit tracking 45-minute soak timers, TTFT comparison curves, and 1-click promotion to Stage 3 (50%).
            </p>
            <div className="pt-2 text-xs text-retro-amber font-bold flex items-center gap-1 font-mono">
              Open Live Soak Cockpit ({formatTime(soakTimeLeft)}) →
            </div>
          </div>

          {/* Sub-State 7E Card */}
          <div
            onClick={() => setActiveSubState("7e_rollback")}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-coral hover:bg-retro-plum transition space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-retro-coral font-bold">SUB-STATE 7E</span>
              <ShieldAlert className="h-4 w-4 text-retro-coral" />
            </div>
            <div className="font-bold text-retro-cream text-xs group-hover:text-retro-coral transition font-sans">
              Automated Rollback Incident State
            </div>
            <p className="text-retro-paper font-sans text-xs">
              Emergency self-healing state displaying autonomous failover drain (1.4s), blast radius mitigation (0 dropped 5xx), and post-mortem review.
            </p>
            <div className="pt-2 text-xs text-retro-coral font-bold flex items-center gap-1 font-mono">
              Simulate Emergency Rollback →
            </div>
          </div>
        </div>
      </div>

      {/* Primary Recommendations & Speculative Decoding Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        {/* Recommendation 1: Speculative Decoding Router */}
        <div className="border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-retro-amber" />
              <h2 className="text-xs font-pixel text-retro-amber uppercase tracking-wider">
                Speculative Decoding Draft Acceleration
              </h2>
            </div>
            <span className="border border-black bg-retro-mint px-2 py-0.5 text-black font-bold uppercase text-[10px] shadow-pixel-sm">
              Active
            </span>
          </div>

          <p className="text-retro-paper font-sans text-xs leading-relaxed">
            TheGate routes initial draft token generation to a local lightweight <span className="font-mono text-retro-cream font-bold">Llama-3.2-1B</span> model running on-cluster vLLM (42ms), verified in parallel by upstream <span className="font-mono text-retro-cream font-bold">Claude 3.5 Sonnet</span>. Reduces total token costs by 48% on repetitive query structures.
          </p>

          <div className="border border-black bg-retro-night p-3 space-y-1.5 text-xs shadow-pixel-sm">
            <div className="flex justify-between">
              <span className="text-retro-paper">Speculative Acceptance Rate:</span>
              <span className="text-retro-mint font-bold">78.4% of draft tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-paper">Draft Latency Overhead:</span>
              <span className="text-retro-cream font-bold">&lt; 14 ms</span>
            </div>
          </div>
        </div>

        {/* Recommendation 2: Semantic Cache Deduplication */}
        <div className="border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-retro-blue" />
              <h2 className="text-xs font-pixel text-retro-blue uppercase tracking-wider">
                Semantic Cache Deduping Threshold
              </h2>
            </div>
            <span className="border border-black bg-retro-amber px-2 py-0.5 text-black font-bold uppercase text-[10px] shadow-pixel-sm">
              Cos: 0.94
            </span>
          </div>

          <p className="text-retro-paper font-sans text-xs leading-relaxed">
            Exact and high-similarity vector context queries are matched against the local redis/sqlite embedding index. Queries exceeding <span className="font-mono text-retro-cream font-bold">0.94 cosine similarity</span> return sub-10ms responses without querying upstream models.
          </p>

          <div className="border border-black bg-retro-night p-3 space-y-1.5 text-xs shadow-pixel-sm">
            <div className="flex justify-between">
              <span className="text-retro-paper">Semantic Hit Ratio:</span>
              <span className="text-retro-mint font-bold">14.2% of repeated queries</span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-paper">Semantic Drift Guarantee:</span>
              <span className="text-retro-cream font-bold">&lt; 0.05% LLM-Judge drift</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-STATE 7A: AST DIFF MODAL                             */}
      {/* ======================================================== */}
      {activeSubState === "7a_ast_diff" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl border-4 border-black bg-retro-plum p-6 shadow-pixel-lg space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="font-pixel text-[10px] text-retro-amber uppercase font-bold">SUB-STATE 7A</span>
                <h3 className="text-sm font-pixel text-retro-cream mt-1">
                  AST Breakpoint Diff: Raw Ingress vs Optimized Cache AST
                </h3>
              </div>
              <button
                onClick={() => setActiveSubState("none")}
                className="border border-black bg-retro-night px-2.5 py-1 text-retro-paper hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Raw Ingress Payload */}
              <div className="border-2 border-black bg-retro-night p-4 space-y-2 shadow-pixel-sm">
                <div className="text-[10px] text-retro-paper font-pixel font-bold uppercase flex justify-between">
                  <span>RAW INGRESS AST (Uncached)</span>
                  <span className="text-retro-coral">2,840 tokens</span>
                </div>
                <pre className="text-xs text-retro-cream overflow-x-auto leading-relaxed font-mono">
{`{
  "model": "claude-3-5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are TheGate enterprise assistant... [1,024 tok static schema]"
    },
    {
      "role": "user",
      "content": "[2,200 tok vector chunk]\\nQuestion: Summarize Q3 FinOps burn."
    }
  ]
}`}
                </pre>
                <div className="text-xs text-retro-paper border-t border-retro-ink pt-2 font-bold">
                  Uncached Ingress Cost: <span className="text-retro-coral">$0.009720</span>
                </div>
              </div>

              {/* Right: Optimized Router AST with Ephemeral Cache */}
              <div className="border-2 border-black bg-retro-night p-4 space-y-2 shadow-pixel-sm">
                <div className="text-[10px] text-retro-amber font-pixel font-bold uppercase flex justify-between">
                  <span>OPTIMIZED ROUTER AST (Breakpoint Injected)</span>
                  <span className="text-retro-mint">Hit: $0.30/1M</span>
                </div>
                <pre className="text-xs text-retro-mint overflow-x-auto leading-relaxed font-mono">
{`{
  "model": "claude-3-5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are TheGate enterprise assistant...",
          "cache_control": { "type": "ephemeral" }  // <-- BP 1
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "[2,200 tok vector chunk]",
          "cache_control": { "type": "ephemeral" }  // <-- BP 2
        },
        {
          "type": "text",
          "text": "Question: Summarize Q3 FinOps burn."
        }
      ]
    }
  ]
}`}
                </pre>
                <div className="text-xs text-retro-mint border-t border-retro-ink pt-2 flex justify-between font-bold">
                  <span>Optimized Cost: $0.001920</span>
                  <span>Arbitrage: -84.2%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t-2 border-black">
              <button
                onClick={() => setActiveSubState("none")}
                className="border-2 border-black bg-retro-night px-4 py-2 text-retro-cream hover:bg-retro-amber hover:text-black font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Close AST Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-STATE 7B: 1,000-TRACE REPLAY SIMULATOR               */}
      {/* ======================================================== */}
      {activeSubState === "7b_replay" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl border-4 border-black bg-retro-plum p-6 shadow-pixel-lg space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="font-pixel text-[10px] text-retro-mint uppercase font-bold">SUB-STATE 7B</span>
                <h3 className="text-sm font-pixel text-retro-cream mt-1">
                  1,000 Historic Production Traces Replay Sandbox
                </h3>
              </div>
              <button
                onClick={() => setActiveSubState("none")}
                className="border border-black bg-retro-night px-2.5 py-1 text-retro-paper hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-retro-paper font-sans text-xs leading-relaxed">
              Simulates replaying 1,000 authentic production traces through the active caching and arbitration pipeline to benchmark cache hit rate, cost arbitrage, and semantic fidelity.
            </p>

            <div className="border-2 border-black bg-retro-night p-4 space-y-3 shadow-pixel-sm">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-retro-paper font-pixel text-[10px]">SIMULATION RUNNER STATUS:</span>
                <span className={replayRunning ? "text-retro-amber" : replayProgress === 100 ? "text-retro-mint" : "text-retro-paper"}>
                  {replayRunning ? `REPLAYING (${replayProgress}%)` : replayProgress === 100 ? "COMPLETED (1,000 / 1,000)" : "IDLE (READY)"}
                </span>
              </div>
              <div className="h-4 w-full bg-retro-ink border border-black overflow-hidden">
                <div
                  className="h-full bg-retro-mint transition-all duration-150"
                  style={{ width: `${replayProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-retro-paper font-bold">
                <span>Traces evaluated: {Math.round(replayProgress * 10)} / 1,000</span>
                <span className="text-retro-mint">Error rate: 0.00%</span>
              </div>
            </div>

            {replayProgress === 100 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                  <span className="text-retro-paper text-[10px] font-pixel block font-bold">CACHE HIT RATE</span>
                  <span className="text-xl font-bold text-retro-mint">84.2%</span>
                </div>
                <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                  <span className="text-retro-paper text-[10px] font-pixel block font-bold">FINOPS COST REDUCTION</span>
                  <span className="text-xl font-bold text-retro-mint">-84.2%</span>
                </div>
                <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                  <span className="text-retro-paper text-[10px] font-pixel block font-bold">SEMANTIC DRIFT</span>
                  <span className="text-xl font-bold text-retro-cream">0.00%</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t-2 border-black">
              <button
                onClick={startReplaySimulation}
                disabled={replayRunning}
                className="border-2 border-black px-4 py-2 bg-retro-mint text-black font-pixel text-xs font-bold shadow-pixel-sm hover:translate-y-0.5 transition disabled:opacity-50"
              >
                {replayRunning ? "Simulating Replay..." : "Run 1,000 Trace Replay"}
              </button>
              <button
                onClick={() => setActiveSubState("none")}
                className="border-2 border-black px-4 py-2 bg-retro-night text-retro-cream hover:bg-retro-coral hover:text-white font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-STATE 7C: 10% CANARY DEPLOYMENT MODAL                */}
      {/* ======================================================== */}
      {activeSubState === "7c_canary10" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl border-4 border-black bg-retro-plum p-6 shadow-pixel-lg space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="font-pixel text-[10px] text-retro-blue uppercase font-bold">SUB-STATE 7C</span>
                <h3 className="text-sm font-pixel text-retro-cream mt-1">
                  Stage 1: 10% Canary Progressive Rollout Dialog
                </h3>
              </div>
              <button
                onClick={() => setActiveSubState("none")}
                className="border border-black bg-retro-night px-2.5 py-1 text-retro-paper hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-black bg-retro-night p-4 space-y-3 shadow-pixel-sm">
              <div className="flex justify-between text-xs font-bold">
                <span className="font-pixel text-[10px] text-retro-paper">WEIGHTED TENANT HASH SPLIT</span>
                <span className="text-retro-amber font-bold">10% CANARY / 90% BASELINE</span>
              </div>
              <div className="flex h-4 w-full bg-retro-ink border border-black overflow-hidden">
                <div className="bg-retro-amber h-full" style={{ width: "10%" }} />
                <div className="bg-slate-600 h-full" style={{ width: "90%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-pixel font-bold text-retro-paper uppercase">
                4 / 4 Verification Gates (Passed)
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between border border-black bg-retro-night p-2.5 shadow-pixel-sm">
                  <span className="flex items-center gap-2 text-retro-cream font-bold">
                    <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                    P95 TTFT Ceiling: &lt;650ms sustained 30s
                  </span>
                  <span className="text-retro-mint font-bold">312ms (Pass)</span>
                </div>
                <div className="flex items-center justify-between border border-black bg-retro-night p-2.5 shadow-pixel-sm">
                  <span className="flex items-center gap-2 text-retro-cream font-bold">
                    <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                    Autonomous Rollback Tripwire Sentinel Armed
                  </span>
                  <span className="text-retro-mint font-bold">Armed</span>
                </div>
                <div className="flex items-center justify-between border border-black bg-retro-night p-2.5 shadow-pixel-sm">
                  <span className="flex items-center gap-2 text-retro-cream font-bold">
                    <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                    Zero-Drop Fallback Connection Drain Test
                  </span>
                  <span className="text-retro-mint font-bold">0 Drop / 1.4s</span>
                </div>
                <div className="flex items-center justify-between border border-black bg-retro-night p-2.5 shadow-pixel-sm">
                  <span className="flex items-center gap-2 text-retro-cream font-bold">
                    <CheckCircle2 className="h-4 w-4 text-retro-mint" />
                    Semantic Output LLM-Judge Floor (&gt;98.5%)
                  </span>
                  <span className="text-retro-mint font-bold">99.2% (Pass)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-black">
              <button
                onClick={() => {
                  setActiveSubState("7d_soak25");
                }}
                className="border-2 border-black px-4 py-2 bg-retro-amber text-black font-pixel text-xs font-bold shadow-pixel-sm hover:translate-y-0.5 transition"
              >
                Promote to Stage 2 (25% Soak) →
              </button>
              <button
                onClick={() => setActiveSubState("none")}
                className="border-2 border-black px-4 py-2 bg-retro-night text-retro-cream hover:bg-retro-coral hover:text-white font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-STATE 7D: 25% CANARY SOAK & PROMOTION COCKPIT        */}
      {/* ======================================================== */}
      {activeSubState === "7d_soak25" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl border-4 border-black bg-retro-plum p-6 shadow-pixel-lg space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="font-pixel text-[10px] text-retro-amber uppercase font-bold">SUB-STATE 7D (LIVE)</span>
                <h3 className="text-sm font-pixel text-retro-cream mt-1">
                  Stage 2: 25% Canary Soak & Promotion Cockpit
                </h3>
              </div>
              <button
                onClick={() => setActiveSubState("none")}
                className="border border-black bg-retro-night px-2.5 py-1 text-retro-paper hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-black bg-retro-night p-3.5 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">SOAK TIMER REMAINING</span>
                <span className="text-xl font-bold text-retro-amber">{formatTime(soakTimeLeft)}</span>
                <span className="text-[10px] text-retro-paper block">45-minute soak gate</span>
              </div>
              <div className="border border-black bg-retro-night p-3.5 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">CANARY P95 TTFT</span>
                <span className="text-xl font-bold text-retro-mint">312 ms</span>
                <span className="text-[10px] text-retro-mint block font-bold">-75% vs baseline</span>
              </div>
              <div className="border border-black bg-retro-night p-3.5 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">BASELINE P95 TTFT</span>
                <span className="text-xl font-bold text-retro-paper">1,380 ms</span>
                <span className="text-[10px] text-slate-400 block">Direct gpt-4o</span>
              </div>
            </div>

            <div className="border-2 border-black bg-retro-night p-4 space-y-2 shadow-pixel-sm">
              <div className="flex justify-between text-xs">
                <span className="text-retro-paper">Canary Slice Traffic Hash:</span>
                <span className="text-retro-cream font-bold">25% (Weighted Murmur3 Tenant Seed)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-retro-paper">Sentinel Monitor Status:</span>
                <span className="text-retro-mint font-bold">Zero Tripwire Breaches (&lt;650ms ceiling)</span>
              </div>
            </div>

            {promotedToStage3 && (
              <div className="border-2 border-black bg-retro-mint p-3 text-black font-pixel text-xs font-bold text-center shadow-pixel-sm">
                ✓ PROMOTED: STAGE 3 (50% TRAFFIC SPLIT) INITIATED SUCCESSFULLY
              </div>
            )}

            <div className="flex justify-between pt-2 border-t-2 border-black">
              <button
                onClick={() => setPromotedToStage3(true)}
                disabled={promotedToStage3}
                className="border-2 border-black px-4 py-2 bg-retro-amber text-black font-pixel text-xs font-bold shadow-pixel-sm hover:translate-y-0.5 transition disabled:opacity-50"
              >
                {promotedToStage3 ? "Promoted to 50%" : "1-Click Promote to Stage 3 (50%)"}
              </button>
              <button
                onClick={() => setActiveSubState("none")}
                className="border-2 border-black px-4 py-2 bg-retro-night text-retro-cream hover:bg-retro-coral hover:text-white font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Close Cockpit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-STATE 7E: AUTOMATED ROLLBACK INCIDENT STATE          */}
      {/* ======================================================== */}
      {activeSubState === "7e_rollback" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl border-4 border-black bg-retro-plum p-6 shadow-pixel-lg space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="font-pixel text-[10px] text-retro-coral uppercase font-bold">SUB-STATE 7E</span>
                <h3 className="text-sm font-pixel text-retro-cream mt-1 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-retro-coral" />
                  Automated Rollback Incident & Zero-Drop Failover
                </h3>
              </div>
              <button
                onClick={() => setActiveSubState("none")}
                className="border border-black bg-retro-night px-2.5 py-1 text-retro-paper hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-black bg-retro-coral p-4 space-y-2 text-white shadow-pixel-sm">
              <div className="flex justify-between font-bold text-xs font-pixel">
                <span>INCIDENT: AUTOMATED SENTINEL TRIPWIRE BREACH</span>
                <span className="border border-white bg-black px-1.5 py-0.5">SELF-HEALED</span>
              </div>
              <p className="text-xs font-sans leading-relaxed text-retro-cream">
                Canary P95 latency exceeded &gt;650ms for &gt;30s (simulated). TheGate autonomous circuit breaker tripped and executed zero-drop connection drain back to baseline ingress in 1.4s.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">FAILOVER DRAIN TIME</span>
                <span className="text-xl font-bold text-retro-mint">1.4 s</span>
              </div>
              <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">DROPPED 5XX ERRORS</span>
                <span className="text-xl font-bold text-retro-mint">0 (0.00%)</span>
              </div>
              <div className="border border-black bg-retro-night p-3 text-center space-y-1 shadow-pixel-sm">
                <span className="text-retro-paper text-[10px] font-pixel block font-bold">TRAFFIC RESTORED</span>
                <span className="text-xl font-bold text-retro-cream">100% Baseline</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-pixel font-bold text-retro-paper uppercase">
                Incident Timeline Audit Trace
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper">19:14:02 UTC - Canary P95 latency spiked to 682ms on Anthropic node #2</span>
                  <span className="text-retro-amber font-bold">Breach</span>
                </div>
                <div className="flex justify-between border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper">19:14:32 UTC - Sentinel tripwire ceiling sustained &gt; 30s</span>
                  <span className="text-retro-coral font-bold">Tripwire Fire</span>
                </div>
                <div className="flex justify-between border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper">19:14:33 UTC - Zero-drop traffic drain initiated to Direct Baseline Ingress</span>
                  <span className="text-retro-mint font-bold">Draining</span>
                </div>
                <div className="flex justify-between border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper">19:14:34 UTC - Canary slice reduced to 0%. 0 client requests dropped.</span>
                  <span className="text-retro-mint font-bold">Healed (1.4s)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-black">
              <button
                onClick={() => alert("Post-mortem markdown report generated into incident-audit-992.md")}
                className="border-2 border-black px-4 py-2 bg-retro-night text-retro-cream hover:bg-retro-ink font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Post-Mortem Report
              </button>
              <button
                onClick={() => setActiveSubState("none")}
                className="border-2 border-black px-4 py-2 bg-retro-amber text-black hover:bg-retro-mint font-pixel text-xs font-bold shadow-pixel-sm"
              >
                Dismiss Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
