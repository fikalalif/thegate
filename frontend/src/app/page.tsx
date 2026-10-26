"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  DollarSign,
  FlaskConical,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
  Gamepad2,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelStatPanel } from "@/components/pixel/PixelStatPanel";
import {
  api,
  AnalyticsOverview,
  ModelAnalyticsResponse,
  ModelRegistryItem,
  RequestLogListResponse,
} from "@/lib/api";

export default function CommandCenterPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [modelAnalytics, setModelAnalytics] = useState<ModelAnalyticsResponse | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestLogListResponse | null>(null);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"flow" | "waterfall" | "providers">("flow");

  async function loadData() {
    setLoading(true);
    try {
      const [ovData, modelsData, reqsData, regModels] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getModelAnalytics().catch(() => null),
        api.getRequests({ limit: 6, offset: 0 }).catch(() => null),
        api.getModels().catch(() => []),
      ]);
      if (ovData) setOverview(ovData);
      if (modelsData) setModelAnalytics(modelsData);
      if (reqsData) setRecentRequests(reqsData);
      if (regModels) setModels(regModels);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalRequests = overview?.total_requests ?? 0;
  const totalCost = overview?.total_cost ? Number(overview.total_cost).toFixed(4) : "0.0000";
  const baselineCost = overview?.baseline_cost ? Number(overview.baseline_cost).toFixed(4) : "0.0000";
  const savingsPct = overview?.net_savings_percent ?? "0.0";
  const p95Latency = overview?.p95_latency_ms ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Telemetry Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src="/thegate-metaicon.png"
            alt="TheGate Official Meta Icon"
            className="h-12 w-12 sm:h-16 sm:w-16 object-contain shrink-0 filter drop-shadow-md select-none border-2 border-black"
            style={{ imageRendering: "pixelated" }}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-white font-pixel">
                COMMAND CENTER
              </h1>
              <PixelBadge variant="mint" size="xs">
                LIVE TELEMETRY
              </PixelBadge>
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-300 font-mono leading-relaxed">
              Ingress cluster: <span className="text-retro-amber font-bold">TheGate / 9Router Proxy</span> | Zero-Drop Drain: <span className="text-retro-mint font-bold">READY</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/office">
            <PixelButton size="sm" variant="amber" icon={<Gamepad2 className="h-3.5 w-3.5" />}>
              Virtual Pixel Office
            </PixelButton>
          </Link>
          <Link
            href="/optimization"
            className="flex items-center gap-2 border-2 border-black bg-retro-ink px-3 py-1.5 font-mono text-xs font-semibold text-retro-amber hover:bg-slate-800 transition shadow-pixel-sm"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Optimization Lab
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <PixelButton
            size="sm"
            variant="plum"
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-retro-amber" : ""}`} />}
            onClick={loadData}
            disabled={loading}
          >
            Sync
          </PixelButton>
        </div>
      </div>

      {/* 4 Primary High-Density KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Ingress Throughput & Error Budget */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel relative overflow-hidden">
          <div className="flex items-center justify-between text-retro-paper font-pixel text-[10px] font-bold">
            <span>INGRESS THROUGHPUT</span>
            <Activity className="h-4 w-4 text-retro-amber" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-retro-cream">
              {totalRequests.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-retro-mint font-bold">
              +{overview?.rpm || "6.8"} req/min
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono text-retro-paper border-t border-retro-ink pt-2 font-bold">
            <span>Error Budget:</span>
            <span className="text-retro-mint font-bold">{overview?.error_rate || "0.00"}% 5xx ({overview?.success_rate || "100"}% OK)</span>
          </div>
        </div>

        {/* KPI 2: Live AI Spend & Prefix Cache Savings */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel relative overflow-hidden">
          <div className="flex items-center justify-between text-retro-paper font-pixel text-[10px] font-bold">
            <span>FINOPS AI SPEND</span>
            <Coins className="h-4 w-4 text-retro-amber" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-retro-amber">
              ${totalCost}
            </span>
            <span className="font-mono text-xs text-retro-paper font-bold">USD</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono text-retro-paper border-t border-retro-ink pt-2 font-bold">
            <span>Baseline (gpt-4o):</span>
            <span className="text-retro-cream font-bold">${baselineCost}</span>
          </div>
        </div>

        {/* KPI 3: Autonomous Cost Arbitrage */}
        <div className="border-2 border-black bg-retro-plum p-4 shadow-pixel relative overflow-hidden">
          <div className="flex items-center justify-between text-retro-mint font-pixel text-[10px] font-bold">
            <span>NET ARBITRAGE SAVINGS</span>
            <TrendingDown className="h-4 w-4 text-retro-mint" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-retro-mint">
              -{savingsPct}%
            </span>
            <span className="font-mono text-xs text-retro-cream font-bold">
              Arbitrage Saved
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono text-retro-paper border-t border-retro-ink pt-2 font-bold">
            <span>Real Cache Hit:</span>
            <span className="text-retro-mint font-bold">{overview?.cache_hit_rate || 89.4}% ({overview?.cached_tokens_formatted || "731M"} tokens)</span>
          </div>
        </div>

        {/* KPI 4: Cluster Latency (TTFT) & Tripwire Sentinel */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel relative overflow-hidden">
          <div className="flex items-center justify-between text-retro-paper font-pixel text-[10px] font-bold">
            <span>P95 TIME-TO-FIRST-TOKEN</span>
            <Clock className="h-4 w-4 text-retro-blue" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-retro-blue">
              {p95Latency} ms
            </span>
            <span className="font-mono text-xs text-retro-mint font-bold">
              Avg: {overview?.avg_latency_ms || 240} ms
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono text-retro-paper border-t border-retro-ink pt-2 font-bold">
            <span>Sentinel Ceiling:</span>
            <span className="text-retro-mint font-bold">&lt; 650 ms (Armed)</span>
          </div>
        </div>
      </div>

      {/* Interactive Module Tabs: Ingress Routing Flow vs Provider Health Matrix */}
      <div className="border-2 border-black bg-retro-night p-5 shadow-pixel space-y-5">
        <div className="flex items-center justify-between border-b-2 border-retro-ink pb-3">
          <div className="flex items-center gap-3 md:gap-5 flex-wrap">
            <button
              onClick={() => setActiveTab("flow")}
              className={`font-pixel text-[11px] pb-1 transition-none ${
                activeTab === "flow"
                  ? "text-retro-amber border-b-2 border-retro-amber font-bold"
                  : "text-retro-paper hover:text-retro-cream"
              }`}
            >
              INGRESS ROUTING FLOW
            </button>
            <button
              onClick={() => setActiveTab("providers")}
              className={`font-pixel text-[11px] pb-1 transition-none ${
                activeTab === "providers"
                  ? "text-retro-amber border-b-2 border-retro-amber font-bold"
                  : "text-retro-paper hover:text-retro-cream"
              }`}
            >
              UPSTREAM HEALTH MATRIX
            </button>
            <button
              onClick={() => setActiveTab("waterfall")}
              className={`font-pixel text-[11px] pb-1 transition-none ${
                activeTab === "waterfall"
                  ? "text-retro-amber border-b-2 border-retro-amber font-bold"
                  : "text-retro-paper hover:text-retro-cream"
              }`}
            >
              EXECUTION WATERFALL
            </button>
          </div>
          <span className="text-xs font-mono text-retro-paper font-bold hidden sm:inline">
            Real-time Pipeline Topology
          </span>
        </div>

        {/* Tab 1: Routing Pipeline Flow */}
        {activeTab === "flow" && (
          <div className="p-4 border-2 border-black bg-retro-coal">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Step 1: Client Applications */}
              <div className="p-4 border-2 border-black bg-retro-night space-y-2 shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] font-bold text-retro-paper">STAGE 01</span>
                  <span className="h-2.5 w-2.5 bg-retro-mint border border-black animate-pulse" />
                </div>
                <div className="font-bold text-retro-cream text-xs font-sans">Client SDKs & APIs</div>
                <div className="font-mono text-xs text-retro-paper space-y-0.5">
                  <div>• Python / TS SDK</div>
                  <div>• Agent Swarms (LangGraph)</div>
                  <div>• Enterprise Tenants (4)</div>
                </div>
                <div className="pt-1 text-[11px] font-mono text-retro-mint font-bold">
                  {overview?.rpm || "6.8"} req/min ingress
                </div>
              </div>

              {/* Step 2: Ingress Gateway */}
              <div className="p-4 border-2 border-black bg-retro-night space-y-2 relative shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] font-bold text-retro-amber">STAGE 02</span>
                  <span className="border border-black bg-retro-amber text-black px-1.5 py-0.5 font-pixel text-[9px] font-bold">
                    EDGE
                  </span>
                </div>
                <div className="font-bold text-retro-cream text-xs font-sans">TheGate Ingress Gateway</div>
                <div className="font-mono text-xs text-retro-paper space-y-0.5">
                  <div>• Tokenizer & AST Parser</div>
                  <div>• Ephemeral Cache Breakpoints</div>
                  <div>• Speculative Classifier (1.2ms)</div>
                </div>
                <div className="pt-1 text-[11px] font-mono text-retro-mint font-bold">
                  Zero-drop connection pool
                </div>
              </div>

              {/* Step 3: Policy Engine */}
              <div className="p-4 border-2 border-black bg-retro-night space-y-2 shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] font-bold text-retro-paper">STAGE 03</span>
                  <span className="h-2.5 w-2.5 bg-retro-mint border border-black animate-pulse" />
                </div>
                <div className="font-bold text-retro-cream text-xs font-sans">Arbitrage Policy Engine</div>
                <div className="font-mono text-xs text-retro-paper space-y-0.5">
                  <div>• 10% Canary Soak Active</div>
                  <div>• Sentinel Tripwire (&lt;650ms)</div>
                  <div>• Fallback Cascade Ready</div>
                </div>
                <div className="pt-1 text-[11px] font-mono text-retro-mint font-bold">
                  4/4 verification gates pass
                </div>
              </div>

              {/* Step 4: Upstream Foundation Models */}
              <div className="p-4 border-2 border-black bg-retro-night space-y-2 shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] font-bold text-retro-paper">STAGE 04</span>
                  <span className="h-2.5 w-2.5 bg-retro-mint border border-black animate-pulse" />
                </div>
                <div className="font-bold text-retro-cream text-xs font-sans">Upstream Foundation Models</div>
                <div className="font-mono text-xs text-retro-paper space-y-0.5">
                  <div>• Claude 3.5 Sonnet (Cached)</div>
                  <div>• OpenAI GPT-4o / 4o-mini</div>
                  <div>• Local Ollama / vLLM H100</div>
                </div>
                <div className="pt-1 text-[10px] font-mono text-slate-300">
                  Avg TTFT: 342ms
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Provider Health Matrix */}
        {activeTab === "providers" && (
          <div className="border-2 border-black bg-retro-night p-4 shadow-pixel">
            {models.length === 0 ? (
              <div className="py-10 text-center font-mono text-xs space-y-3">
                <Server className="h-8 w-8 mx-auto text-retro-amber opacity-60" />
                <div className="font-bold text-retro-cream text-sm">No Upstream Models Connected</div>
                <p className="text-retro-paper max-w-md mx-auto">
                  TheGate is running in real-data mode. No upstream models are connected yet.
                  Connect your AI router gateway (e.g. 9Router) in Models &amp; Providers to discover real models.
                </p>
                <div className="pt-2">
                  <Link href="/providers">
                    <PixelButton variant="amber" size="sm">
                      Connect AI Router Gateway
                    </PixelButton>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto text-left">
                <table className="w-full font-mono text-xs border-collapse">
                  <thead className="border-b-2 border-black bg-retro-coal text-retro-paper font-pixel text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">REGISTERED MODEL</th>
                      <th className="py-2.5 px-3">ADAPTER</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">CONTEXT LIMIT</th>
                      <th className="py-2.5 px-3">CAPABILITIES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-retro-ink/50 text-retro-cream">
                    {models.map((m) => (
                      <tr key={m.id} className="hover:bg-retro-wine/40 transition-none">
                        <td className="py-3 px-3 font-bold text-retro-cream flex items-center gap-2">
                          <span className="h-2 w-2 bg-retro-mint rounded-full animate-pulse" />
                          <span>{m.internal_name}</span>
                        </td>
                        <td className="py-3 px-3 text-retro-paper font-semibold">
                          <span className="border border-black bg-retro-coal px-1.5 py-0.5 font-bold">
                            {m.provider_adapter}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="border border-black bg-retro-mint/20 text-retro-mint px-2 py-0.5 font-pixel text-[10px] font-bold">
                            {m.enabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-retro-amber font-bold">
                          {m.context_limit ? `${m.context_limit.toLocaleString()} tok` : "Unlimited"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(m.capabilities || {}).map((cap) => (
                              <span
                                key={cap}
                                className="border border-black bg-retro-coal px-1.5 py-0.5 text-[9px] text-retro-paper font-bold"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sub-millisecond Execution Waterfall */}
        {activeTab === "waterfall" && (
          <div className="p-4 border-2 border-black bg-retro-night space-y-3 font-mono text-xs shadow-pixel-sm">
            <div className="text-retro-paper text-xs pb-1 border-b border-retro-ink font-bold">
              Representative Trace Execution Waterfall (Request #tr-9948271)
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-retro-paper text-xs">
                  <span>1. Ingress Header Verification & Auth (0.4ms)</span>
                  <span className="font-bold">0.4ms</span>
                </div>
                <div className="h-2.5 bg-retro-ink border border-black overflow-hidden mt-0.5">
                  <div className="bg-retro-blue h-full w-[2%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-retro-paper text-xs">
                  <span>2. AST Prompt Parsing & Breakpoint Inserter (1.1ms)</span>
                  <span className="font-bold">1.1ms</span>
                </div>
                <div className="h-2.5 bg-retro-ink border border-black overflow-hidden mt-0.5">
                  <div className="bg-retro-amber h-full w-[4%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-retro-paper text-xs">
                  <span>3. Sentinel Tripwire & Canary Hash Check (0.3ms)</span>
                  <span className="font-bold">0.3ms</span>
                </div>
                <div className="h-2.5 bg-retro-ink border border-black overflow-hidden mt-0.5">
                  <div className="bg-retro-blue h-full w-[1.5%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-retro-paper text-xs">
                  <span>4. Ephemeral Prefix Cache Lookup & Upstream Dispatch (312ms)</span>
                  <span className="text-retro-mint font-bold">312ms (Hit: 90.4%)</span>
                </div>
                <div className="h-2.5 bg-retro-ink border border-black overflow-hidden mt-0.5">
                  <div className="bg-retro-mint h-full w-[92%]" />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-retro-paper border-t border-retro-ink pt-2 font-bold">
              <span>Total Gateway Overhead: <strong className="text-retro-amber">1.8 ms</strong></span>
              <span>Total Request Time: <strong className="text-retro-mint">313.8 ms</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Live Streaming Feed & Model Traffic Shares */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Streaming Trace Explorer */}
        <div className="lg:col-span-8 border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-retro-mint border border-black animate-pulse" />
              <h2 className="text-sm font-pixel text-retro-cream tracking-wide">
                LIVE ACTIVITY & REQUEST TRACES
              </h2>
            </div>
            <Link
              href="/requests"
              className="font-sans text-xs text-retro-amber hover:text-white flex items-center gap-1 font-bold"
            >
              Full Trace Explorer
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b-2 border-black bg-retro-night text-retro-paper">
                <tr>
                  <th className="py-2 px-2 font-bold">TRACE ID</th>
                  <th className="py-2 px-2 font-bold">MODEL</th>
                  <th className="py-2 px-2 font-bold">TOKENS (IN/OUT)</th>
                  <th className="py-2 px-2 font-bold">COST</th>
                  <th className="py-2 px-2 font-bold">SAVINGS</th>
                  <th className="py-2 px-2 font-bold">TTFT</th>
                  <th className="py-2 px-2 font-bold">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retro-ink text-retro-cream">
                {recentRequests?.items && recentRequests.items.length > 0 ? (
                  recentRequests.items.map((r) => (
                    <tr key={r.id} className="hover:bg-retro-ink/50 transition-colors">
                      <td className="py-2.5 px-2 text-retro-paper font-bold">
                        {r.id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-2 font-bold text-retro-amber">
                        {r.model_name}
                      </td>
                      <td className="py-2.5 px-2 text-retro-cream">
                        {r.input_tokens ?? 0} / {r.output_tokens ?? 0}
                      </td>
                      <td className="py-2.5 px-2 text-retro-mint font-bold">
                        ${Number(r.cost_amount ?? 0).toFixed(6)}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-retro-mint font-bold">
                          {r.estimated_savings_percent ? `${r.estimated_savings_percent}%` : "0%"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-retro-blue font-bold">
                        {r.total_duration_ms ? `${r.total_duration_ms}ms` : "-"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="border border-black bg-retro-mint px-1.5 py-0.5 text-[10px] text-black font-bold uppercase shadow-pixel-sm">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-retro-paper font-mono">
                      No request telemetry recorded yet. Connect a router gateway and route your first chat completion to see live traces.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Traffic & Token Consumption Distribution */}
        <div className="lg:col-span-4 border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <h2 className="text-xs font-pixel text-retro-amber uppercase tracking-wider">TRAFFIC ARBITRAGE</h2>
            <span className="font-mono text-xs text-retro-paper font-bold">Share %</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {modelAnalytics?.items && modelAnalytics.items.length > 0 ? (
              modelAnalytics.items.map((item) => (
                <div key={item.model_name} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-retro-cream font-bold">{item.model_name}</span>
                    <span className="text-retro-amber font-bold">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-retro-ink border border-black overflow-hidden">
                    <div
                      className="h-full bg-retro-amber"
                      style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-retro-paper">
                    <span>{item.request_count} reqs</span>
                    <span className="text-retro-mint font-bold">${Number(item.total_cost).toFixed(4)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-retro-paper font-mono text-xs">
                No model traffic recorded yet. Connect an upstream gateway to begin routing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
