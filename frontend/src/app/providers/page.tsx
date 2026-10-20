"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Database,
  CheckCircle2,
  RefreshCw,
  Key,
  Shield,
  Clock,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Link2,
  Trash2,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import {
  api,
  ModelRegistryItem,
  RouterConfigResponse,
  RouterTestResponse,
} from "@/lib/api";

const ROUTER_PRESETS = [
  {
    id: "9router",
    name: "9Router",
    url: "http://localhost:20128/v1",
    adapter: "ninerouter",
    badge: "Recommended",
    hint: "Official 9Router instance running locally or in Docker",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    adapter: "ninerouter",
    badge: "Cloud Gateway",
    hint: "Global unified API for 200+ models",
  },
  {
    id: "litellm",
    name: "LiteLLM Proxy",
    url: "http://localhost:4000/v1",
    adapter: "ninerouter",
    badge: "Proxy",
    hint: "Self-hosted LiteLLM OpenAI-compatible proxy",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    url: "http://localhost:11434/v1",
    adapter: "ninerouter",
    badge: "Local AI",
    hint: "Local inference without external API keys",
  },
  {
    id: "custom",
    name: "Custom Router",
    url: "",
    adapter: "ninerouter",
    badge: "OpenAI-Compat",
    hint: "Any OpenAI-compatible v1 chat completion router",
  },
];

export default function ProvidersPage() {
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Router Connection States
  const [routerConfig, setRouterConfig] = useState<RouterConfigResponse | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("9router");
  const [baseUrlInput, setBaseUrlInput] = useState<string>("http://localhost:20128/v1");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [timeoutInput, setTimeoutInput] = useState<number>(60);
  const [testResult, setTestResult] = useState<RouterTestResponse | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [modelsData, configData] = await Promise.all([
        api.getModels().catch(() => []),
        api.getRouterConfig().catch(() => null),
      ]);
      setModels(modelsData);
      if (configData) {
        setRouterConfig(configData);
        setBaseUrlInput(configData.base_url || "http://localhost:8080/v1");
        setTimeoutInput(configData.timeout_seconds || 60);

        // Match preset
        if (configData.provider_adapter === "mock") {
          setSelectedPreset("mock");
        } else if (configData.base_url.includes("openrouter.ai")) {
          setSelectedPreset("openrouter");
        } else if (configData.base_url.includes("4000")) {
          setSelectedPreset("litellm");
        } else if (configData.base_url.includes("11434")) {
          setSelectedPreset("ollama");
        } else if (configData.base_url.includes("8080") || configData.base_url.includes("20000")) {
          setSelectedPreset("9router");
        } else {
          setSelectedPreset("custom");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setTestResult(null);
    const p = ROUTER_PRESETS.find((item) => item.id === presetId);
    if (p && p.url) {
      setBaseUrlInput(p.url);
    }
  };

  const handleTestConnection = async () => {
    if (!baseUrlInput.trim()) {
      setTestResult({
        success: false,
        latency_ms: null,
        status_code: null,
        message: "Please enter a valid Router Base URL.",
        detected_models: [],
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testRouterConnection({
        base_url: baseUrlInput.trim(),
        api_key: apiKeyInput.trim() || undefined,
        timeout_seconds: 5.0,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        latency_ms: null,
        status_code: null,
        message: err.message || "Network test failed.",
        detected_models: [],
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveRouterConfig = async () => {
    if (!baseUrlInput.trim() && selectedPreset !== "mock") {
      setToastMessage({ text: "Router Base URL cannot be empty.", type: "error" });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSaving(true);
    try {
      const adapter = selectedPreset === "mock" ? "mock" : "ninerouter";
      const res = await api.updateRouterConfig({
        provider_adapter: adapter,
        base_url: baseUrlInput.trim(),
        api_key: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        timeout_seconds: timeoutInput,
      });
      setRouterConfig(res);
      setToastMessage({
        text: `✓ Router connected & saved! Ingress pointing to [${res.base_url}]`,
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
      loadData();
    } catch (err: any) {
      setToastMessage({
        text: `Failed to save configuration: ${err.message}`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncModels = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncRouterModels();
      setToastMessage({
        text: `✓ Successfully synchronized ${res.synced_count} real models from gateway!`,
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setToastMessage({
        text: `Sync failed: ${err.message}`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearModels = async () => {
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
        text: "✓ Model catalog cleared. Database is in zero-models state.",
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setToastMessage({
        text: `Failed to clear models: ${err.message}`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsClearing(false);
    }
  };

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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              MODELS & PROVIDERS
            </h1>
            <PixelBadge variant="mint" size="xs">
              {models.length} LINKED
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Downstream router connector, connection testing, encrypted vault, and pricing catalog.
          </p>
        </div>
        <PixelButton
          size="sm"
          variant="plum"
          icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-retro-amber" : ""}`} />}
          onClick={loadData}
          disabled={loading}
        >
          Sync Providers
        </PixelButton>
      </div>

      {/* ========================================================
          Interactive Downstream Router Connection Panel (No .env)
          ======================================================== */}
      <div className="border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <Link2 className="h-5 w-5 text-retro-amber" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
                  Connect Downstream Router (9Router / OpenRouter / Ollama)
                </h2>
                <PixelBadge variant="amber" size="xs">
                  Zero .env Required
                </PixelBadge>
              </div>
              <p className="font-mono text-[11px] text-retro-paper mt-0.5">
                Connect TheGate directly to 9Router or any OpenAI-compatible router without editing config files.
              </p>
            </div>
          </div>

          {/* Current Live Status Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border-2 border-black bg-retro-night px-3 py-1 text-xs font-mono shadow-pixel-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  routerConfig?.is_connected
                    ? "bg-retro-mint animate-pulse"
                    : "bg-retro-coral"
                }`}
              />
              <span className="font-bold text-retro-cream">
                {routerConfig?.provider_adapter === "mock"
                  ? "MOCK MODE (LOCAL)"
                  : routerConfig?.is_connected
                  ? "ROUTER: ONLINE"
                  : "ROUTER: DISCONNECTED"}
              </span>
              {routerConfig?.last_ping_ms && (
                <span className="text-retro-mint font-bold">
                  ({routerConfig.last_ping_ms}ms)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div>
          <label className="block font-pixel text-[10px] uppercase tracking-wider text-retro-paper mb-2">
            Select Router Preset:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {ROUTER_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex flex-col justify-between p-2.5 text-left border-2 font-mono transition-none cursor-pointer ${
                    isSelected
                      ? "border-black bg-retro-amber text-black shadow-pixel-sm"
                      : "border-black bg-retro-night text-retro-cream hover:bg-retro-sand hover:text-black"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">{preset.name}</span>
                    <span
                      className={`text-[9px] uppercase px-1 py-0.2 border ${
                        isSelected
                          ? "bg-black text-retro-amber border-black"
                          : "bg-retro-ink text-retro-paper border-black"
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <span className="text-[10px] mt-1 line-clamp-1 opacity-80">
                    {preset.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connection Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Base URL */}
          <div className="md:col-span-6 space-y-1">
            <label className="block font-mono text-xs font-bold text-retro-cream">
              Router Base URL:
            </label>
            <div className="relative">
              <input
                type="text"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder="http://localhost:8080/v1"
                className="w-full border-2 border-black bg-retro-night px-3 py-2 text-xs font-mono text-retro-cream shadow-pixel-sm focus:border-retro-amber focus:outline-none"
              />
            </div>
            <span className="text-[10px] font-mono text-retro-paper">
              Default 9Router port is typically <code className="text-retro-amber">8080</code> or <code className="text-retro-amber">20000</code>.
            </span>
          </div>

          {/* API Key */}
          <div className="md:col-span-4 space-y-1">
            <label className="block font-mono text-xs font-bold text-retro-cream">
              Router API Key / Bearer Token:
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  routerConfig?.api_key_masked
                    ? `Current: ${routerConfig.api_key_masked}`
                    : "Leave empty if not required"
                }
                className="w-full border-2 border-black bg-retro-night pl-3 pr-9 py-2 text-xs font-mono text-retro-cream shadow-pixel-sm focus:border-retro-amber focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2.5 text-retro-paper hover:text-retro-amber"
                title={showApiKey ? "Hide Key" : "Show Key"}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-[10px] font-mono text-retro-paper">
              Saved securely into active runtime configuration.
            </span>
          </div>

          {/* Timeout */}
          <div className="md:col-span-2 space-y-1">
            <label className="block font-mono text-xs font-bold text-retro-cream">
              Timeout (sec):
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={timeoutInput}
              onChange={(e) => setTimeoutInput(Number(e.target.value) || 60)}
              className="w-full border-2 border-black bg-retro-night px-3 py-2 text-xs font-mono text-retro-cream shadow-pixel-sm focus:border-retro-amber focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-black">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 border-2 border-black bg-retro-night px-3.5 py-1.5 font-pixel text-xs text-retro-amber shadow-pixel hover:bg-retro-sand hover:text-black transition-none active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`h-3.5 w-3.5 ${isTesting ? "animate-spin text-retro-mint" : "text-retro-amber"}`} />
              <span>{isTesting ? "TESTING..." : "TEST CONNECTION"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveRouterConfig}
              disabled={isSaving}
              className="flex items-center gap-1.5 border-2 border-black bg-retro-mint px-4 py-1.5 font-pixel text-xs text-black shadow-pixel hover:bg-retro-amber transition-none active:translate-y-0.5 disabled:opacity-50 cursor-pointer font-bold"
            >
              <Save className="h-3.5 w-3.5 text-black" />
              <span>{isSaving ? "SAVING..." : "SAVE & CONNECT ROUTER"}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncModels}
              disabled={isSyncing}
              className="flex items-center gap-1.5 border-2 border-black bg-retro-amber px-3.5 py-1.5 font-pixel text-xs text-black shadow-pixel hover:bg-retro-sand transition-none active:translate-y-0.5 disabled:opacity-50 cursor-pointer font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-black" : "text-black"}`} />
              <span>{isSyncing ? "SYNCING..." : "SYNC REAL MODELS"}</span>
            </button>

            {models.length > 0 && (
              <button
                type="button"
                onClick={handleClearModels}
                disabled={isClearing}
                className="flex items-center gap-1.5 border-2 border-black bg-retro-coral px-3.5 py-1.5 font-pixel text-xs text-white shadow-pixel hover:bg-red-700 transition-none active:translate-y-0.5 disabled:opacity-50 cursor-pointer font-bold"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
                <span>{isClearing ? "CLEARING..." : "CLEAR CATALOG"}</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-retro-paper">
            Current Target: <span className="font-bold text-retro-cream">{routerConfig?.base_url || "None"}</span>
          </div>
        </div>

        {/* Test Result Feedback Box */}
        {testResult && (
          <div
            className={`border-2 border-black p-3 font-mono text-xs shadow-pixel-sm ${
              testResult.success
                ? "bg-retro-night border-l-4 border-l-retro-mint text-retro-cream"
                : "bg-retro-night border-l-4 border-l-retro-coral text-retro-cream"
            }`}
          >
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-retro-mint mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-retro-coral mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{testResult.success ? "PROBE SUCCESSFUL" : "PROBE FAILED"}</span>
                  {testResult.latency_ms && (
                    <span className="text-retro-mint">
                      [Round-trip: {testResult.latency_ms} ms]
                    </span>
                  )}
                  {testResult.status_code && (
                    <span className="text-retro-paper">
                      [HTTP {testResult.status_code}]
                    </span>
                  )}
                </div>
                <p className="text-xs text-retro-paper">{testResult.message}</p>

                {testResult.detected_models.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-[10px] uppercase font-bold text-retro-paper block mb-1">
                      Detected Upstream Models:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {testResult.detected_models.map((mod) => (
                        <span
                          key={mod}
                          className="border border-black bg-retro-ink px-1.5 py-0.5 text-[10px] text-retro-amber font-mono"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Downstream Gateway & Telemetry */}
      <div className="border-2 border-black bg-retro-plum p-5 shadow-pixel space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-retro-amber" />
            <h2 className="text-xs font-pixel text-retro-cream uppercase tracking-wider">
              ACTIVE DOWNSTREAM ROUTER GATEWAY STATUS
            </h2>
          </div>
          <span className="text-retro-paper text-xs font-bold">
            Ingress Invariant: Zero Prompt Persistence (ADR-004)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="border-2 border-black bg-retro-night p-3.5 space-y-1 shadow-pixel-sm">
            <span className="text-[10px] text-retro-paper uppercase font-bold block">Target Ingress Endpoint</span>
            <span className="text-retro-cream font-bold text-xs truncate block" title={routerConfig?.base_url || "None"}>
              {routerConfig?.base_url || "Not configured"}
            </span>
          </div>

          <div className="border-2 border-black bg-retro-night p-3.5 space-y-1 shadow-pixel-sm">
            <span className="text-[10px] text-retro-paper uppercase font-bold block">Adapter Driver</span>
            <span className="text-retro-amber font-bold text-xs block">
              {routerConfig?.provider_adapter === "ninerouter"
                ? "9Router Adapter (OpenAI-Compat)"
                : routerConfig?.provider_adapter === "mock"
                ? "Local Mock Adapter"
                : routerConfig?.provider_adapter || "Unknown"}
            </span>
          </div>

          <div className="border-2 border-black bg-retro-night p-3.5 space-y-1 shadow-pixel-sm">
            <span className="text-[10px] text-retro-paper uppercase font-bold block">Live Probe Latency</span>
            <span className="text-retro-mint font-bold text-xs block">
              {routerConfig?.last_ping_ms ? `${routerConfig.last_ping_ms} ms RTT` : "Probe required"}
            </span>
          </div>

          <div className="border-2 border-black bg-retro-night p-3.5 space-y-1 shadow-pixel-sm">
            <span className="text-[10px] text-retro-paper uppercase font-bold block">Catalog Synchronized</span>
            <span className="text-retro-mint font-bold text-xs block">
              {models.length} Real Models Linked
            </span>
          </div>
        </div>
      </div>

      {/* Model Catalog & Versioned Pricing Table */}
      <div className="overflow-hidden border-2 border-black bg-retro-plum shadow-pixel font-mono text-xs">
        <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between">
          <h2 className="text-xs font-pixel text-retro-amber uppercase tracking-wider">
            Model Registry & Versioned Pricing Catalog
          </h2>
          <span className="text-retro-paper text-xs font-bold">Rates per 1,000,000 tokens</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b-2 border-black bg-retro-night text-retro-paper">
              <tr>
                <th className="py-2.5 px-3 font-bold">MODEL IDENTIFIER</th>
                <th className="py-2.5 px-3 font-bold">ADAPTER</th>
                <th className="py-2.5 px-3 font-bold">CONTEXT WINDOW</th>
                <th className="py-2.5 px-3 font-bold">INPUT / 1M TOKENS</th>
                <th className="py-2.5 px-3 font-bold">OUTPUT / 1M TOKENS</th>
                <th className="py-2.5 px-3 font-bold">CAPABILITIES</th>
                <th className="py-2.5 px-3 font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retro-ink text-retro-cream">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-retro-paper font-sans">
                    Loading model registry from backend...
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-retro-paper font-mono">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <Database className="h-8 w-8 text-retro-amber opacity-70" />
                      <div className="font-bold text-retro-cream text-sm">
                        Zero Models Registered
                      </div>
                      <p className="text-xs text-retro-paper max-w-md">
                        TheGate operates strictly on real upstream data. If your downstream AI router is connected, click &quot;Sync Real Models&quot; to populate your active catalog.
                      </p>
                      <button
                        type="button"
                        onClick={handleSyncModels}
                        disabled={isSyncing}
                        className="mt-2 flex items-center gap-1.5 border-2 border-black bg-retro-amber px-4 py-2 font-pixel text-xs text-black shadow-pixel hover:bg-retro-sand transition-none active:translate-y-0.5 font-bold cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        <span>{isSyncing ? "SYNCING..." : "SYNC REAL MODELS FROM GATEWAY"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                models.map((m) => {
                  const activePricing =
                    m.pricing_entries && m.pricing_entries.length > 0
                      ? m.pricing_entries[0]
                      : null;
                  const isBaseline = m.internal_name === "gpt-4o";

                  return (
                    <tr key={m.id} className="hover:bg-retro-ink/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-retro-cream">{m.internal_name}</span>
                          {isBaseline && (
                            <span className="border border-black bg-retro-amber text-black px-1.5 py-0.5 text-[9px] font-sans font-bold shadow-pixel-sm">
                              Reference Baseline
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-retro-paper font-sans">
                          ID: {m.backend_model_id}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-retro-cream">
                        <span className="border border-black bg-retro-night px-2 py-0.5 font-bold shadow-pixel-sm">
                          {m.provider_adapter}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-retro-cream font-bold">
                        {m.context_limit
                          ? `${m.context_limit.toLocaleString()} tokens`
                          : "Unlimited"}
                      </td>
                      <td className="py-3 px-3 text-retro-mint font-bold">
                        {activePricing ? `$${activePricing.input_price_per_million}` : "N/A"}
                      </td>
                      <td className="py-3 px-3 text-retro-mint font-bold">
                        {activePricing ? `$${activePricing.output_price_per_million}` : "N/A"}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(m.capabilities).map((cap) => (
                            <span
                              key={cap}
                              className="border border-black bg-retro-night px-1.5 py-0.5 text-[10px] text-retro-paper font-bold shadow-pixel-sm"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className="flex items-center gap-1 text-retro-mint text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
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
