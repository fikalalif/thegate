/**
 * Routing Policy Endpoints
 */

const crypto = require("crypto");
const db = require("../db/index");

async function policiesRoutes(fastify, options) {
  fastify.get("/api/v1/policies", async (request, reply) => {
    const records = db.all("SELECT * FROM routing_policies ORDER BY created_at ASC");
    const policies = records.map((p) => {
      let cfg = {};
      try {
        cfg = JSON.parse(p.configuration);
      } catch {}
      return {
        ...p,
        configuration: cfg,
        is_active: Boolean(p.is_active),
      };
    });
    return { policies };
  });

  fastify.post("/api/v1/policies", async (request, reply) => {
    const { name, mode, configuration } = request.body || {};
    if (!name || !mode) {
      return reply.status(400).send({ error: "name and mode are required" });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const cfgStr = JSON.stringify(configuration || {});

    db.run(
      `INSERT INTO routing_policies (id, name, mode, configuration, version, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      [id, name, mode, cfgStr, now, now]
    );

    return reply.status(201).send({
      id,
      name,
      mode,
      configuration: configuration || {},
      version: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  });

  fastify.get("/api/v1/policies/:id", async (request, reply) => {
    const p = db.get("SELECT * FROM routing_policies WHERE id = ?", [request.params.id]);
    if (!p) return reply.status(404).send({ error: "Policy not found" });
    let cfg = {};
    try {
      cfg = JSON.parse(p.configuration);
    } catch {}
    return { ...p, configuration: cfg, is_active: Boolean(p.is_active) };
  });

  fastify.put("/api/v1/policies/:id", async (request, reply) => {
    const { name, mode, configuration, is_active } = request.body || {};
    const existing = db.get("SELECT * FROM routing_policies WHERE id = ?", [request.params.id]);
    if (!existing) return reply.status(404).send({ error: "Policy not found" });

    const now = new Date().toISOString();
    const newVersion = (existing.version || 1) + 1;
    const cfgStr = configuration ? JSON.stringify(configuration) : existing.configuration;

    db.run(
      `UPDATE routing_policies SET name = ?, mode = ?, configuration = ?, version = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        name || existing.name,
        mode || existing.mode,
        cfgStr,
        newVersion,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        now,
        request.params.id,
      ]
    );

    const updated = db.get("SELECT * FROM routing_policies WHERE id = ?", [request.params.id]);
    let cfg = {};
    try {
      cfg = JSON.parse(updated.configuration);
    } catch {}
    return { ...updated, configuration: cfg, is_active: Boolean(updated.is_active) };
  });

  fastify.delete("/api/v1/policies/:id", async (request, reply) => {
    const res = db.run("DELETE FROM routing_policies WHERE id = ?", [request.params.id]);
    if (res.changes === 0) return reply.status(404).send({ error: "Policy not found" });
    return { success: true };
  });
}

module.exports = policiesRoutes;
