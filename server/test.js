/**
 * Comprehensive Automated Test Suite for Fastify TheGate Engine
 */

const assert = require("assert");
const { buildServer } = require("./index");
const db = require("./db/index");
const { classifyIntent, TaskDomain } = require("./engine/classifier");
const { resolveRouting } = require("./engine/router");

async function runTests() {
  console.log("=================================================");
  console.log("   THEGATE FASTIFY ENGINE AUTOMATED TEST SUITE   ");
  console.log("=================================================\n");

  const server = await buildServer();

  // Test 1: Health & Ready Probes
  console.log("▶ [Test 1] Health & Readiness Probes...");
  const resHealth = await server.inject({ method: "GET", url: "/health" });
  assert.strictEqual(resHealth.statusCode, 200);
  const healthJson = resHealth.json();
  assert.strictEqual(healthJson.status, "ok");
  assert.strictEqual(healthJson.app, "TheGate");
  console.log("  ✓ /health: 200 OK -", JSON.stringify(healthJson));

  const resReady = await server.inject({ method: "GET", url: "/ready" });
  assert.strictEqual(resReady.statusCode, 200);
  assert.strictEqual(resReady.json().status, "ready");
  console.log("  ✓ /ready: 200 OK");

  // Test 2: Database Seeding Verification
  console.log("\n▶ [Test 2] Database Seeding Verification...");
  const keys = db.all("SELECT * FROM api_keys");
  assert.ok(keys.length >= 3, "Expected at least 3 seeded API keys");
  console.log(`  ✓ Seeded API keys count: ${keys.length}`);

  const policies = db.all("SELECT * FROM routing_policies");
  assert.ok(policies.length >= 3, "Expected at least 3 seeded policies");
  console.log(`  ✓ Seeded Policies count: ${policies.length}`);

  const roles = db.all("SELECT * FROM roles");
  assert.ok(roles.length >= 5, "Expected at least 5 default workforce roles");
  console.log(`  ✓ Seeded Roles count: ${roles.length} (${roles.map(r => r.name).join(", ")})`);

  // Test 3: Predictive Intent Classifier
  console.log("\n▶ [Test 3] Predictive Intent & Complexity Classifier...");
  const codePrompt = [{ role: "user", content: "Write a Rust async function with Tokio to implement a lock-free ring buffer" }];
  const codeClassification = classifyIntent(codePrompt);
  assert.strictEqual(codeClassification.domain, TaskDomain.CODING_AND_DEV);
  console.log(`  ✓ Coding Prompt classified as: ${codeClassification.domain} (confidence: ${codeClassification.confidence})`);

  const archPrompt = [{ role: "user", content: "Jelaskan trade-off arsitektur distributed consensus Raft vs Paxos untuk high-frequency trading" }];
  const archClassification = classifyIntent(archPrompt);
  assert.strictEqual(archClassification.domain, TaskDomain.DEEP_REASONING);
  console.log(`  ✓ Architecture Prompt classified as: ${archClassification.domain} (confidence: ${archClassification.confidence})`);

  const fastPrompt = [{ role: "user", content: "Halo apa kabar?" }];
  const fastClassification = classifyIntent(fastPrompt);
  assert.strictEqual(fastClassification.domain, TaskDomain.FAST_UTILITY);
  console.log(`  ✓ General Q&A classified as: ${fastClassification.domain}`);

  // Test 4: Intelligent Routing Engine
  console.log("\n▶ [Test 4] Intelligent Routing Engine...");
  const routing = resolveRouting({
    model: "thegate/balanced",
    messages: [{ role: "user", content: "Refactor this Python FastAPI endpoint with async session" }],
  });
  assert.ok(routing.selectedModel, "Expected a selected model");
  assert.ok(Array.isArray(routing.fallbacks), "Expected fallback candidates array");
  console.log(`  ✓ 'thegate/balanced' routed to: ${routing.selectedModel}`);
  console.log(`  ✓ Strategy reason: ${routing.reason}`);
  console.log(`  ✓ Resilient fallbacks: ${routing.fallbacks.join(", ") || "(none)"}`);

  // Test 5: Authentication & Completions Security
  console.log("\n▶ [Test 5] Completions Authentication Security...");
  const resNoAuth = await server.inject({
    method: "POST",
    url: "/v1/chat/completions",
    payload: { model: "thegate/balanced", messages: [{ role: "user", content: "hi" }] },
  });
  assert.strictEqual(resNoAuth.statusCode, 401);
  console.log("  ✓ Unauthenticated request rejected with 401:", resNoAuth.json().error.message);

  const resBadKey = await server.inject({
    method: "POST",
    url: "/v1/chat/completions",
    headers: { Authorization: "Bearer sk-invalid-key" },
    payload: { model: "thegate/balanced", messages: [{ role: "user", content: "hi" }] },
  });
  assert.strictEqual(resBadKey.statusCode, 401);
  console.log("  ✓ Invalid API key rejected with 401:", resBadKey.json().error.message);

  // Test 6: API Management Endpoints
  console.log("\n▶ [Test 6] Management REST Endpoints...");
  const resKeys = await server.inject({ method: "GET", url: "/api/v1/keys" });
  assert.strictEqual(resKeys.statusCode, 200);
  console.log(`  ✓ GET /api/v1/keys: 200 OK (${resKeys.json().keys.length} keys returned)`);

  const resPolicies = await server.inject({ method: "GET", url: "/api/v1/policies" });
  assert.strictEqual(resPolicies.statusCode, 200);
  console.log(`  ✓ GET /api/v1/policies: 200 OK (${resPolicies.json().policies.length} policies returned)`);

  const resRoles = await server.inject({ method: "GET", url: "/api/v1/roles" });
  assert.strictEqual(resRoles.statusCode, 200);
  console.log(`  ✓ GET /api/v1/roles: 200 OK (${resRoles.json().length} roles returned)`);

  const resOverview = await server.inject({ method: "GET", url: "/api/v1/analytics/overview" });
  assert.strictEqual(resOverview.statusCode, 200);
  console.log(`  ✓ GET /api/v1/analytics/overview: 200 OK (Total requests recorded: ${resOverview.json().total_requests})`);

  const resLive = await server.inject({ method: "GET", url: "/api/v1/analytics/live-traffic" });
  assert.strictEqual(resLive.statusCode, 200);
  console.log(`  ✓ GET /api/v1/analytics/live-traffic: 200 OK (${resLive.json().events.length} live events)`);

  console.log("\n=================================================");
  console.log("  ✨ ALL 6 TEST SUITES PASSED FLAWLESSLY! ✨   ");
  console.log("=================================================\n");
  await server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
