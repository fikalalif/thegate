/**
 * TheGate Database Engine
 * Cross-platform SQLite layer supporting both Node 22+ built-in node:sqlite and better-sqlite3
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function getDatabasePath() {
  if (process.env.DATABASE_URL) {
    const raw = process.env.DATABASE_URL.replace(/^sqlite\+?.*:\/\/\/?/, "");
    const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    try {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
    } catch {}
    return resolved;
  }

  // Check if running in a writable project repo (local development)
  const localDb = path.join(__dirname, "..", "..", "thegate_dev.db");
  const localProjectRoot = path.join(__dirname, "..", "..");
  try {
    fs.accessSync(localProjectRoot, fs.constants.W_OK);
    if (!__dirname.includes("node_modules")) {
      return localDb;
    }
  } catch {}

  // Global install or non-writable directory -> fallback to user's home ~/.thegate/thegate.db
  const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir() || "/tmp";
  const userGateDir = path.join(userHome, ".thegate");
  try {
    fs.mkdirSync(userGateDir, { recursive: true });
  } catch {}
  return path.join(userGateDir, "thegate.db");
}

const DB_PATH = getDatabasePath();

let dbInstance = null;
let isNodeSqlite = false;

function initDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = DB_PATH;

  // Try built-in node:sqlite first (Zero dependencies on Node.js 22.5+)
  try {
    const { DatabaseSync } = require("node:sqlite");
    if (typeof DatabaseSync === "function") {
      dbInstance = new DatabaseSync(dbPath);
      isNodeSqlite = true;
    }
  } catch {}

  // Fallback to better-sqlite3
  if (!dbInstance) {
    try {
      const Database = require("better-sqlite3");
      dbInstance = new Database(dbPath);
      isNodeSqlite = false;
    } catch (err) {
      throw new Error(
        `Failed to initialize SQLite database engine: ${err.message}. Please use Node.js >= 22.5.0 or install better-sqlite3.`
      );
    }
  }

  // Enable WAL mode & foreign keys
  try {
    if (isNodeSqlite) {
      dbInstance.exec("PRAGMA journal_mode = WAL;");
      dbInstance.exec("PRAGMA foreign_keys = ON;");
    } else {
      dbInstance.pragma("journal_mode = WAL");
      dbInstance.pragma("foreign_keys = ON");
    }
  } catch {}

  createSchema();
  return dbInstance;
}

function createSchema() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

    CREATE TABLE IF NOT EXISTS routing_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      configuration TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models_registry (
      id TEXT PRIMARY KEY,
      internal_name TEXT NOT NULL UNIQUE,
      backend_model_id TEXT NOT NULL,
      provider_adapter TEXT NOT NULL DEFAULT '9router',
      capabilities TEXT NOT NULL DEFAULT '{}',
      context_limit INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_models_name ON models_registry(internal_name);

    CREATE TABLE IF NOT EXISTS model_pricing (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      input_price_per_million REAL,
      output_price_per_million REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      effective_from TEXT NOT NULL,
      effective_until TEXT,
      source TEXT,
      validated_at TEXT,
      FOREIGN KEY(model_id) REFERENCES models_registry(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      api_key_id TEXT,
      routing_policy_id TEXT,
      routing_policy_version INTEGER,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      selected_model_id TEXT,
      assigned_role_id TEXT,
      prompt_preview TEXT,
      response_preview TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_amount REAL,
      cost_currency TEXT NOT NULL DEFAULT 'USD',
      cost_type TEXT NOT NULL DEFAULT 'UNKNOWN',
      baseline_cost_amount REAL,
      estimated_savings_percent REAL,
      routing_latency_ms INTEGER,
      provider_latency_ms INTEGER,
      total_duration_ms INTEGER,
      stream_enabled INTEGER NOT NULL DEFAULT 0,
      error_category TEXT,
      FOREIGN KEY(api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
      FOREIGN KEY(routing_policy_id) REFERENCES routing_policies(id) ON DELETE SET NULL,
      FOREIGN KEY(selected_model_id) REFERENCES models_registry(id) ON DELETE SET NULL,
      FOREIGN KEY(assigned_role_id) REFERENCES roles(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

    CREATE TABLE IF NOT EXISTS request_attempts (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      model_id TEXT,
      status TEXT NOT NULL,
      error_category TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      usage_metadata TEXT,
      FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY(model_id) REFERENCES models_registry(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_request_id ON request_attempts(request_id);

    CREATE TABLE IF NOT EXISTS routing_decisions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      strategy_name TEXT NOT NULL,
      strategy_version TEXT NOT NULL DEFAULT '1.0.0',
      selected_model_id TEXT,
      decision_reason TEXT,
      candidate_summary TEXT,
      estimated_cost REAL,
      decision_latency_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY(selected_model_id) REFERENCES models_registry(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_key TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      context_behavior TEXT NOT NULL,
      preferred_model_id TEXT,
      hair_color TEXT NOT NULL DEFAULT '#4B2E1E',
      shirt_color TEXT NOT NULL DEFAULT '#2B5278',
      tie_color TEXT,
      has_glasses INTEGER NOT NULL DEFAULT 0,
      has_headset INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      current_activity TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(role_key);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      goal TEXT NOT NULL,
      total_steps INTEGER NOT NULL DEFAULT 0,
      current_step_index INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_duration_ms INTEGER NOT NULL DEFAULT 0,
      final_output TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline_steps (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      role_key TEXT NOT NULL,
      model_selected TEXT NOT NULL,
      status TEXT NOT NULL,
      input_artifacts TEXT NOT NULL DEFAULT '{}',
      output_artifacts TEXT,
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_pipe_steps ON pipeline_steps(pipeline_id);
  `;

  if (isNodeSqlite) {
    dbInstance.exec(ddl);
  } else {
    dbInstance.exec(ddl);
  }

  // Safe runtime column migrations
  try {
    dbInstance.exec("ALTER TABLE requests ADD COLUMN assigned_role_id TEXT;");
  } catch {}
  try {
    dbInstance.exec("ALTER TABLE requests ADD COLUMN prompt_preview TEXT;");
  } catch {}
  try {
    dbInstance.exec("ALTER TABLE requests ADD COLUMN response_preview TEXT;");
  } catch {}
}

// Universal query helpers
function all(sql, params = []) {
  initDatabase();
  const stmt = dbInstance.prepare(sql);
  return stmt.all(...params);
}

function get(sql, params = []) {
  initDatabase();
  const stmt = dbInstance.prepare(sql);
  return stmt.get(...params);
}

function run(sql, params = []) {
  initDatabase();
  const stmt = dbInstance.prepare(sql);
  return stmt.run(...params);
}

function exec(sql) {
  initDatabase();
  return dbInstance.exec(sql);
}

module.exports = {
  initDatabase,
  all,
  get,
  run,
  exec,
  DB_PATH,
};
