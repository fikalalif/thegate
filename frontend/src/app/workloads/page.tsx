"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Filter,
  Layers,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface WorkloadItem {
  id: string;
  name: string;
  tenantId: string;
  environment: "production" | "staging";
  burnRateTokMin: number;
  p95TtftMs: number;
  monthlySpendUsd: number;
  savingsPercent: number;
  errorBudgetRemaining: string;
  activePolicy: string;
  primaryModel: string;
  cacheBreakpointTokens: number;
  status: "healthy" | "warning";
}

const INITIAL_WORKLOADS: WorkloadItem[] = [
  {
    id: "wl-01",
    name: "finance-agent-service",
    tenantId: "tenant_finops_prod",
    environment: "production",
    burnRateTokMin: 42100,
    p95TtftMs: 298,
    monthlySpendUsd: 1420.5,
    savingsPercent: 84.2,
    errorBudgetRemaining: "99.98% (0.02% used)",
    activePolicy: "Balanced Arbitrage (Prefix Cached)",
    primaryModel: "claude-3-5-sonnet",
    cacheBreakpointTokens: 1024,
    status: "healthy",
  },
  {
    id: "wl-02",
    name: "customer-support-copilot",
    tenantId: "tenant_cx_prod",
    environment: "production",
    burnRateTokMin: 88400,
    p95TtftMs: 210,
    monthlySpendUsd: 380.2,
    savingsPercent: 94.0,
    errorBudgetRemaining: "100.0% (0.00% used)",
    activePolicy: "Economy First (Speculative Decoding)",
    primaryModel: "gpt-4o-mini",
    cacheBreakpointTokens: 512,
    status: "healthy",
  },
  {
    id: "wl-03",
    name: "code-review-pipeline",
    tenantId: "tenant_eng_infra",
    environment: "production",
    burnRateTokMin: 124600,
    p95TtftMs: 340,
    monthlySpendUsd: 2840.0,
    savingsPercent: 78.4,
    errorBudgetRemaining: "99.95% (0.05% used)",
    activePolicy: "Quality Priority (Sonnet Tier 3)",
    primaryModel: "claude-3-5-sonnet",
    cacheBreakpointTokens: 2048,
    status: "healthy",
  },
  {
    id: "wl-04",
    name: "analytics-rag-pipeline",
    tenantId: "tenant_data_science",
    environment: "production",
    burnRateTokMin: 210500,
    p95TtftMs: 312,
    monthlySpendUsd: 4190.8,
    savingsPercent: 86.5,
    errorBudgetRemaining: "99.99% (0.01% used)",
    activePolicy: "Vector Context Breakpoints (2.2k tok)",
    primaryModel: "claude-3-5-sonnet",
    cacheBreakpointTokens: 2200,
    status: "healthy",
  },
];

export default function WorkloadsPage() {
  const [workloads] = useState<WorkloadItem[]>(INITIAL_WORKLOADS);
  const [search, setSearch] = useState("");
  const [selectedWorkload, setSelectedWorkload] = useState<WorkloadItem | null>(null);

  const filtered = workloads.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.tenantId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              AI WORKLOADS REGISTRY
            </h1>
            <PixelBadge variant="mint" size="xs">
              4 ACTIVE
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Multi-tenant workload attribution, token burn rates, P95 TTFT metrics, and error budgets.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <PixelBadge variant="mint" size="sm">
            4 / 4 WORKLOADS HEALTHY
          </PixelBadge>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-black bg-retro-night p-3 shadow-pixel">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-retro-amber" />
          <input
            type="text"
            placeholder="Search workloads by name, tenant ID, or policy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-black bg-retro-ink pl-9 pr-3 py-1.5 font-mono text-xs text-retro-cream placeholder-slate-500 focus:border-retro-amber focus:outline-none shadow-pixel-inset"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Ingress: <strong className="text-retro-amber">465.6k tok/min</strong>
        </div>
      </div>

      {/* Workload Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((w) => (
          <div
            key={w.id}
            onClick={() => setSelectedWorkload(w)}
            className="group cursor-pointer border-2 border-black bg-retro-night p-4 shadow-pixel hover:border-retro-amber hover:shadow-pixel-amber transition space-y-3 relative overflow-hidden active:translate-x-[1px] active:translate-y-[1px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400">{w.tenantId}</span>
              <PixelBadge variant={w.status === "healthy" ? "mint" : "coral"} size="xs">
                {w.environment}
              </PixelBadge>
            </div>

            <div>
              <div className="font-semibold text-white text-xs group-hover:text-brand transition">
                {w.name}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Model: <span className="text-slate-200">{w.primaryModel}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-retro-ink pt-2 text-xs font-mono">
              <div>
                <span className="text-retro-paper block text-[10px] font-bold">BURN RATE</span>
                <span className="text-retro-cream font-bold">
                  {(w.burnRateTokMin / 1000).toFixed(1)}k tok/m
                </span>
              </div>
              <div>
                <span className="text-retro-paper block text-[10px] font-bold">P95 TTFT</span>
                <span className="text-retro-mint font-bold">{w.p95TtftMs} ms</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-retro-paper border-t border-retro-ink pt-2 font-bold">
              <span>Savings:</span>
              <span className="text-retro-mint">-{w.savingsPercent}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Workloads Detailed Table */}
      <div className="border-2 border-black bg-retro-plum overflow-hidden shadow-pixel">
        <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between">
          <h2 className="text-xs font-pixel text-retro-amber uppercase tracking-wider">
            Workload Registry & AST Breakpoints
          </h2>
          <span className="text-retro-paper text-xs font-bold">
            Click row to inspect AST cache boundaries
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b-2 border-black bg-retro-night text-retro-paper">
              <tr>
                <th className="py-2.5 px-3 font-bold">WORKLOAD / TENANT</th>
                <th className="py-2.5 px-3 font-bold">ROUTING POLICY</th>
                <th className="py-2.5 px-3 font-bold">BURN RATE</th>
                <th className="py-2.5 px-3 font-bold">P95 TTFT</th>
                <th className="py-2.5 px-3 font-bold">MONTHLY SPEND</th>
                <th className="py-2.5 px-3 font-bold">ARBITRAGE</th>
                <th className="py-2.5 px-3 font-bold">ERROR BUDGET (5XX)</th>
                <th className="py-2.5 px-3 text-right font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retro-ink text-retro-cream">
              {filtered.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => setSelectedWorkload(w)}
                  className="hover:bg-retro-ink/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-bold text-retro-cream font-sans">{w.name}</div>
                    <div className="text-[10px] text-retro-paper">{w.tenantId}</div>
                  </td>
                  <td className="py-3 px-3 text-retro-amber font-bold">
                    {w.activePolicy}
                  </td>
                  <td className="py-3 px-3 text-retro-cream font-bold">
                    {w.burnRateTokMin.toLocaleString()} tok/min
                  </td>
                  <td className="py-3 px-3 text-retro-mint font-bold">
                    {w.p95TtftMs} ms
                  </td>
                  <td className="py-3 px-3 text-retro-cream font-bold">
                    ${w.monthlySpendUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-retro-mint font-bold">
                    -{w.savingsPercent}%
                  </td>
                  <td className="py-3 px-3 text-retro-paper font-bold">
                    {w.errorBudgetRemaining}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="border border-black bg-retro-night px-2.5 py-1 text-xs text-retro-paper font-bold hover:bg-retro-amber hover:text-black shadow-pixel-sm">
                      Inspect AST
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over AST Boundary Drawer */}
      {selectedWorkload && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl border-l-2 border-black bg-retro-night p-6 shadow-pixel-lg overflow-y-auto space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <h3 className="text-sm font-pixel text-retro-amber flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  {selectedWorkload.name}
                </h3>
                <span className="text-retro-paper text-xs font-bold">{selectedWorkload.tenantId}</span>
              </div>
              <button
                onClick={() => setSelectedWorkload(null)}
                className="border border-black bg-retro-plum px-2.5 py-1 text-retro-cream hover:bg-retro-coral hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* AST Caching Boundaries */}
            <div className="border-2 border-black bg-retro-plum p-4 space-y-3 shadow-pixel">
              <h4 className="text-xs font-pixel text-retro-amber uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                AST Prompt Cache Breakpoints
              </h4>
              <p className="text-xs text-retro-paper font-sans leading-relaxed">
                TheGate autonomously parses incoming payloads for this tenant, injects ephemeral cache markers at static prefix boundaries, reducing uncached input tokens by 84%.
              </p>
              <div className="border border-black bg-retro-night p-3 space-y-2 text-xs shadow-pixel-sm">
                <div className="flex justify-between">
                  <span className="text-retro-paper">Static System Schema Boundary:</span>
                  <span className="text-retro-mint font-bold">&gt; 1,024 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-retro-paper">Vector Context Chunk Boundary:</span>
                  <span className="text-retro-mint font-bold">{selectedWorkload.cacheBreakpointTokens} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-retro-paper">Ephemeral Cache TTL Window:</span>
                  <span className="text-retro-amber font-bold">5 minutes (mean interval: 18.4s)</span>
                </div>
              </div>
            </div>

            {/* Ingress Sentinel Tripwire Thresholds */}
            <div className="border-2 border-black bg-retro-plum p-4 space-y-3 shadow-pixel">
              <h4 className="text-xs font-pixel text-retro-cream uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-retro-mint" />
                Tripwire & Fallback Rules
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-retro-ink pb-1.5">
                  <span className="text-retro-paper">P95 TTFT Ceiling:</span>
                  <span className="text-retro-mint font-bold">&lt; 650 ms sustained 30s</span>
                </div>
                <div className="flex justify-between border-b border-retro-ink pb-1.5">
                  <span className="text-retro-paper">Fallback Drain Action:</span>
                  <span className="text-retro-cream font-bold">Direct Baseline Ingress (Zero-Drop)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-retro-paper">Tenant Rate Limit:</span>
                  <span className="text-retro-cream font-bold">2,000 req / min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
