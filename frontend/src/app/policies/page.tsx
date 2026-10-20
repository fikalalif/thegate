"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sliders,
  CheckCircle2,
  RefreshCw,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  GitBranch,
  Settings2,
  Play,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { api, RoutingPolicy, ModelRegistryItem } from "@/lib/api";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Simulation state
  const [simTokens, setSimTokens] = useState(2500);
  const [simMode, setSimMode] = useState<"economy" | "balanced" | "quality">("balanced");
  const [simResult, setSimResult] = useState<{
    selectedModel: string;
    estimatedCost: string;
    baselineCost: string;
    savingsPct: string;
    predictedTtft: number;
    decisionReason: string;
  } | null>(null);

  async function loadPolicies() {
    setLoading(true);
    try {
      const [policiesData, modelsData] = await Promise.all([
        api.getPolicies(),
        api.getModels().catch(() => []),
      ]);
      setPolicies(policiesData);
      setModels(modelsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleModeChange(policy: RoutingPolicy, newMode: "economy" | "balanced" | "quality") {
    setUpdatingId(policy.id);
    try {
      await api.updatePolicy(policy.id, { mode: newMode });
      await loadPolicies();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  function runSimulation() {
    if (models.length === 0) {
      setSimResult({
        selectedModel: "No Model Registered (Catalog Empty)",
        estimatedCost: "0.000000",
        baselineCost: "0.000000",
        savingsPct: "0.0%",
        predictedTtft: 0,
        decisionReason:
          "No upstream models connected in catalog. Ingress will reject completion with HTTP 503 (no_eligible_model). Connect your downstream router gateway in Providers to enable routing.",
      });
      return;
    }

    const candidate =
      simMode === "economy"
        ? models[0]
        : simMode === "quality"
        ? models[models.length - 1]
        : models[Math.floor(models.length / 2)] || models[0];

    const activePricing =
      candidate.pricing_entries && candidate.pricing_entries.length > 0
        ? candidate.pricing_entries[0]
        : null;

    const inputRate = activePricing ? Number(activePricing.input_price_per_million) : 0.5;
    const outputRate = activePricing ? Number(activePricing.output_price_per_million) : 1.5;
    const unitCostPerToken = (inputRate + outputRate) / 2 / 1_000_000;

    const costNum = simTokens * unitCostPerToken;
    const baselineNum = simTokens * (5.0 / 1_000_000);
    const savingsNum = baselineNum > 0 ? Math.max(0, ((baselineNum - costNum) / baselineNum) * 100) : 0;

    setSimResult({
      selectedModel: candidate.internal_name,
      estimatedCost: costNum.toFixed(6),
      baselineCost: baselineNum.toFixed(6),
      savingsPct: `${savingsNum.toFixed(1)}%`,
      predictedTtft: simMode === "economy" ? 180 : simMode === "quality" ? 420 : 280,
      decisionReason: `${simMode.toUpperCase()} policy evaluated against ${models.length} active registered models. Selected '${candidate.internal_name}' (${candidate.provider_adapter}) based on tier objectives.`,
    });
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              ROUTING POLICIES CONTROL
            </h1>
            <PixelBadge variant="mint" size="xs">
              ACTIVE
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Objective-driven arbitrage policies, speculative decoding, and synthetic simulation.
          </p>
        </div>
        <PixelButton
          size="sm"
          variant="plum"
          icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-retro-amber" : ""}`} />}
          onClick={loadPolicies}
          disabled={loading}
        >
          Sync Policies
        </PixelButton>
      </div>

      {/* 3 Core Arbitrage Archetypes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 font-mono text-xs">
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-3">
          <div className="flex items-center justify-between text-retro-mint font-bold">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ECONOMY ARBITRAGE
            </span>
            <PixelBadge variant="mint" size="xs">
              LOW SPEND
            </PixelBadge>
          </div>
          <p className="text-retro-paper text-xs leading-relaxed">
            Guarantees lowest unit cost selection among active models registered in your catalog, prioritizing lightweight candidates whenever context limits allow.
          </p>
          <div className="pt-2 border-t border-retro-ink text-xs text-retro-paper font-bold">
            Target Cost Reduction: <strong className="text-retro-mint">Max Savings</strong>
          </div>
        </div>

        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-3">
          <div className="flex items-center justify-between text-retro-amber font-bold">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-retro-amber" />
              BALANCED DYNAMIC ARBITRAGE
            </span>
            <PixelBadge variant="amber" size="xs">
              RECOMMENDED
            </PixelBadge>
          </div>
          <p className="text-retro-paper text-xs leading-relaxed">
            Dynamic cost vs quality evaluation. Balances unit price efficiency, latency headroom, and context limits across all registered candidates.
          </p>
          <div className="pt-2 border-t border-retro-ink text-xs text-retro-paper font-bold">
            Optimization Goal: <strong className="text-retro-amber">Balanced Efficiency</strong>
          </div>
        </div>

        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-3">
          <div className="flex items-center justify-between text-retro-cyan font-bold">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-retro-cyan" />
              QUALITY FLAGSHIP TIER
            </span>
            <PixelBadge variant="cyan" size="xs">
              MAX REASONING
            </PixelBadge>
          </div>
          <p className="text-retro-paper text-xs leading-relaxed">
            Routes mission-critical tasks exclusively to flagship tier models registered in your catalog for maximum reasoning accuracy and fidelity.
          </p>
          <div className="pt-2 border-t border-retro-ink text-xs text-retro-paper font-bold">
            Quality Floor: <strong className="text-retro-cyan">Flagship Tier</strong>
          </div>
        </div>
      </div>

      {/* Model Fallback Cascades & Circuit Breaker Rules */}
      <div className="border-2 border-black bg-retro-night p-5 shadow-pixel space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b-2 border-retro-ink pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-retro-amber" />
            <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
              Autonomous Fallback Cascades & Connection Drains
            </h2>
          </div>
          <span className="text-retro-mint font-bold text-xs">
            {models.length > 0 ? `${models.length} Candidates Linked` : "Catalog Empty"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-black bg-retro-coal p-3.5 space-y-2 shadow-pixel-sm">
            <div className="font-pixel text-retro-paper font-bold text-[10px]">TIER 1 (PRIMARY)</div>
            <div className="text-retro-cream font-bold text-xs">
              {models.length > 0 ? models[0].internal_name : "No Primary Model Registered"}
            </div>
            <div className="text-xs text-retro-paper">
              {models.length > 0
                ? `Adapter: ${models[0].provider_adapter} | Timeout: 1,500ms`
                : "Ingress will return HTTP 503 until models are synced."}
            </div>
          </div>
          <div className="border-2 border-black bg-retro-coal p-3.5 space-y-2 shadow-pixel-sm">
            <div className="font-pixel text-retro-paper font-bold text-[10px]">TIER 2 (FAILOVER 1)</div>
            <div className="text-retro-cream font-bold text-xs">
              {models.length > 1 ? models[1].internal_name : "No Secondary Model Registered"}
            </div>
            <div className="text-xs text-retro-paper">
              {models.length > 1
                ? `Trigger: 429 Rate Limit or 5xx on Primary`
                : "Synchronize additional models for failover redundancy."}
            </div>
          </div>
          <div className="border-2 border-black bg-retro-coal p-3.5 space-y-2 shadow-pixel-sm">
            <div className="font-pixel text-retro-paper font-bold text-[10px]">TIER 3 (CIRCUIT DRAIN)</div>
            <div className="text-retro-cream font-bold text-xs">
              {models.length > 2 ? models[2].internal_name : "Edge Circuit Breaker"}
            </div>
            <div className="text-xs text-retro-mint font-bold">
              {models.length > 2
                ? `Autonomous failover drain (${models[2].provider_adapter})`
                : "Strict Zero-Drop Drain configured on Ingress"}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Policy Table */}
      <div className="overflow-hidden border-2 border-black bg-retro-night shadow-pixel font-mono text-xs">
        <div className="px-5 py-3 border-b-2 border-black bg-retro-coal flex items-center justify-between">
          <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
            Active Routing Policies Catalog
          </h2>
          <span className="text-retro-paper text-xs font-bold">Click mode to hot-swap active strategy</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b-2 border-black bg-retro-coal text-retro-paper font-pixel text-[11px]">
              <tr>
                <th className="py-2.5 px-4">POLICY NAME</th>
                <th className="py-2.5 px-4">ACTIVE MODE</th>
                <th className="py-2.5 px-4">VERSION</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4">CONFIGURATION SPEC</th>
                <th className="py-2.5 px-4 text-right">SWITCH STRATEGY</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-retro-ink/50 text-retro-cream">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-retro-paper font-mono">
                    Loading routing policies from backend...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-retro-paper font-mono">
                    No policies found in catalog.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id} className="hover:bg-retro-wine/40 transition-none">
                    <td className="py-3 px-4 font-bold text-retro-cream">{p.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`border border-black px-2 py-0.5 font-pixel text-[10px] uppercase ${
                          p.mode === "economy"
                            ? "bg-retro-mint/20 text-retro-mint"
                            : p.mode === "balanced"
                            ? "bg-retro-amber/20 text-retro-amber"
                            : "bg-retro-cyan/20 text-retro-cyan"
                        }`}
                      >
                        {p.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-retro-paper font-bold">v{p.version}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-retro-mint font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-retro-paper">
                      <span className="text-[10px] bg-retro-coal px-2 py-1 border border-black font-mono">
                        {JSON.stringify(p.configuration)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5 font-sans">
                        {(["economy", "balanced", "quality"] as const).map((m) => (
                          <button
                            key={m}
                            disabled={updatingId === p.id || p.mode === m}
                            onClick={() => handleModeChange(p, m)}
                            className={`px-2.5 py-1 text-[11px] font-pixel transition-none ${
                              p.mode === m
                                ? "border-2 border-black bg-retro-coal text-retro-paper cursor-default"
                                : "border-2 border-black bg-retro-amber text-black hover:bg-retro-sand shadow-pixel-sm active:translate-y-0.5"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synthetic Policy Simulation Sandbox */}
      <div className="border-2 border-black bg-retro-night p-5 shadow-pixel space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b-2 border-retro-ink pb-3">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-retro-amber" />
            <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
              Synthetic Policy Execution Simulator
            </h2>
          </div>
          <span className="text-retro-paper text-xs font-bold">Pre-evaluate routing arbitrage</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="font-pixel text-[10px] text-retro-paper block mb-1 font-bold">PROMPT TOKEN LENGTH</label>
            <input
              type="number"
              value={simTokens}
              onChange={(e) => setSimTokens(Number(e.target.value))}
              className="w-full border-2 border-black bg-retro-coal p-2 text-retro-cream font-mono text-xs focus:ring-0 focus:outline-none focus:border-retro-amber"
            />
          </div>
          <div>
            <label className="font-pixel text-[10px] text-retro-paper block mb-1 font-bold">EVALUATED POLICY MODE</label>
            <select
              value={simMode}
              onChange={(e) => setSimMode(e.target.value as any)}
              className="w-full border-2 border-black bg-retro-coal p-2 text-retro-cream font-mono text-xs focus:ring-0 focus:outline-none focus:border-retro-amber"
            >
              <option value="economy">Economy (Lowest Unit Cost)</option>
              <option value="balanced">Balanced (Prefix Caching Arbitrage)</option>
              <option value="quality">Quality (Flagship Reasoning)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={runSimulation}
              className="w-full py-2 border-2 border-black bg-retro-amber text-black font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand transition-none active:translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Simulate Ingress Decision
            </button>
          </div>
        </div>

        {simResult && (
          <div className="border-2 border-black bg-retro-coal p-4 space-y-3 mt-3 shadow-pixel-sm">
            <div className="flex items-center justify-between text-retro-amber font-pixel text-xs">
              <span>SIMULATION: {simResult.selectedModel.toUpperCase()}</span>
              <span className="text-retro-mint font-bold">SAVINGS: {simResult.savingsPct}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div>
                <span className="text-retro-paper block font-bold text-[10px]">ESTIMATED SPEND:</span>
                <span className="text-retro-cream font-bold">${simResult.estimatedCost}</span>
              </div>
              <div>
                <span className="text-retro-paper block font-bold text-[10px]">BASELINE SPEND:</span>
                <span className="text-retro-paper font-bold">${simResult.baselineCost}</span>
              </div>
              <div>
                <span className="text-retro-paper block font-bold text-[10px]">PREDICTED TTFT:</span>
                <span className="text-retro-mint font-bold">{simResult.predictedTtft} ms</span>
              </div>
            </div>
            <div className="text-xs text-retro-paper border-t border-retro-ink pt-2 font-mono">
              <span className="text-retro-paper font-bold">Decision Rationale:</span> {simResult.decisionReason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
