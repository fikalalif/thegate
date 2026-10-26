/**
 * 9Router Upstream Adapter & Downstream Gateway Client
 * Handles HTTP completions, SSE streaming passthrough, and resilient fallback execution.
 */

const crypto = require("crypto");
const db = require("../db/index");

const DEFAULT_9ROUTER_URL = process.env.NINEROUTER_BASE_URL || "http://localhost:20128/v1";
const DEFAULT_API_KEY = process.env.NINEROUTER_API_KEY || "sk-d8e2c53a5d25566e-agygx4-873db2fc";

function getRouterConfig() {
  const setting = db.get("SELECT value FROM system_settings WHERE key = ?", ["router_config"]);
  if (setting && setting.value) {
    try {
      return JSON.parse(setting.value);
    } catch {}
  }
  return {
    provider_adapter: "ninerouter",
    base_url: DEFAULT_9ROUTER_URL,
    api_key: DEFAULT_API_KEY,
    timeout_seconds: 60.0,
  };
}

async function testConnection(targetUrl, apiKey = null) {
  const url = (targetUrl || DEFAULT_9ROUTER_URL).replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const tStart = Date.now();
  try {
    const res = await fetch(`${url}/models`, { headers, signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - tStart;

    if (!res.ok) {
      return {
        success: false,
        latency_ms: latencyMs,
        message: `Upstream router responded with HTTP ${res.status}`,
        detected_models: [],
      };
    }

    const data = await res.json();
    let models = [];
    if (data && Array.isArray(data.data)) {
      models = data.data.map((m) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data)) {
      models = data.map((m) => m.id || m.name).filter(Boolean);
    }

    return {
      success: true,
      latency_ms: latencyMs,
      message: `Connection verified successfully! (${latencyMs}ms). Detected ${models.length} models.`,
      detected_models: models.slice(0, 15),
    };
  } catch (err) {
    return {
      success: false,
      latency_ms: Date.now() - tStart,
      message: `Connection failed: ${err.message}`,
      detected_models: [],
    };
  }
}

async function syncModels(targetUrl = null, apiKey = null) {
  const config = getRouterConfig();
  const url = (targetUrl || config.base_url || DEFAULT_9ROUTER_URL).replace(/\/$/, "");
  const key = apiKey !== null ? apiKey : config.api_key || DEFAULT_API_KEY;

  const headers = { "Accept": "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;

  const res = await fetch(`${url}/models`, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`Router returned HTTP ${res.status}`);
  }

  const data = await res.json();
  let rawModels = [];
  if (data && Array.isArray(data.data)) rawModels = data.data;
  else if (Array.isArray(data)) rawModels = data;

  let syncedCount = 0;
  const now = new Date().toISOString();

  for (const m of rawModels) {
    const rawId = m.id || m.name;
    if (!rawId) continue;
    const modelId = String(rawId).trim();
    const lower = modelId.toLowerCase();

    // Filter dummy or internal combo aliases
    if (lower.startsWith("combo-") || lower.startsWith("combo/") || lower.startsWith("dummy-") || lower.startsWith("test-") || lower === "combo") {
      continue;
    }

    // Infer tier
    let tier = 2;
    if (["pro-max", "reasoner", "opus", "large", "70b", "glm-5", "deepseek-v4", "gpt-4o", "claude-3-5-sonnet"].some((k) => lower.includes(k))) {
      tier = 3;
    } else if (["mini", "flash", "haiku", "8b", "small", "nano"].some((k) => lower.includes(k))) {
      tier = 1;
    }

    const caps = {
      tier,
      tools: m.capabilities ? m.capabilities.tools !== false : true,
      json_mode: true,
      vision: m.capabilities ? Boolean(m.capabilities.vision) : false,
      reasoning: m.capabilities ? Boolean(m.capabilities.reasoning) : false,
    };

    const ctxLimit = m.context_length || m.max_completion_tokens || 128000;

    const existing = db.get("SELECT id FROM models_registry WHERE internal_name = ? OR backend_model_id = ?", [modelId, modelId]);
    if (existing) {
      db.run(
        `UPDATE models_registry SET capabilities = ?, context_limit = ?, enabled = 1, updated_at = ? WHERE id = ?`,
        [JSON.stringify(caps), ctxLimit, now, existing.id]
      );
    } else {
      db.run(
        `INSERT INTO models_registry (id, internal_name, backend_model_id, provider_adapter, capabilities, context_limit, enabled, created_at, updated_at)
         VALUES (?, ?, ?, 'ninerouter', ?, ?, 1, ?, ?)`,
        [crypto.randomUUID(), modelId, modelId, JSON.stringify(caps), ctxLimit, now, now]
      );
    }
    syncedCount++;
  }

  return {
    success: true,
    synced_count: syncedCount,
    message: `Successfully synchronized ${syncedCount} real models from 9Router gateway.`,
  };
}

async function executeWithFallback(payload, candidates = []) {
  const config = getRouterConfig();
  const url = config.base_url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (config.api_key) headers["Authorization"] = `Bearer ${config.api_key}`;

  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const modelToTry = candidates[i];
    const attemptPayload = { ...payload, model: modelToTry, stream: false };

    try {
      const res = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(attemptPayload),
        signal: AbortSignal.timeout(config.timeout_seconds * 1000),
      });

      if (res.ok) {
        const text = await res.text();
        // If upstream responded with standard JSON
        if (text.trim().startsWith("{")) {
          const data = JSON.parse(text);
          return {
            success: true,
            data,
            usedModel: modelToTry,
            attemptIndex: i,
          };
        }

        // If upstream returned an SSE stream (data: ...)
        if (text.includes("data: ")) {
          let assembledContent = "";
          let finishReason = "stop";
          const lines = text.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && !trimmed.endsWith("[DONE]")) {
              try {
                const chunk = JSON.parse(trimmed.slice(6));
                const delta = chunk.choices?.[0]?.delta?.content || "";
                assembledContent += delta;
                if (chunk.choices?.[0]?.finish_reason) {
                  finishReason = chunk.choices[0].finish_reason;
                }
              } catch {}
            }
          }

          return {
            success: true,
            data: {
              id: `chatcmpl-${crypto.randomUUID()}`,
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: modelToTry,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: assembledContent,
                  },
                  finish_reason: finishReason,
                },
              ],
              usage: {
                prompt_tokens: 15,
                completion_tokens: Math.max(1, Math.floor(assembledContent.length / 4)),
                total_tokens: 15 + Math.max(1, Math.floor(assembledContent.length / 4)),
              },
            },
            usedModel: modelToTry,
            attemptIndex: i,
          };
        }
      }

      // If upstream error (400, 404, 502, 503), log and fallback
      const errText = await res.text();
      lastError = new Error(`HTTP ${res.status}: ${errText}`);
      console.warn(`[TheGate Router] Attempt #${i + 1} with ${modelToTry} failed (${res.status}). Trying next candidate...`);
    } catch (err) {
      lastError = err;
      console.warn(`[TheGate Router] Attempt #${i + 1} with ${modelToTry} encountered error: ${err.message}. Trying next candidate...`);
    }
  }

  throw lastError || new Error("All candidate models in fallback chain failed.");
}

module.exports = {
  getRouterConfig,
  testConnection,
  syncModels,
  executeWithFallback,
  DEFAULT_9ROUTER_URL,
};
