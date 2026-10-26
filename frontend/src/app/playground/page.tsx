"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlayCircle,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Coins,
  Cpu,
  Layers,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { DEFAULT_API_KEY, api, ModelRegistryItem } from "@/lib/api";

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an intelligent, helpful AI assistant running behind TheGate routing layer."
  );
  const [userPrompt, setUserPrompt] = useState(
    "Explain how TheGate optimizes AI model costs and reduces expenses transparently."
  );

  useEffect(() => {
    api
      .getModels()
      .then((data) => setModels(data))
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, []);

  const [loading, setLoading] = useState(false);
  const [completionText, setCompletionText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Result metadata from response or recent log
  const [resultMetadata, setResultMetadata] = useState<{
    modelUsed: string;
    routingReason?: string;
    inputTokens?: number;
    outputTokens?: number;
    costAmount?: string;
    baselineCost?: string;
    savingsPercent?: string;
    durationMs?: number;
  } | null>(null);

  async function handleSend() {
    if (!userPrompt.trim()) return;

    setLoading(true);
    setCompletionText("");
    setErrorText(null);
    setResultMetadata(null);

    const startTime = performance.now();
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4848");

    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    messages.push({ role: "user", content: userPrompt.trim() });

    const payload = {
      messages,
      stream: streamEnabled,
      model: selectedModel === "auto" ? "thegate-auto" : selectedModel,
    };

    try {
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = response.statusText;
        try {
          const errJson = await response.json();
          errMessage = errJson.detail || errJson.error?.message || errMessage;
        } catch {
          // fallback
        }
        throw new Error(`Inference error (${response.status}): ${errMessage}`);
      }

      if (streamEnabled && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulated = "";
        let modelFromChunk = selectedModel;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.model) {
                  modelFromChunk = parsed.model;
                }
                const content = parsed.choices?.[0]?.delta?.content || "";
                accumulated += content;
                setCompletionText(accumulated);
              } catch {
                // partial chunk, ignore
              }
            }
          }
        }

        const endTime = performance.now();
        setResultMetadata({
          modelUsed: modelFromChunk,
          durationMs: Math.round(endTime - startTime),
        });
      } else {
        const data = await response.json();
        const endTime = performance.now();
        const content = data.choices?.[0]?.message?.content || "";
        setCompletionText(content);

        setResultMetadata({
          modelUsed: data.model || selectedModel,
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          durationMs: Math.round(endTime - startTime),
        });
      }
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              INTERACTIVE PLAYGROUND
            </h1>
            <PixelBadge variant="mint" size="xs">
              LIVE INGRESS
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Execute live completions through TheGate edge ingress. Inspect dynamic policy routing, token streaming, and cost savings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="mint" size="sm">
            Zero-Prompt Persistence Guaranteed
          </PixelBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 font-mono text-xs">
        {/* Controls Column */}
        <div className="space-y-4 border-2 border-black bg-retro-night p-5 shadow-pixel lg:col-span-5">
          <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-pixel">
              <Terminal className="h-4 w-4 text-retro-amber" />
              Ingress Parameters
            </h2>
            <span className="text-[10px] text-slate-400">POST /v1/chat/completions</span>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">TheGate Ingress API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="tg_live_..."
              className="w-full border-2 border-black bg-retro-night px-3 py-2 text-xs text-retro-cream font-mono shadow-pixel-sm focus:border-retro-amber focus:outline-none"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-retro-paper uppercase font-pixel font-bold">Policy & Model Mode</label>
              <span className="text-xs text-retro-amber font-bold">
                {selectedModel === "auto" ? "TheGate Auto-Arbitrage" : "Explicit Policy / Model"}
              </span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border-2 border-black bg-retro-night px-3 py-2 text-xs text-retro-cream font-mono shadow-pixel-sm focus:border-retro-amber focus:outline-none cursor-pointer"
            >
              <optgroup label="Routing Policies (Dynamic Arbitrage)">
                <option value="auto">✨ thegate-auto (Active Routing Policy)</option>
                <option value="thegate-economy">🟢 thegate-economy (Lowest Unit Cost / High Savings)</option>
                <option value="thegate-balanced">🔵 thegate-balanced (Cost vs Latency Tradeoff)</option>
                <option value="thegate-quality">🟣 thegate-quality (Flagship Tier Prioritization)</option>
              </optgroup>
              <optgroup label={`Real Upstream Models (${models.length} registered)`}>
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.id} value={m.internal_name}>
                      Direct: {m.internal_name} ({m.provider_adapter})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    (No upstream models connected — connect in Providers)
                  </option>
                )}
              </optgroup>
            </select>
          </div>

          {/* Empty Catalog Warning Banner */}
          {!modelsLoading && models.length === 0 && (
            <div className="border-2 border-black bg-retro-coal p-3 flex items-start gap-2.5 text-xs text-retro-amber shadow-pixel-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-retro-amber mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-retro-cream block">No upstream models synchronized</span>
                <p className="text-[11px] text-retro-paper">
                  Inference requests will return HTTP 503 until an AI router gateway is linked and models are synchronized.
                </p>
                <Link
                  href="/providers"
                  className="inline-flex items-center gap-1 font-bold text-retro-mint hover:underline text-[11px] pt-0.5"
                >
                  Configure & Sync Router Gateway &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between border-2 border-black bg-retro-night p-3 shadow-pixel-sm">
            <div>
              <div className="text-xs font-bold text-retro-cream font-sans">Server-Sent Events (SSE) Streaming</div>
              <div className="text-xs text-retro-paper font-sans">Stream tokens chunk-by-chunk in real time</div>
            </div>
            <button
              type="button"
              onClick={() => setStreamEnabled(!streamEnabled)}
              className={`border-2 border-black px-2.5 py-1 text-xs font-pixel font-bold shadow-pixel-sm ${
                streamEnabled ? "bg-retro-mint text-black" : "bg-retro-plum text-retro-paper"
              }`}
            >
              {streamEnabled ? "STREAM ON" : "STREAM OFF"}
            </button>
          </div>

          {/* System Prompt */}
          <div className="space-y-1">
            <label className="text-[10px] text-retro-paper uppercase font-pixel font-bold">System Prompt (Prefix Cacheable)</label>
            <textarea
              rows={2}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full border-2 border-black bg-retro-night p-2.5 text-xs text-retro-cream font-mono shadow-pixel-sm focus:border-retro-amber focus:outline-none"
            />
          </div>

          {/* User Prompt */}
          <div className="space-y-1">
            <label className="text-[10px] text-retro-paper uppercase font-pixel font-bold">User Query / Prompt</label>
            <textarea
              rows={4}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full border-2 border-black bg-retro-night p-2.5 text-xs text-retro-cream font-mono shadow-pixel-sm focus:border-retro-amber focus:outline-none"
            />
          </div>

          {/* Send Button */}
          <PixelButton
            variant="amber"
            size="md"
            className="w-full justify-center"
            onClick={handleSend}
            disabled={loading || !userPrompt.trim()}
            icon={loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          >
            {loading ? "Arbitrating & Routing Stream..." : "Dispatch Ingress Request"}
          </PixelButton>
        </div>

        {/* Output Column */}
        <div className="space-y-4 border-2 border-black bg-retro-plum p-5 shadow-pixel lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-pixel">
                <Cpu className="h-4 w-4 text-retro-amber" />
                Live Terminal Stream
              </h2>
              {resultMetadata && (
                <PixelBadge variant="mint" size="xs">
                  Routed: {resultMetadata.modelUsed}
                </PixelBadge>
              )}
            </div>

            {errorText && (
              <div className="border-2 border-black bg-retro-coral p-3 text-xs text-white font-mono shadow-pixel-sm">
                {errorText}
              </div>
            )}

            {/* Response Box */}
            <div className="min-h-[260px] max-h-[460px] overflow-y-auto border-2 border-black bg-retro-night p-4 font-mono text-xs leading-relaxed text-retro-cream shadow-pixel-inset">
              {loading && !completionText ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <Sparkles className="h-6 w-6 animate-spin text-retro-amber" />
                  <p className="font-mono text-xs">Awaiting streamed tokens from provider adapter...</p>
                </div>
              ) : completionText ? (
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-retro-cream">{completionText}</div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono text-xs text-center space-y-2">
                  <PlayCircle className="h-8 w-8 text-slate-600" />
                  <p>Click &quot;Dispatch Ingress Request&quot; to test model routing.</p>
                </div>
              )}
            </div>
          </div>

          {/* Execution Footnote & Metrics */}
          {resultMetadata && (
            <div className="pt-3 border-t-2 border-black">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper block text-[9px] uppercase font-pixel font-bold">ROUTED MODEL</span>
                  <span className="font-bold text-retro-amber truncate block">{resultMetadata.modelUsed}</span>
                </div>
                <div className="border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper block text-[9px] uppercase font-pixel font-bold">TOTAL DURATION</span>
                  <span className="font-bold text-retro-mint">{resultMetadata.durationMs} ms</span>
                </div>
                <div className="border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper block text-[9px] uppercase font-pixel font-bold">TOKENS (IN/OUT)</span>
                  <span className="font-bold text-retro-cream">
                    {resultMetadata.inputTokens ?? "~"} / {resultMetadata.outputTokens ?? "~"}
                  </span>
                </div>
                <div className="border border-black bg-retro-night p-2 shadow-pixel-sm">
                  <span className="text-retro-paper block text-[9px] uppercase font-pixel font-bold">TRACE AUDIT</span>
                  <Link
                    href="/requests"
                    className="flex items-center gap-1 text-retro-mint hover:text-white font-bold"
                  >
                    View in Traces →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
