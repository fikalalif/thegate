/**
 * Providers & Router Connection Management Routes
 */

const db = require("../db/index");
const {
  getRouterConfig,
  testConnection,
  syncModels,
  executeWithFallback,
} = require("../adapters/ninerouter");

async function providersRoutes(fastify, options) {
  fastify.get("/api/v1/providers/config", async (request, reply) => {
    const config = getRouterConfig();
    const maskedKey = config.api_key
      ? `${config.api_key.slice(0, 3)}••••••••${config.api_key.slice(-4)}`
      : null;

    // Test active connection status
    const testResult = await testConnection(config.base_url, config.api_key);

    return {
      provider_adapter: config.provider_adapter || "ninerouter",
      base_url: config.base_url,
      api_key_masked: maskedKey,
      timeout_seconds: config.timeout_seconds || 60.0,
      is_connected: testResult.success,
      last_ping_ms: testResult.latency_ms,
      detected_models: testResult.detected_models || [],
      message: testResult.message,
    };
  });

  fastify.post("/api/v1/providers/test", async (request, reply) => {
    const { base_url, api_key } = request.body || {};
    const result = await testConnection(base_url, api_key);
    return result;
  });

  fastify.post("/api/v1/providers/config", async (request, reply) => {
    const { provider_adapter, base_url, api_key, timeout_seconds } = request.body || {};
    const existing = getRouterConfig();

    const updated = {
      provider_adapter: provider_adapter || existing.provider_adapter || "ninerouter",
      base_url: base_url || existing.base_url,
      api_key: api_key !== undefined ? api_key : existing.api_key,
      timeout_seconds: timeout_seconds || existing.timeout_seconds || 60.0,
    };

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('router_config', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(updated), now]
    );

    return { success: true, config: updated };
  });

  fastify.post("/api/v1/providers/sync-models", async (request, reply) => {
    const { base_url, api_key } = request.body || {};
    try {
      const result = await syncModels(base_url, api_key);
      const models = db.all("SELECT * FROM models_registry WHERE enabled = 1");
      return {
        ...result,
        models: models.map((m) => ({
          ...m,
          capabilities: JSON.parse(m.capabilities || "{}"),
        })),
      };
    } catch (err) {
      return reply.status(502).send({
        success: false,
        message: `Failed to sync models: ${err.message}`,
      });
    }
  });

  fastify.delete("/api/v1/providers/models", async (request, reply) => {
    db.run("DELETE FROM model_pricing");
    db.run("DELETE FROM models_registry");
    return {
      success: true,
      message: "All registered models and pricing catalog cleared successfully.",
    };
  });

  fastify.post("/api/v1/providers/test-ingress-prompt", async (request, reply) => {
    const { model_id = "ag/gemini-3.8-flash-high", prompt = "Ping test from TheGate" } = request.body || {};
    const payload = {
      model: model_id,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
    };

    try {
      const result = await executeWithFallback(payload, [model_id]);
      const content = result.data?.choices?.[0]?.message?.content || "(empty)";
      return {
        success: true,
        model: result.usedModel,
        response: content,
        latency_ms: 120,
      };
    } catch (err) {
      return reply.status(502).send({
        success: false,
        message: err.message,
      });
    }
  });
}

module.exports = providersRoutes;
