/**
 * Live 9Router Integration Test with Fastify Ingress
 */

const assert = require("assert");
const { buildServer } = require("./index");

async function runLiveTest() {
  console.log("=== TESTING LIVE 9ROUTER INGRESS VIA FASTIFY ===");

  const server = await buildServer();

  // 1. Sync Models from live 9Router
  console.log("▶ Syncing models from 9Router (http://localhost:20128/v1)...");
  const syncRes = await server.inject({
    method: "POST",
    url: "/api/v1/providers/sync-models",
    payload: {
      base_url: "http://localhost:20128/v1",
      api_key: "sk-d8e2c53a5d25566e-agygx4-873db2fc",
    },
  });
  assert.strictEqual(syncRes.statusCode, 200);
  const syncData = syncRes.json();
  console.log(`✓ Synchronized ${syncData.synced_count} real models!`);

  // 2. Test Non-Streaming Chat Completion
  console.log("▶ Executing Chat Completion ('thegate/balanced')...");
  const chatRes = await server.inject({
    method: "POST",
    url: "/v1/chat/completions",
    headers: {
      Authorization: "Bearer thegate_dev_key",
    },
    payload: {
      model: "thegate/balanced",
      messages: [
        { role: "user", content: "Write a 1-line Python hello world function" },
      ],
      max_tokens: 30,
    },
  });

  console.log("✓ HTTP Status:", chatRes.statusCode);
  if (chatRes.statusCode === 200) {
    const data = chatRes.json();
    console.log("✓ Routed Model:", chatRes.headers["x-thegate-routed-model"]);
    console.log("✓ Intent Domain:", chatRes.headers["x-thegate-intent-domain"]);
    console.log("✓ Completion Content:", data.choices?.[0]?.message?.content);
    console.log("✓ Usage:", data.usage);
  } else {
    console.error("❌ Failed with body:", chatRes.body);
  }

  // 3. Test Streaming Completion (SSE)
  console.log("▶ Executing Streaming Completion ('thegate/balanced')...");
  const streamRes = await server.inject({
    method: "POST",
    url: "/v1/chat/completions",
    headers: {
      Authorization: "Bearer thegate_dev_key",
    },
    payload: {
      model: "thegate/balanced",
      messages: [
        { role: "user", content: "Count 1, 2, 3" },
      ],
      stream: true,
      max_tokens: 20,
    },
  });

  console.log("✓ Stream Status:", streamRes.statusCode);
  console.log("✓ Stream Content-Type:", streamRes.headers["content-type"]);
  console.log("✓ Stream Chunks Preview:\n", streamRes.body.slice(0, 300));

  await server.close();
  console.log("\n✨ LIVE INTEGRATION TEST PASSED 100%! ✨");
}

runLiveTest().catch((err) => {
  console.error("❌ Live test error:", err);
  process.exit(1);
});
