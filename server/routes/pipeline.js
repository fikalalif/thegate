/**
 * TheGate Pipeline Execution Routes
 * Manages Multi-Agent DAG Pipelines
 */

const pipelineEngine = require("../engine/pipeline");

async function pipelineRoutes(fastify, options) {
  // 1. Dispatch a new pipeline
  fastify.post("/api/v1/pipeline/dispatch", async (request, reply) => {
    try {
      const pipeline = await pipelineEngine.createPipeline(request.body || {});
      const shouldWait = Boolean(request.body && request.body.wait);

      if (shouldWait) {
        const completed = await pipelineEngine.executePipeline(pipeline.pipelineId);
        return reply.send({
          success: true,
          pipelineId: completed.pipelineId,
          status: completed.status,
          totalDurationMs: completed.totalDurationMs,
          totalTokens: completed.totalTokens,
          finalOutput: completed.finalOutput,
          steps: completed.steps,
        });
      }

      // Execute in background
      pipelineEngine.executePipeline(pipeline.pipelineId).catch((err) => {
        console.error(`[Pipeline ${pipeline.pipelineId} Background Error]:`, err);
      });

      return reply.code(202).send({
        success: true,
        pipelineId: pipeline.pipelineId,
        status: pipeline.status,
        title: pipeline.title,
        totalSteps: pipeline.totalSteps,
        message: "Pipeline dispatched successfully. Telemetry broadcasting to SSE /api/v1/events/stream",
        steps: pipeline.steps.map((s) => ({
          id: s.id,
          title: s.title,
          roleKey: s.roleKey,
          roleName: s.roleName,
          modelSelected: s.modelSelected,
        })),
      });
    } catch (err) {
      reply.code(500).send({
        error: {
          message: err.message,
          type: "pipeline_error",
        },
      });
    }
  });

  // 2. Get state of specific pipeline
  fastify.get("/api/v1/pipeline/:id/state", async (request, reply) => {
    const pipeline = pipelineEngine.getPipeline(request.params.id);
    if (!pipeline) {
      return reply.code(404).send({
        error: {
          message: `Pipeline ${request.params.id} not found`,
          type: "not_found",
        },
      });
    }
    return reply.send(pipeline);
  });

  // 3. Get all active pipelines
  fastify.get("/api/v1/pipeline/active", async (request, reply) => {
    return reply.send({
      activePipelines: pipelineEngine.getActivePipelines(),
    });
  });
}

module.exports = pipelineRoutes;
