"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, CheckCircle2, RefreshCw, Trash2, AlertTriangle, Link2 } from "lucide-react";
import { api, ModelRegistryItem } from "@/lib/api";

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadModels() {
    setLoading(true);
    try {
      const data = await api.getModels();
      setModels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncModels() {
    setIsSyncing(true);
    try {
      const res = await api.syncRouterModels();
      setToastMessage({
        text: `✓ Successfully synchronized ${res.synced_count} real models from gateway!`,
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
      await loadModels();
    } catch (err: any) {
      setToastMessage({
        text: `Sync failed: ${err.message}`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleClearModels() {
    if (
      !confirm(
        "Are you sure you want to clear the entire model registry? Real completions will return 503 until models are re-synchronized."
      )
    ) {
      return;
    }
    setIsClearing(true);
    try {
      await api.clearModels();
      setToastMessage({
        text: "✓ Model catalog cleared. Zero models in database.",
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
      await loadModels();
    } catch (err: any) {
      setToastMessage({
        text: `Clear failed: ${err.message}`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsClearing(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 flex items-center gap-2 border-2 border-black px-4 py-2.5 font-mono text-xs font-bold shadow-pixel animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-retro-mint text-black"
              : "bg-retro-coral text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-pixel text-retro-amber flex items-center gap-2">
            <Database className="h-6 w-6 text-retro-amber" />
            MODEL REGISTRY & PRICING CATALOG
          </h1>
          <p className="font-mono text-xs text-retro-paper mt-1">
            Real upstream candidate models, context boundaries, token pricing, and capability flags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncModels}
            disabled={isSyncing || loading}
            className="border-2 border-black bg-retro-amber text-black px-3.5 py-1.5 font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand active:translate-y-0.5 transition-none flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "SYNCING..." : "SYNC FROM GATEWAY"}
          </button>
          {models.length > 0 && (
            <button
              onClick={handleClearModels}
              disabled={isClearing || loading}
              className="border-2 border-black bg-retro-coral text-white px-3 py-1.5 font-pixel text-xs shadow-pixel-sm hover:bg-red-700 active:translate-y-0.5 transition-none flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5 text-white" />
              {isClearing ? "CLEARING..." : "CLEAR"}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden border-2 border-black bg-retro-night shadow-pixel font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b-2 border-black bg-retro-coal text-retro-paper font-pixel text-[11px]">
              <tr>
                <th className="py-2.5 px-4">MODEL IDENTIFIER</th>
                <th className="py-2.5 px-4">ADAPTER</th>
                <th className="py-2.5 px-4">CONTEXT WINDOW</th>
                <th className="py-2.5 px-4">INPUT / 1M TOK</th>
                <th className="py-2.5 px-4">OUTPUT / 1M TOK</th>
                <th className="py-2.5 px-4">CAPABILITIES</th>
                <th className="py-2.5 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-retro-ink/50 text-retro-cream">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-retro-paper font-mono">
                    Loading model registry from backend...
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-retro-paper font-mono">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Database className="h-8 w-8 text-retro-amber opacity-60" />
                      <div className="font-bold text-retro-cream text-sm">
                        Zero Upstream Models Registered
                      </div>
                      <p className="text-xs text-retro-paper max-w-md">
                        TheGate does not display dummy static models. To populate the real catalog, connect to your router gateway or trigger a sync.
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={handleSyncModels}
                          disabled={isSyncing}
                          className="flex items-center gap-1.5 border-2 border-black bg-retro-amber px-4 py-2 font-pixel text-xs text-black shadow-pixel hover:bg-retro-sand transition-none active:translate-y-0.5 font-bold cursor-pointer"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          <span>{isSyncing ? "Syncing..." : "Sync Real Models"}</span>
                        </button>
                        <Link
                          href="/providers"
                          className="flex items-center gap-1.5 border-2 border-black bg-retro-coal px-4 py-2 font-pixel text-xs text-retro-cream shadow-pixel hover:bg-retro-wine transition-none active:translate-y-0.5 font-bold"
                        >
                          <Link2 className="h-3.5 w-3.5 text-retro-amber" />
                          <span>Configure Router Ingress</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                models.map((m) => {
                  const activePricing = m.pricing_entries && m.pricing_entries.length > 0
                    ? m.pricing_entries[0]
                    : null;
                  const isBaseline = m.internal_name === "gpt-4o";

                  return (
                    <tr key={m.id} className="hover:bg-retro-wine/40 transition-none">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-retro-cream">{m.internal_name}</span>
                          {isBaseline && (
                            <span className="border border-black bg-retro-coal text-retro-paper px-1.5 py-0.5 font-pixel text-[9px]">
                              Baseline Ref
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-retro-paper font-mono">
                          ID: {m.backend_model_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-retro-paper font-bold">
                        <span className="border border-black bg-retro-coal px-2 py-0.5">
                          {m.provider_adapter}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-retro-paper font-semibold">
                        {m.context_limit ? `${m.context_limit.toLocaleString()} tok` : "Unlimited"}
                      </td>
                      <td className="py-3 px-4 text-retro-amber font-bold">
                        {activePricing ? `$${activePricing.input_price_per_million}` : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-retro-amber font-bold">
                        {activePricing ? `$${activePricing.output_price_per_million}` : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-retro-paper">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(m.capabilities).map((cap) => (
                            <span
                              key={cap}
                              className="border border-black bg-retro-coal px-1.5 py-0.5 font-pixel text-[9px] text-retro-paper"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-retro-mint font-pixel text-[10px] font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
