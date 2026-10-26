/**
 * TheGate Database Seeder
 * Auto-seeds Developer API Keys, Default Policies, and Default Workforce Roles
 */

const crypto = require("crypto");
const db = require("./index");

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(plainPassword, Buffer.from(salt, "hex"), 100000, 32, "sha256")
    .toString("hex");
  return `${salt}$${hash}`;
}

const DEFAULT_DEV_KEYS = [
  { name: "Developer Admin Key", key: "thegate_dev_key" },
  { name: "Local CLI Key", key: "sk-thegate-local-dev-key" },
  { name: "Live Dev Key", key: "tg_live_dev_test_key_1234567890abcdef" },
];

const DEFAULT_POLICIES = [
  {
    name: "Auto Balanced",
    mode: "balanced",
    configuration: { description: "Balanced latency-cost heuristic optimization" },
  },
  {
    name: "Cost Saver Economy",
    mode: "economy",
    configuration: { description: "Lowest cost model routing policy" },
  },
  {
    name: "Top Tier Quality",
    mode: "quality",
    configuration: { description: "Highest quality capability tier policy" },
  },
];

const DEFAULT_ROLES = [
  {
    name: "Lead Fullstack Engineer",
    role_key: "fullstack-engineer",
    department: "Core Systems & Fullstack Architecture",
    context_behavior:
      "Experienced, pragmatic Fullstack Systems Architect who builds robust, end-to-end architectures from scratch without AI fluff, hallucinations, or unverified shortcuts. Highly intolerant to fake simulations, unauthenticated bypasses, or broken contracts. Prioritizes real live telemetry, privacy-by-default, and auditable metrics. When selecting models: prefers ultra-fast, high-context workhorses (like Gemini 3.8 Flash High with 1,048k token window) for deep AST analysis and multi-file refactoring; switches to deep reasoning models only when resolving critical CVE security audits or complex state machines. Cost, latency, and TTFT conscious—never burns tokens on wasteful prompts.",
    preferred_model_id: "ag/gemini-3.8-flash-high",
    hair_color: "#4B2E1E",
    shirt_color: "#2B5278",
    tie_color: "#E53E3E",
    has_glasses: 1,
    has_headset: 0,
    is_default: 1,
    current_activity: "idle",
  },
  {
    name: "Security Auditor & Systems Architect",
    role_key: "security-auditor",
    department: "Security, Governance & Infrastructure",
    context_behavior:
      "Vigilant infrastructure architect and security auditor specializing in vulnerability research, zero-trust enforcement, and distributed state machines. Verifies every cryptographic boundary, TLS handshake, and authorization scope.",
    preferred_model_id: "ag/claude-sonnet-4-6",
    hair_color: "#1E293B",
    shirt_color: "#0F172A",
    tie_color: "#38BDF8",
    has_glasses: 1,
    has_headset: 1,
    is_default: 0,
    current_activity: "idle",
  },
  {
    name: "Data Intelligence Analyst",
    role_key: "data-analyst",
    department: "Data Engineering & Analytics",
    context_behavior:
      "Analytical mathematician specializing in structured JSON schemas, SQL transformations, token accounting, and FinOps telemetry reporting. Ensures zero discrepancies in financial ledgers.",
    preferred_model_id: "ag/gemini-3.8-flash-medium",
    hair_color: "#7C2D12",
    shirt_color: "#047857",
    tie_color: "#F59E0B",
    has_glasses: 1,
    has_headset: 0,
    is_default: 0,
    current_activity: "idle",
  },
  {
    name: "Creative Copywriter & Brand Strategist",
    role_key: "copywriter",
    department: "Product Marketing & Communications",
    context_behavior:
      "Articulate storyteller who communicates high-tech industrial architecture in crisp, human, and engaging language. Avoids AI clichés, buzzwords, and repetitive corporate filler.",
    preferred_model_id: "ag/claude-opus-4-6-thinking",
    hair_color: "#B45309",
    shirt_color: "#6D28D9",
    tie_color: "#EC4899",
    has_glasses: 0,
    has_headset: 0,
    is_default: 0,
    current_activity: "idle",
  },
  {
    name: "Operations Assistant",
    role_key: "assistant",
    department: "Operations & Fast Utility Support",
    context_behavior:
      "Fast, agile utility assistant handling rapid Q&A, formatting checks, and routine operational workflows with minimal latency.",
    preferred_model_id: "ag/gemini-3.8-flash",
    hair_color: "#374151",
    shirt_color: "#2563EB",
    tie_color: null,
    has_glasses: 0,
    has_headset: 1,
    is_default: 0,
    current_activity: "idle",
  },
];

function seedDefaults() {
  db.initDatabase();
  const now = new Date().toISOString();

  // 1. Seed API Keys (ensure all default dev keys exist)
  for (const k of DEFAULT_DEV_KEYS) {
    const kHash = hashApiKey(k.key);
    const existing = db.get("SELECT id FROM api_keys WHERE key_hash = ?", [kHash]);
    if (!existing) {
      db.run(
        `INSERT INTO api_keys (id, name, key_prefix, key_hash, status, created_at)
         VALUES (?, ?, ?, ?, 'active', ?)`,
        [crypto.randomUUID(), k.name, k.key.slice(0, 10), kHash, now]
      );
    }
  }

  // 2. Seed Routing Policies
  for (const p of DEFAULT_POLICIES) {
    const existing = db.get("SELECT id FROM routing_policies WHERE name = ?", [p.name]);
    if (!existing) {
      db.run(
        `INSERT INTO routing_policies (id, name, mode, configuration, version, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
        [crypto.randomUUID(), p.name, p.mode, JSON.stringify(p.configuration), now, now]
      );
    }
  }

  // 3. Seed Roles
  for (const r of DEFAULT_ROLES) {
    const existing = db.get("SELECT id FROM roles WHERE role_key = ?", [r.role_key]);
    if (!existing) {
      db.run(
        `INSERT INTO roles (id, name, role_key, department, context_behavior, preferred_model_id, hair_color, shirt_color, tie_color, has_glasses, has_headset, is_default, current_activity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          r.name,
          r.role_key,
          r.department,
          r.context_behavior,
          r.preferred_model_id,
          r.hair_color,
          r.shirt_color,
          r.tie_color,
          r.has_glasses,
          r.has_headset,
          r.is_default,
          r.current_activity,
          now,
          now,
        ]
      );
    }
  }

  // 4. Seed Default Admin Password Hash (12345678)
  const pwdSetting = db.get("SELECT value FROM system_settings WHERE key = ?", ["admin_password_hash"]);
  if (!pwdSetting) {
    db.run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`,
      ["admin_password_hash", hashPassword("12345678"), now]
    );
  }
}

module.exports = {
  seedDefaults,
  hashApiKey,
  hashPassword,
};
