/**
 * Model Registry & Pricing Catalog Routes
 */

const crypto = require("crypto");
const db = require("../db/index");

async function modelsRoutes(fastify, options) {
  fastify.get("/api/v1/models", async (request, reply) => {
    const records = db.all("SELECT * FROM models_registry ORDER BY internal_name ASC");
    const models = records.map((m) => {
      let caps = {};
      try {
        caps = JSON.parse(m.capabilities);
      } catch {}

      const pricing = db.all(
        "SELECT * FROM model_pricing WHERE model_id = ? ORDER BY effective_from DESC LIMIT 1",
        [m.id]
      );

      return {
        id: m.id,
        internal_name: m.internal_name,
        backend_model_id: m.backend_model_id,
        provider_adapter: m.provider_adapter,
        capabilities: caps,
        context_limit: m.context_limit,
        enabled: Boolean(m.enabled),
        created_at: m.created_at,
        updated_at: m.updated_at,
        pricing: pricing[0] || null,
      };
    });

    return { models, total: models.length };
  });

  fastify.post("/api/v1/models", async (request, reply) => {
    const { internal_name, backend_model_id, capabilities, context_limit, provider_adapter } = request.body || {};
    if (!internal_name || !backend_model_id) {
      return reply.status(400).send({ error: "internal_name and backend_model_id required" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const capsStr = JSON.stringify(capabilities || {});

    db.run(
      `INSERT INTO models_registry (id, internal_name, backend_model_id, provider_adapter, capabilities, context_limit, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, internal_name, backend_model_id, provider_adapter || "9router", capsStr, context_limit || 128000, now, now]
    );

    return reply.status(201).send({
      id,
      internal_name,
      backend_model_id,
      capabilities: capabilities || {},
      context_limit: context_limit || 128000,
      enabled: true,
    });
  });

  fastify.put("/api/v1/models/:id", async (request, reply) => {
    const { enabled, capabilities, context_limit } = request.body || {};
    const existing = db.get("SELECT * FROM models_registry WHERE id = ?", [request.params.id]);
    if (!existing) return reply.status(404).send({ error: "Model not found" });

    const now = new Date().toISOString();
    const capsStr = capabilities ? JSON.stringify(capabilities) : existing.capabilities;

    db.run(
      `UPDATE models_registry SET enabled = ?, capabilities = ?, context_limit = ?, updated_at = ? WHERE id = ?`,
      [
        enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
        capsStr,
        context_limit || existing.context_limit,
        now,
        request.params.id,
      ]
    );

    return { success: true };
  });

  fastify.delete("/api/v1/models/:id", async (request, reply) => {
    db.run("DELETE FROM models_registry WHERE id = ?", [request.params.id]);
    return { success: true };
  });

  fastify.get("/api/v1/models/:id/pricing", async (request, reply) => {
    const pricing = db.all("SELECT * FROM model_pricing WHERE model_id = ? ORDER BY effective_from DESC", [request.params.id]);
    return { pricing };
  });

  fastify.post("/api/v1/models/:id/pricing", async (request, reply) => {
    const { input_price_per_million, output_price_per_million, currency, source } = request.body || {};
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO model_pricing (id, model_id, input_price_per_million, output_price_per_million, currency, effective_from, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, request.params.id, input_price_per_million, output_price_per_million, currency || "USD", now, source || "manual"]
    );

    return reply.status(201).send({ success: true, id });
  });
}

module.exports = modelsRoutes;
