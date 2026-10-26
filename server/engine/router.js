/**
 * TheGate Intelligent Routing Engine
 * Integrates Heuristic Policies with Predictive Intent Classification & Resilient Fallback Chains.
 */

const db = require("../db/index");
const { classifyIntent, TaskDomain } = require("./classifier");
const { analyzeRequest } = require("./analyzer");
const { getModelHealthStats } = require("./latency");

const VIRTUAL_MODELS = {
  "thegate/auto": "balanced",
  "thegate-auto": "balanced",
  "auto": "balanced",
  "thegate/balanced": "balanced",
  "thegate-balanced": "balanced",
  "balanced": "balanced",
  "thegate/economy": "economy",
  "thegate-economy": "economy",
  "economy": "economy",
  "thegate/quality": "quality",
  "thegate-quality": "quality",
  "quality": "quality",
};

// High-confidence production models prioritized in routing & fallback chains
const STABLE_MODELS_PRIORITY = [
  "ag/gemini-3.8-flash-high",
  "ag/claude-sonnet-4-6",
  "ag/gemini-3.8-flash-medium",
  "ag/gemini-3.8-flash",
  "ag/claude-opus-4-6-thinking",
];

function isPreferredModel(name = "") {
  const lower = name.toLowerCase();
  if (lower.startsWith("combo-") || lower.startsWith("combo/") || lower.startsWith("dummy-") || lower.startsWith("test-")) {
    return false;
  }
  return (
    name.includes("/") ||
    ["gpt", "claude", "llama", "gemini", "deepseek", "qwen", "mistral", "ag/"].some((kw) => lower.includes(kw))
  );
}

function getModelPriorityScore(modelName = "") {
  const idx = STABLE_MODELS_PRIORITY.indexOf(modelName);
  return idx !== -1 ? idx : 99;
}

function resolveRouting(payload = {}) {
  const rawModel = String(payload.model || "thegate/balanced").trim();
  const lower = rawModel.toLowerCase();

  const isVirtual = lower in VIRTUAL_MODELS;
  let policyMode = isVirtual ? VIRTUAL_MODELS[lower] : null;

  // 1. Check registered policy if not a standard virtual slug
  let policyRecord = null;
  if (!isVirtual) {
    policyRecord = db.get("SELECT * FROM routing_policies WHERE name = ? AND is_active = 1", [rawModel]);
    if (policyRecord) {
      policyMode = policyRecord.mode;
    }
  }

  // Analyze technical requirements
  const analysis = analyzeRequest(payload);

  // Run Predictive Intent & Complexity Classifier!
  const classification = classifyIntent(payload.messages || [], {
    requiresJson: analysis.requiresJsonMode,
    requiresTools: analysis.requiresTools,
    estimatedTokens: analysis.estimatedTokens,
  });

  // If explicit model requested by client (not virtual and not policy)
  if (!policyMode) {
    return {
      selectedModel: rawModel,
      backendModelId: rawModel,
      policyId: null,
      policyVersion: null,
      strategy: "direct",
      reason: `Direct explicit model selection: ${rawModel}`,
      analysis,
      classification,
      fallbacks: STABLE_MODELS_PRIORITY.filter((m) => m !== rawModel),
    };
  }

  // 2. Fetch candidates from database
  const dbModels = db.all("SELECT * FROM models_registry WHERE enabled = 1");

  if (!dbModels || dbModels.length === 0) {
    const fallbackModel = "ag/gemini-3.8-flash-high";
    return {
      selectedModel: fallbackModel,
      backendModelId: fallbackModel,
      policyId: policyRecord ? policyRecord.id : null,
      policyVersion: policyRecord ? policyRecord.version : 1,
      strategy: policyMode,
      reason: `Default fallback route (${classification.domain}): ${fallbackModel}`,
      analysis,
      classification,
      fallbacks: ["ag/claude-sonnet-4-6", "ag/gemini-3.8-flash-medium"],
    };
  }

  // Parse capabilities
  const candidates = dbModels.map((m) => {
    let caps = {};
    try {
      caps = typeof m.capabilities === "string" ? JSON.parse(m.capabilities) : m.capabilities || {};
    } catch {}
    return {
      ...m,
      caps,
      tier: caps.tier || 2,
    };
  });

  // 3. Filter hard technical constraints
  const eligible = candidates.filter((c) => {
    if (!isPreferredModel(c.internal_name)) return false;
    if (analysis.requiresTools && c.caps.tools === false) return false;
    if (analysis.requiresVision && c.caps.vision === false) return false;
    if (c.context_limit && c.context_limit < analysis.estimatedTokens) return false;
    return true;
  });

  const pool = eligible.length > 0 ? eligible : candidates;

  // 4. Evaluate Policy Strategy with Intent Intelligence & Dynamic Latency Penalties
  const healthStats = getModelHealthStats();
  const getDynamicScore = (modelName) => {
    let score = getModelPriorityScore(modelName);
    const health = healthStats.get(modelName);
    if (health) score += health.penalty;
    return score;
  };

  let selected = null;
  let reason = "";

  if (policyMode === "economy") {
    // Lowest tier, prioritize stable & healthy models
    const sorted = [...pool].sort((a, b) => {
      const aScore = getDynamicScore(a.internal_name);
      const bScore = getDynamicScore(b.internal_name);
      if (aScore !== bScore) return aScore - bScore;
      return (a.tier || 1) - (b.tier || 1);
    });
    selected = sorted[0];
    reason = `Selected ${selected.internal_name} under Economy policy (${classification.domain})`;
  } else if (policyMode === "quality") {
    // Highest tier, prioritize reasoning / coding capability
    const sorted = [...pool].sort((a, b) => {
      const aScore = getDynamicScore(a.internal_name);
      const bScore = getDynamicScore(b.internal_name);
      if (aScore !== bScore) return aScore - bScore;
      return (b.tier || 1) - (a.tier || 1) || (b.context_limit || 0) - (a.context_limit || 0);
    });
    selected = sorted[0];
    reason = `Selected ${selected.internal_name} as top quality tier (${selected.tier}) under Quality policy`;
  } else {
    // BALANCED: Intelligently adapt to classified domain & complexity!
    const sorted = [...pool].sort((a, b) => {
      const aScore = getDynamicScore(a.internal_name);
      const bScore = getDynamicScore(b.internal_name);
      return aScore - bScore;
    });
    selected = sorted[0];
    reason = `Balanced Strategy: Auto-routed to ${selected.internal_name} based on ${classification.domain} intent (${classification.reason})`;
  }

  // 5. Auto-Role Matching
  let assignedRole = null;
  if (classification.recommendedRole) {
    assignedRole = db.get("SELECT * FROM roles WHERE role_key = ?", [classification.recommendedRole]);
    if (!assignedRole) {
      assignedRole = db.get("SELECT * FROM roles WHERE is_default = 1");
    }
  }

  // Update role's current activity live
  if (assignedRole) {
    try {
      const now = new Date().toISOString();
      const activityText = `Executing ${classification.domain} prompt`;
      db.run("UPDATE roles SET current_activity = ?, updated_at = ? WHERE id = ?", [activityText, now, assignedRole.id]);
    } catch {}
  }

  // 6. Construct resilient fallback list with guaranteed stable models
  const fallbackSet = new Set();
  for (const m of STABLE_MODELS_PRIORITY) {
    if (m !== selected.backend_model_id) fallbackSet.add(m);
  }
  for (const c of pool) {
    if (c.backend_model_id !== selected.backend_model_id) fallbackSet.add(c.backend_model_id);
    if (fallbackSet.size >= 5) break;
  }

  const fallbacks = Array.from(fallbackSet);

  return {
    selectedModel: selected.internal_name,
    backendModelId: selected.backend_model_id,
    modelRegistryId: selected.id,
    policyId: policyRecord ? policyRecord.id : null,
    policyVersion: policyRecord ? policyRecord.version : 1,
    assignedRoleId: assignedRole ? assignedRole.id : null,
    assignedRoleKey: assignedRole ? assignedRole.role_key : "fullstack-engineer",
    assignedRoleName: assignedRole ? assignedRole.name : "Lead Fullstack Engineer",
    strategy: policyMode,
    reason,
    analysis,
    classification,
    fallbacks,
  };
}

module.exports = {
  resolveRouting,
  VIRTUAL_MODELS,
  STABLE_MODELS_PRIORITY,
};
