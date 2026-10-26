/**
 * API Key Management Endpoints
 */

const crypto = require("crypto");
const db = require("../db/index");
const { hashApiKey } = require("../db/seed");

async function keysRoutes(fastify, options) {
  fastify.get("/api/v1/keys", async (request, reply) => {
    const keys = db.all("SELECT id, name, key_prefix, status, created_at, last_used_at, revoked_at FROM api_keys ORDER BY created_at DESC");
    return { keys };
  });

  fastify.post("/api/v1/keys", async (request, reply) => {
    const name = String(request.body?.name || "Developer Key").trim();
    const rawKey = `tg_${crypto.randomBytes(24).toString("hex")}`;
    const prefix = rawKey.slice(0, 10);
    const keyHash = hashApiKey(rawKey);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO api_keys (id, name, key_prefix, key_hash, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)`,
      [id, name, prefix, keyHash, now]
    );

    return reply.status(201).send({
      id,
      name,
      key: rawKey,
      key_prefix: prefix,
      status: "active",
      created_at: now,
    });
  });

  fastify.delete("/api/v1/keys/:id", async (request, reply) => {
    const id = request.params.id;
    const now = new Date().toISOString();
    const res = db.run("UPDATE api_keys SET status = 'revoked', revoked_at = ? WHERE id = ?", [now, id]);
    if (res.changes === 0) {
      return reply.status(404).send({ error: "Key not found" });
    }
    const record = db.get("SELECT id, name, key_prefix, status, created_at, last_used_at, revoked_at FROM api_keys WHERE id = ?", [id]);
    return record;
  });
}

module.exports = keysRoutes;
