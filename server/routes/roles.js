/**
 * Team Roles & AI Workforce Persona Routes
 */

const crypto = require("crypto");
const db = require("../db/index");

async function rolesRoutes(fastify, options) {
  fastify.get("/api/v1/roles", async (request, reply) => {
    const roles = db.all("SELECT * FROM roles ORDER BY is_default DESC, created_at ASC");
    return roles.map((r) => ({
      ...r,
      has_glasses: Boolean(r.has_glasses),
      has_headset: Boolean(r.has_headset),
      is_default: Boolean(r.is_default),
    }));
  });

  fastify.post("/api/v1/roles", async (request, reply) => {
    const {
      name,
      role_key,
      department,
      context_behavior,
      preferred_model_id,
      hair_color,
      shirt_color,
      tie_color,
      has_glasses,
      has_headset,
      is_default,
    } = request.body || {};

    if (!name || !role_key || !department || !context_behavior) {
      return reply.status(400).send({ error: "Missing required role fields" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO roles (id, name, role_key, department, context_behavior, preferred_model_id, hair_color, shirt_color, tie_color, has_glasses, has_headset, is_default, current_activity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?)`,
      [
        id,
        name,
        role_key,
        department,
        context_behavior,
        preferred_model_id || null,
        hair_color || "#4B2E1E",
        shirt_color || "#2B5278",
        tie_color || null,
        has_glasses ? 1 : 0,
        has_headset ? 1 : 0,
        is_default ? 1 : 0,
        now,
        now,
      ]
    );

    const created = db.get("SELECT * FROM roles WHERE id = ?", [id]);
    return reply.status(201).send({
      ...created,
      has_glasses: Boolean(created.has_glasses),
      has_headset: Boolean(created.has_headset),
      is_default: Boolean(created.is_default),
    });
  });

  fastify.get("/api/v1/roles/:id", async (request, reply) => {
    const r = db.get("SELECT * FROM roles WHERE id = ?", [request.params.id]);
    if (!r) return reply.status(404).send({ error: "Role not found" });
    return {
      ...r,
      has_glasses: Boolean(r.has_glasses),
      has_headset: Boolean(r.has_headset),
      is_default: Boolean(r.is_default),
    };
  });

  fastify.put("/api/v1/roles/:id", async (request, reply) => {
    const existing = db.get("SELECT * FROM roles WHERE id = ?", [request.params.id]);
    if (!existing) return reply.status(404).send({ error: "Role not found" });

    const body = request.body || {};
    const now = new Date().toISOString();

    db.run(
      `UPDATE roles SET
         name = ?, department = ?, context_behavior = ?, preferred_model_id = ?,
         hair_color = ?, shirt_color = ?, tie_color = ?, has_glasses = ?,
         has_headset = ?, is_default = ?, current_activity = ?, updated_at = ?
       WHERE id = ?`,
      [
        body.name !== undefined ? body.name : existing.name,
        body.department !== undefined ? body.department : existing.department,
        body.context_behavior !== undefined ? body.context_behavior : existing.context_behavior,
        body.preferred_model_id !== undefined ? body.preferred_model_id : existing.preferred_model_id,
        body.hair_color !== undefined ? body.hair_color : existing.hair_color,
        body.shirt_color !== undefined ? body.shirt_color : existing.shirt_color,
        body.tie_color !== undefined ? body.tie_color : existing.tie_color,
        body.has_glasses !== undefined ? (body.has_glasses ? 1 : 0) : existing.has_glasses,
        body.has_headset !== undefined ? (body.has_headset ? 1 : 0) : existing.has_headset,
        body.is_default !== undefined ? (body.is_default ? 1 : 0) : existing.is_default,
        body.current_activity !== undefined ? body.current_activity : existing.current_activity,
        now,
        request.params.id,
      ]
    );

    const updated = db.get("SELECT * FROM roles WHERE id = ?", [request.params.id]);
    return {
      ...updated,
      has_glasses: Boolean(updated.has_glasses),
      has_headset: Boolean(updated.has_headset),
      is_default: Boolean(updated.is_default),
    };
  });

  fastify.delete("/api/v1/roles/:id", async (request, reply) => {
    db.run("DELETE FROM roles WHERE id = ?", [request.params.id]);
    return { success: true };
  });

  fastify.post("/api/v1/roles/generate-context", async (request, reply) => {
    const { name, department } = request.body || {};
    const generated = `Professional, highly focused specialist in ${department || "Engineering"} responsible for ${name || "Core Tasks"}. Prioritizes clean architectures, automated telemetry verification, and zero hallucination.`;
    return { context_behavior: generated };
  });
}

module.exports = rolesRoutes;
