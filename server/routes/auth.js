/**
 * Authentication & Session Management Routes
 */

const crypto = require("crypto");
const db = require("../db/index");
const { hashPassword } = require("../db/seed");

const SECRET_KEY = process.env.SECRET_KEY || "thegate_dev_insecure_jwt_secret_key_fixed";

function verifyPassword(plainPassword, storedHash) {
  try {
    if (!storedHash || !storedHash.includes("$")) return false;
    const [salt, expectedHash] = storedHash.split("$");
    const calculated = crypto
      .pbkdf2Sync(plainPassword, Buffer.from(salt, "hex"), 100000, 32, "sha256")
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

function createSessionToken() {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `thegate_admin:${timestamp}:${nonce}`;
  const sig = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

async function authRoutes(fastify, options) {
  fastify.post("/api/v1/auth/login", async (request, reply) => {
    const { password } = request.body || {};
    if (!password) {
      return reply.status(400).send({ error: "Password required" });
    }

    const row = db.get("SELECT value FROM system_settings WHERE key = 'admin_password_hash'");
    const storedHash = row ? row.value : hashPassword("12345678");

    if (!verifyPassword(password, storedHash)) {
      return reply.status(401).send({ error: "Invalid password" });
    }

    const token = createSessionToken();
    return {
      token,
      is_default_password: password === "12345678",
      message: "Authentication successful",
    };
  });

  fastify.get("/api/v1/auth/status", async (request, reply) => {
    const row = db.get("SELECT value FROM system_settings WHERE key = 'admin_password_hash'");
    const storedHash = row ? row.value : hashPassword("12345678");
    const isDefault = verifyPassword("12345678", storedHash);

    return {
      authenticated: true,
      is_default_password: isDefault,
    };
  });

  fastify.post("/api/v1/auth/change-password", async (request, reply) => {
    const { old_password, new_password } = request.body || {};
    if (!old_password || !new_password) {
      return reply.status(400).send({ error: "Old and new password required" });
    }

    const row = db.get("SELECT value FROM system_settings WHERE key = 'admin_password_hash'");
    const storedHash = row ? row.value : hashPassword("12345678");

    if (!verifyPassword(old_password, storedHash)) {
      return reply.status(401).send({ error: "Current password incorrect" });
    }

    const newHash = hashPassword(new_password);
    const now = new Date().toISOString();
    db.run("UPDATE system_settings SET value = ?, updated_at = ? WHERE key = 'admin_password_hash'", [newHash, now]);

    return { success: true, message: "Password updated successfully" };
  });

  fastify.post("/api/v1/auth/logout", async (request, reply) => {
    return { success: true, message: "Logged out" };
  });
}

module.exports = authRoutes;
