/**
 * Real-Time Telemetry Stream Route (SSE)
 */

const eventBus = require("../engine/events");

async function eventsRoutes(fastify, options) {
  fastify.get("/api/v1/events/stream", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    eventBus.addClient(reply);

    // Keep response open for SSE stream
    await new Promise(() => {});
  });
}

module.exports = eventsRoutes;
