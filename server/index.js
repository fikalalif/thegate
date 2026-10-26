/**
 * TheGate Standalone Fastify Gateway Server
 * 100% Native Node.js Ingress Engine (Unified Single Port 4848 Architecture)
 */

const Fastify = require("fastify");
const cors = require("@fastify/cors");
const proxy = require("@fastify/http-proxy");
const fastifyStatic = require("@fastify/static");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const db = require("./db/index");
const { seedDefaults } = require("./db/seed");

const healthRoutes = require("./routes/health");
const completionsRoutes = require("./routes/completions");
const keysRoutes = require("./routes/keys");
const policiesRoutes = require("./routes/policies");
const modelsRoutes = require("./routes/models");
const providersRoutes = require("./routes/providers");
const rolesRoutes = require("./routes/roles");
const analyticsRoutes = require("./routes/analytics");
const authRoutes = require("./routes/auth");
const eventsRoutes = require("./routes/events");

// UNIFIED SINGLE PORT ARCHITECTURE
const PORT = Number(process.env.THEGATE_PORT || process.env.PORT || 4848);
const HOST = process.env.THEGATE_HOST || "0.0.0.0";
const INTERNAL_WEB_PORT = Number(process.env.THEGATE_INTERNAL_WEB_PORT || 4849);

async function buildServer(options = {}) {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  // Enable CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // Initialize DB & Seed Defaults
  db.initDatabase();
  seedDefaults();

  // 1. Register API Routes
  await fastify.register(healthRoutes);
  await fastify.register(completionsRoutes);
  await fastify.register(keysRoutes);
  await fastify.register(policiesRoutes);
  await fastify.register(modelsRoutes);
  await fastify.register(providersRoutes);
  await fastify.register(rolesRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(authRoutes);
  await fastify.register(eventsRoutes);

  // 2. High-Performance Static Asset Delivery (Zero-404 on _next/static & public assets)
  const publicPath = path.join(__dirname, "..", "frontend", "public");
  if (fs.existsSync(publicPath)) {
    await fastify.register(fastifyStatic, {
      root: publicPath,
      prefix: "/",
      wildcard: false,
    });
  }

  const staticPath = path.join(__dirname, "..", "frontend", ".next", "static");
  if (fs.existsSync(staticPath)) {
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: "/_next/static/",
      decorateReply: false,
    });
  }

  // 3. UNIFIED SINGLE PORT: Proxy frontend dashboard routes to Next.js internal server
  if (options.enableProxy !== false) {
    await fastify.register(proxy, {
      upstream: `http://127.0.0.1:${INTERNAL_WEB_PORT}`,
      prefix: "/",
      http2: false,
    });
  }

  return fastify;
}

let nextWorker = null;

function waitForPort(port, timeoutMs = 8000) {
  const startT = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() - startT > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 150);
        }
      });
      req.setTimeout(500, () => {
        req.destroy();
        if (Date.now() - startT > timeoutMs) resolve(false);
        else setTimeout(check, 150);
      });
    };
    check();
  });
}

function startNextWorker() {
  const standaloneServer = path.join(__dirname, "..", "frontend", ".next", "standalone", "server.js");
  if (!fs.existsSync(standaloneServer)) return null;

  try {
    const isWin = process.platform === "win32";
    const child = spawn(process.execPath || "node", [standaloneServer], {
      cwd: path.dirname(standaloneServer),
      detached: !isWin,
      shell: false,
      env: { ...process.env, PORT: String(INTERNAL_WEB_PORT), HOSTNAME: "0.0.0.0" },
      stdio: ["ignore", "ignore", "inherit"],
    });

    child.on("error", (err) => {
      console.error("[Next.js Worker Error]:", err.message);
    });

    if (child.unref && !isWin) {
      child.unref();
    }

    return child;
  } catch (err) {
    console.error("[Next.js Worker Spawn Failed]:", err.message);
    return null;
  }
}

async function start() {
  try {
    // 1. Supervise internal Next.js standalone worker
    const isPortOpen = await waitForPort(INTERNAL_WEB_PORT, 300);
    if (!isPortOpen) {
      nextWorker = startNextWorker();
      await waitForPort(INTERNAL_WEB_PORT, 6000);
    }

    // 2. Start Unified Fastify Gateway
    const server = await buildServer({ enableProxy: true });
    await server.listen({ port: PORT, host: HOST });
    console.log(`[TheGate Unified Gateway] Online & listening on http://${HOST}:${PORT}`);
    console.log(`  • Web Dashboard & 16-Bit Office: http://localhost:${PORT}`);
    console.log(`  • Ingress Completions API:       http://localhost:${PORT}/v1/chat/completions`);

    const shutdown = async () => {
      console.log("\n[TheGate Unified Gateway] Shutting down gracefully...");
      if (nextWorker) {
        try {
          nextWorker.kill();
        } catch {}
      }
      await server.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("[TheGate Unified Gateway Fatal Error]:", err);
    if (nextWorker) {
      try {
        nextWorker.kill();
      } catch {}
    }
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = {
  buildServer,
  PORT,
  INTERNAL_WEB_PORT,
};
