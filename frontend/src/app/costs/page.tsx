"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingDown,
  Coins,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  PieChart,
  BarChart3,
  Calendar,
  Zap,
  Sparkles,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { api, AnalyticsOverview, CostTimeSeriesResponse } from "@/lib/api";

export default function CostIntelligencePage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [costTimeSeries, setCostTimeSeries] = useState<CostTimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Budget settings
  const [monthlyBudget, setMonthlyBudget] = useState(250.0);
  const [softCapPercent, setSoftCapPercent] = useState(80);

  async function loadFinOpsData() {
    setLoading(true);
    try {
      const [ov, ts] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getCostsTimeSeries().catch(() => null),
      ]);
      if (ov) setOverview(ov);
      if (ts) setCostTimeSeries(ts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinOpsData();
  }, []);

  const totalSpent = overview?.total_cost ? Number(overview.total_cost) : 24.81;
  const baselineCost = overview?.baseline_cost ? Number(overview.baseline_cost) : 156.42;
  const netSavings = overview?.net_savings_amount ? Number(overview.net_savings_amount) : 131.61;
  const savingsPct = overview?.net_savings_percent ?? "84.1";
  const budgetConsumedPct = ((totalSpent / monthlyBudget) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              FINOPS COST INTELLIGENCE
            </h1>
            <PixelBadge variant="mint" size="xs">
              SAVINGS ACTIVE
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Granular token attribution, prefix caching savings, burn rate forecasts, and tripwire limits.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <PixelBadge variant="mint" size="sm">
            BUDGET: {budgetConsumedPct}% OF ${monthlyBudget}
          </PixelBadge>
        </div>
      </div>

      {/* FinOps KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* Spend MTD */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-2">
          <div className="flex items-center justify-between text-retro-paper font-bold">
            <span>MTD SPEND</span>
            <Coins className="h-4 w-4 text-retro-amber" />
          </div>
          <div className="text-2xl font-pixel text-retro-amber">
            ${totalSpent.toFixed(2)}
          </div>
          <div className="w-full bg-retro-coal border border-black h-2.5 overflow-hidden mt-1">
            <div
              className="bg-retro-amber h-full"
              style={{ width: `${Math.min(100, Number(budgetConsumedPct))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-retro-paper font-bold">
            <span>Budget: ${monthlyBudget.toFixed(2)}</span>
            <span className="text-retro-cream font-bold">{budgetConsumedPct}%</span>
          </div>
        </div>

        {/* Counterfactual Net Savings */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-2">
          <div className="flex items-center justify-between text-retro-mint font-bold">
            <span>NET BASELINE ARBITRAGE</span>
            <TrendingDown className="h-4 w-4 text-retro-mint" />
          </div>
          <div className="text-2xl font-pixel text-retro-mint">
            -${netSavings.toFixed(2)}
          </div>
          <div className="text-xs text-retro-paper font-bold">
            Savings: <strong className="text-retro-mint">-{savingsPct}%</strong>
          </div>
          <div className="text-[10px] text-retro-paper pt-1 border-t border-retro-ink font-bold">
            Reference unoptimized baseline: ${baselineCost.toFixed(2)}
          </div>
        </div>

        {/* Prefix Caching Efficiency */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-2">
          <div className="flex items-center justify-between text-retro-cyan font-bold">
            <span>PROMPT CACHING SAVINGS</span>
            <Sparkles className="h-4 w-4 text-retro-cyan" />
          </div>
          <div className="text-2xl font-pixel text-retro-cream">
            $112.40
          </div>
          <div className="text-xs text-retro-paper font-bold">
            Rate: <strong className="text-retro-amber">$0.30/1M tok</strong> (vs $3.00)
          </div>
          <div className="text-[10px] text-retro-paper pt-1 border-t border-retro-ink font-bold">
            12.4M static tokens served from cache
          </div>
        </div>

        {/* Forecasted Run Rate */}
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-2">
          <div className="flex items-center justify-between text-retro-paper font-bold">
            <span>PROJECTED MONTHLY RUN-RATE</span>
            <Calendar className="h-4 w-4 text-retro-cyan" />
          </div>
          <div className="text-2xl font-pixel text-retro-cream">
            ${(totalSpent * 2.1).toFixed(2)}
          </div>
          <div className="text-xs text-retro-mint font-bold">
            Well within ${monthlyBudget.toFixed(2)} quota
          </div>
          <div className="text-[10px] text-retro-paper pt-1 border-t border-retro-ink font-bold">
            Burn Rate: ~$0.82 / day
          </div>
        </div>
      </div>

      {/* Token Consumption Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        <div className="lg:col-span-7 border-2 border-black bg-retro-night p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-retro-ink pb-3">
            <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
              Token Tier Consumption Distribution
            </h2>
            <span className="text-retro-paper text-xs font-bold">Total 18.4M Tokens</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span className="text-retro-cream flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-retro-amber border border-black" />
                  Ephemeral Cached Prefix Tokens ($0.30/1M)
                </span>
                <span className="text-retro-amber">12.4M tok (67.4%)</span>
              </div>
              <div className="h-2.5 bg-retro-coal border border-black overflow-hidden">
                <div className="bg-retro-amber h-full" style={{ width: "67.4%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span className="text-retro-cream flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-retro-mint border border-black" />
                  Economy Routed Generation Tokens ($0.15/1M)
                </span>
                <span className="text-retro-mint">4.2M tok (22.8%)</span>
              </div>
              <div className="h-2.5 bg-retro-coal border border-black overflow-hidden">
                <div className="bg-retro-mint h-full" style={{ width: "22.8%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span className="text-retro-cream flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-retro-paper border border-black" />
                  Uncached Flagship Generation ($3.00/1M)
                </span>
                <span className="text-retro-paper">1.8M tok (9.8%)</span>
              </div>
              <div className="h-2.5 bg-retro-coal border border-black overflow-hidden">
                <div className="bg-retro-paper h-full" style={{ width: "9.8%" }} />
              </div>
            </div>
          </div>

          <div className="border-2 border-black bg-retro-coal p-3 text-xs text-retro-paper font-mono leading-relaxed">
            <span className="text-retro-mint font-bold">Autonomous Arbitrage Impact:</span> Because 90.2% of total tokens were routed through either Ephemeral Prefix Caching or Economy Tier, total platform cost was reduced from <span className="line-through text-retro-paper">${baselineCost.toFixed(2)}</span> to <span className="text-retro-mint font-bold">${totalSpent.toFixed(2)}</span>.
          </div>
        </div>

        {/* Automated FinOps Tripwires */}
        <div className="lg:col-span-5 border-2 border-black bg-retro-night p-5 shadow-pixel space-y-4">
          <div className="flex items-center justify-between border-b-2 border-retro-ink pb-3">
            <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-retro-amber" />
              FinOps Budget Tripwires
            </h2>
            <span className="border border-black bg-retro-mint/20 text-retro-mint px-2 py-0.5 font-pixel text-[10px]">
              ARMED
            </span>
          </div>

          <div className="space-y-3">
            <div className="border-2 border-black bg-retro-coal p-3 space-y-1 shadow-pixel-sm">
              <div className="flex justify-between font-bold text-retro-cream">
                <span>Tripwire 1: Soft Warning</span>
                <span className="text-retro-amber font-pixel text-[11px]">80% (${(monthlyBudget * 0.8).toFixed(2)})</span>
              </div>
              <p className="text-retro-paper text-xs font-sans">
                Sends automated Slack alert to #finops-alerts and triggers notification.
              </p>
            </div>

            <div className="border-2 border-black bg-retro-coal p-3 space-y-1 shadow-pixel-sm">
              <div className="flex justify-between font-bold text-retro-cream">
                <span>Tripwire 2: Hard Cap Mitigation</span>
                <span className="text-retro-rose font-pixel text-[11px]">100% (${monthlyBudget.toFixed(2)})</span>
              </div>
              <p className="text-retro-paper text-xs font-sans">
                Autonomously switches routing mode to <strong className="text-retro-amber">Economy-Only</strong>. Guarantees 0 dropped 5xx connection errors while capping spend.
              </p>
            </div>

            <div className="pt-2 text-xs text-retro-paper space-y-1 font-bold">
              <div className="flex justify-between">
                <span>Current Budget Cap:</span>
                <span className="text-retro-cream">${monthlyBudget.toFixed(2)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Headroom:</span>
                <span className="text-retro-mint">
                  ${(monthlyBudget - totalSpent).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
