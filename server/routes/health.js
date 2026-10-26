/**
 * Health & Readiness Probes
 */

async function healthRoutes(fastify, options) {
  fastify.get("/health", async (request, reply) => {
    return {
      status: "ok",
      app: "TheGate",
      version: "1.5.0",
      environment: process.env.NODE_ENV || "production",
      runtime: "node-fastify",
    };
  });

  fastify.get("/ready", async (request, reply) => {
    return {
      status: "ready",
      database: "connected",
      app: "TheGate",
    };
  });
}

module.exports = healthRoutes;
