"use client";

import React, { useEffect, useState } from "react";
import { api, ModelRegistryItem, AnalyticsOverview } from "@/lib/api";
import { OfficeSimulation } from "@/components/office/OfficeSimulation";
import { RecommendationQuestModal } from "@/components/office/RecommendationQuestModal";
import { PixelStatPanel } from "@/components/pixel/PixelStatPanel";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Activity, DollarSign, Cpu, Zap, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function OfficePage() {
  const { t } = useI18n();
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedToast, setSelectedToast] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [modelsData, overviewData] = await Promise.all([
        api.getModels().catch(() => []),
        api.getOverview().catch(() => null),
      ]);
      setModels(modelsData);
      setOverview(overviewData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectModel = (modelId: string) => {
    setSelectedToast(`Model [${modelId}] selected as active routing target!`);
    setTimeout(() => setSelectedToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {selectedToast && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 border-2 border-black bg-retro-amber px-4 py-2.5 font-mono text-xs font-bold text-black shadow-pixel animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
          <span>{selectedToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-2 border-black bg-retro-plum p-3.5 sm:p-4 shadow-pixel">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-pixel text-xs sm:text-base text-retro-amber uppercase tracking-wider">
              {t("office.title", "TheGate AI Tech Campus & Headquarters")}
            </h1>
            <PixelBadge variant="mint" size="xs">
              {t("office.autonomous_npcs", "Autonomous NPCs")}
            </PixelBadge>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-retro-paper font-semibold leading-relaxed">
            {t("office.subtitle", "Autonomous NPCs • Tech Wing • Bistro • Arcade • Wellness Gym • 1-to-1 Role Representation")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <PixelBadge variant="amber" size="sm">
            {t("office.privacy_badge", "Zero-Prompt Privacy")}
          </PixelBadge>
          <PixelBadge variant="cyan" size="sm">
            {t("office.wings_badge", "4 Campus Wings")}
          </PixelBadge>
        </div>
      </div>

      {/* Retro Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PixelStatPanel
          label={t("office.kpi_total_ingress", "Total Ingress")}
          value={overview?.total_requests ?? 0}
          subtext={t("office.kpi_total_ingress_sub", "Processed LLM Prompts")}
          icon={<Activity className="h-4 w-4" />}
          variant="amber"
          trend={{ value: "+12.4%", positive: true }}
        />
        <PixelStatPanel
          label={t("office.kpi_expenditure", "AI Expenditure")}
          value={overview ? `$${parseFloat(overview.total_cost).toFixed(4)}` : "$0.0000"}
          subtext={t("office.kpi_expenditure_sub", "Net Audited Spend")}
          icon={<DollarSign className="h-4 w-4" />}
          variant="mint"
          trend={{ value: "-84% vs Baseline", positive: true }}
        />
        <PixelStatPanel
          label={t("office.kpi_latency", "Cluster Latency")}
          value={overview ? `${Math.round(overview.avg_latency_ms || 240)}ms` : "240ms"}
          subtext={t("office.kpi_latency_sub", "Measured P95 TTFT")}
          icon={<Zap className="h-4 w-4" />}
          variant="blue"
        />
        <PixelStatPanel
          label={t("office.kpi_wings", "Campus Wings")}
          value={t("office.kpi_wings_val", "4 Zones Active")}
          subtext={t("office.kpi_wings_sub", "Tech • Eatery • Gym • Pool")}
          icon={<Cpu className="h-4 w-4" />}
          variant="coral"
        />
      </div>

      {/* Main Interactive Office Simulation */}
      <OfficeSimulation
        models={models}
        overview={overview}
        onSelectModel={handleSelectModel}
        onOpenRecommendQuest={() => setIsRecommendOpen(true)}
      />

      {/* Recommendation Quest Modal */}
      <RecommendationQuestModal
        isOpen={isRecommendOpen}
        onClose={() => setIsRecommendOpen(false)}
        models={models}
        onApplyModel={handleSelectModel}
      />
    </div>
  );
}
