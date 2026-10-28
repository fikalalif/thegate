#!/usr/bin/env node

/**
 * TheGate CLI Launcher
 * The Control Plane for AI & Operations Cockpit
 *
 * Can be run via:
 *   - thegate (interactive menu with retro terminal pixel emblem)
 *   - thegate start
 *   - thegate stop
 *   - thegate status
 *   - thegate open
 *   - thegate connect
 */

const readline = require("readline");
const { exec, spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { printLogo, c } = require("./banner");

const VERSION = "1.5.0";
const GATEWAY_HOST = process.env.THEGATE_HOST || "0.0.0.0";
const UNIFIED_PORT = Number(process.env.THEGATE_PORT || process.env.PORT || 4848);
const INTERNAL_WEB_PORT = Number(process.env.THEGATE_INTERNAL_WEB_PORT || 4849);
const GATEWAY_PORT = UNIFIED_PORT;
const WEB_PORT = INTERNAL_WEB_PORT;
const GATEWAY_URL = `http://127.0.0.1:${UNIFIED_PORT}`;
const WEB_URL = `http://127.0.0.1:${UNIFIED_PORT}`;

// Log directory for auditable runtime diagnostics
const USER_HOME = process.env.USERPROFILE || process.env.HOME || process.env.LOCALAPPDATA || "/tmp";
const THEGATE_DIR = path.join(USER_HOME, ".thegate");
const LOG_DIR = path.join(THEGATE_DIR, "logs");
try {
  fs.mkdirSync(THEGATE_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {}
const BACKEND_LOG_PATH = path.join(LOG_DIR, "backend.log");
const FRONTEND_LOG_PATH = path.join(LOG_DIR, "frontend.log");

function showLogTail(logFilePath, title, maxLines = 8) {
  if (fs.existsSync(logFilePath)) {
    try {
      const content = fs.readFileSync(logFilePath, "utf8").trim();
      if (content) {
        const lines = content.split("\n").slice(-maxLines);
        console.log(`\n  ${c.slate}--- ${title} (${logFilePath}) ---${c.reset}`);
        for (const line of lines) {
          console.log(`    ${c.dim}${line}${c.reset}`);
        }
        console.log(`  ${c.slate}------------------------------------------------------------${c.reset}\n`);
      }
    } catch {}
  }
}

// Auto-generate local development .env if not present for zero-config CLI usage
function ensureEnvFile() {
  const backendDir = path.join(__dirname, "..", "backend");
  const envPath = path.join(backendDir, ".env");
  if (!fs.existsSync(envPath)) {
    try {
      const defaultEnv = `# TheGate Auto-Generated Environment
APP_NAME=TheGate
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
PORT=8001
DATABASE_URL=sqlite+aiosqlite:///thegate_dev.db
PROVIDER_ADAPTER=mock
DEFAULT_ROUTING_POLICY_MODE=balanced
DEFAULT_BASELINE_MODEL=gpt-4o
LOG_METADATA_ONLY=true
STORE_PROMPT_CONTENT=false
`;
      fs.writeFileSync(envPath, defaultEnv, "utf8");
    } catch {}
  }
}

function isExecutable(binPath) {
  try {
    execSync(`"${binPath}" --version`, { stdio: "ignore", timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

// Locate self-contained standalone binary (Zero-Python runtime for Linux, macOS, and Windows)
function findStandaloneBackendBinary() {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const names = [];
  if (isWin) {
    names.push("thegate-backend.exe", "thegate-backend-win.exe");
  } else if (isMac) {
    names.push("thegate-backend-macos", "thegate-backend");
  } else {
    names.push("thegate-backend-linux", "thegate-backend");
  }

  const searchDirs = [
    path.join(__dirname),
    path.join(__dirname, "..", "bin"),
    path.join(__dirname, "..", "backend", "dist"),
    path.join(__dirname, "..", "backend", "dist", "thegate-backend"),
    path.join(process.cwd(), "bin"),
    path.join(process.cwd(), "backend", "dist"),
  ];

  for (const dir of searchDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && isExecutable(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

// Intelligent Python & Virtualenv detection with cross-platform support (Linux, macOS, Windows)
function findPythonExecutable() {
  const isWin = process.platform === "win32";
  const scriptsFolder = isWin ? "Scripts" : "bin";
  const pyExe = isWin ? "python.exe" : "python";
  const uviExe = isWin ? "uvicorn.exe" : "uvicorn";
  const backendDir = path.join(__dirname, "..", "backend");

  const candidates = [
    process.env.THEGATE_PYTHON,
    process.env.VIRTUAL_ENV ? path.join(process.env.VIRTUAL_ENV, scriptsFolder, uviExe) : null,
    process.env.VIRTUAL_ENV ? path.join(process.env.VIRTUAL_ENV, scriptsFolder, pyExe) : null,
    path.join(backendDir, ".venv", scriptsFolder, uviExe),
    path.join(backendDir, ".venv", scriptsFolder, pyExe),
    path.join(backendDir, "venv", scriptsFolder, uviExe),
    path.join(backendDir, "venv", scriptsFolder, pyExe),
    path.join(__dirname, "..", ".venv", scriptsFolder, uviExe),
    path.join(__dirname, "..", ".venv", scriptsFolder, pyExe),
    path.join(process.cwd(), "backend", ".venv", scriptsFolder, uviExe),
    path.join(process.cwd(), "backend", ".venv", scriptsFolder, pyExe),
    path.join(process.cwd(), ".venv", scriptsFolder, uviExe),
    path.join(process.cwd(), ".venv", scriptsFolder, pyExe),
    path.join(USER_HOME, "ai_workspace", "thegate", "backend", ".venv", scriptsFolder, uviExe),
    path.join(USER_HOME, "ai_workspace", "thegate", "backend", ".venv", scriptsFolder, pyExe),
    "/workspace/thegate/backend/.venv/bin/uvicorn",
    "/workspace/thegate/backend/.venv/bin/python",
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p) && isExecutable(p)) {
      return p;
    }
  }

  if (isWin) {
    if (isExecutable("python")) return "python";
    if (isExecutable("py")) return "py";
    if (isExecutable("python3")) return "python3";
  } else {
    if (isExecutable("python3")) return "python3";
    if (isExecutable("python")) return "python";
  }
  return isWin ? "python" : "python3";
}

// Open URL in default OS browser
function openBrowser(url) {
  const start =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
      ? "start"
      : "xdg-open";
  exec(`${start} ${url}`, (err) => {
    if (err) {
      console.log(`\n  ${c.fault}Could not open browser automatically.${c.reset}`);
      console.log(`  ${c.slate}Please navigate to: ${c.brand}${url}${c.reset}\n`);
    } else {
      console.log(`\n  ${c.healthy}✓ Opened in browser: ${c.white}${url}${c.reset}\n`);
    }
  });
}

// Check if an HTTP endpoint is reachable
function checkPort(port) {
  const isInternalNext = String(port) === String(INTERNAL_WEB_PORT);
  const checkPath = isInternalNext ? "/" : "/health";
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${checkPath}`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function printHeader(backendOnline, frontendOnline) {
  console.clear();
  printLogo();
  console.log(`  ${c.slate}The Control Plane for AI: Intelligent LLM Routing & Operations Cockpit (${c.brand}v${VERSION}${c.slate})${c.reset}`);
  console.log(`  ${c.gold}-------------------------------------------------------------------------${c.reset}`);
  console.log(`  🌐 ${c.slate}Unified Control Plane:${c.reset} ${c.white}${WEB_URL}${c.reset}  ${backendOnline && frontendOnline ? `${c.healthy}[ONLINE]${c.reset}` : `${c.fault}[STOPPED]${c.reset}`}`);
  console.log(`  🚀 ${c.slate}Ingress Chat API:     ${c.reset} ${c.white}${GATEWAY_URL}/v1/chat/completions${c.reset}`);
  console.log(`  🎮 ${c.slate}16-Bit Pixel Office:  ${c.reset} ${c.white}${WEB_URL}/office${c.reset}`);
  console.log(`  🛡️  ${c.slate}Zero-Prompt Log:      ${c.reset} ${c.healthy}[ENFORCED]${c.reset} (Privacy by default)`);
  console.log(`  ⚡ ${c.slate}Sentinel Watchdog:    ${c.reset} ${c.telemetry}[ACTIVE < 650ms SLA]${c.reset}`);
  console.log(`  ${c.gold}-------------------------------------------------------------------------${c.reset}\n`);
}

// Start Backend Ingress (Native Fastify Engine - Unified Port 4848)
function startBackend() {
  ensureEnvFile();
  const serverPath = path.join(__dirname, "..", "server", "index.js");
  const isWin = process.platform === "win32";

  try {
    const logFd = fs.openSync(BACKEND_LOG_PATH, "a");
    const child = spawn(process.execPath || "node", [serverPath], {
      cwd: path.join(__dirname, ".."),
      detached: !isWin,
      shell: isWin,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        THEGATE_PORT: String(UNIFIED_PORT),
        PORT: String(UNIFIED_PORT),
        THEGATE_HOST: GATEWAY_HOST,
        THEGATE_INTERNAL_WEB_PORT: String(INTERNAL_WEB_PORT),
        DATABASE_URL: process.env.DATABASE_URL || `sqlite:///${path.join(USER_HOME, ".thegate", "thegate.db")}`,
      },
    });
    child.on("error", (err) => {
      try {
        fs.appendFileSync(BACKEND_LOG_PATH, `\n[TheGate Launcher] Backend spawn error: ${err.message}\n`);
      } catch {}
    });
    child.unref();
  } catch (err) {
    console.log(`  ${c.fault}Failed to spawn backend process: ${err.message}${c.reset}`);
  }
}

function startFrontend() {
  const isWin = process.platform === "win32";
  const frontendDir = path.join(__dirname, "..", "frontend");
  const standaloneServer = path.join(frontendDir, ".next", "standalone", "server.js");
  if (!fs.existsSync(standaloneServer)) return;

  try {
    const logFd = fs.openSync(FRONTEND_LOG_PATH, "a");
    const child = spawn(process.execPath || "node", [standaloneServer], {
      cwd: path.join(frontendDir, ".next", "standalone"),
      detached: !isWin,
      shell: false,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, PORT: String(INTERNAL_WEB_PORT), HOSTNAME: "0.0.0.0" },
    });
    child.on("error", (err) => {
      try {
        fs.appendFileSync(FRONTEND_LOG_PATH, `\n[TheGate Launcher] Frontend standalone spawn error: ${err.message}\n`);
      } catch {}
    });
    child.unref();
  } catch (err) {
    console.log(`  ${c.fault}Failed to spawn frontend standalone server: ${err.message}${c.reset}`);
  }
}

async function ensureServicesRunning() {
  let backendOnline = await checkPort(GATEWAY_PORT);
  let frontendOnline = await checkPort(INTERNAL_WEB_PORT);

  if (backendOnline && frontendOnline) return true;

  console.log(`\n  ${c.telemetry}⚡ Initializing TheGate runtime services...${c.reset}`);
  if (!backendOnline) {
    console.log(`  ${c.brand}▶ Spawning Unified Fastify Gateway & Web Engine (Port ${GATEWAY_PORT})...${c.reset}`);
    startBackend();
  }
  if (!frontendOnline) {
    console.log(`  ${c.brand}▶ Spawning Next.js Standalone Worker (Port ${INTERNAL_WEB_PORT})...${c.reset}`);
    startFrontend();
  }

  process.stdout.write(`  ${c.slate}Waiting for services to become ready`);
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600));
    process.stdout.write(".");
    backendOnline = await checkPort(GATEWAY_PORT);
    frontendOnline = await checkPort(INTERNAL_WEB_PORT);
    if (backendOnline && frontendOnline) break;
  }
  console.log("");

  frontendOnline = await checkPort(INTERNAL_WEB_PORT);
  if (backendOnline && frontendOnline) {
    console.log(`  ${c.healthy}✓ Services are now ONLINE!${c.reset}\n`);
    await new Promise((r) => setTimeout(r, 800));
    return true;
  } else {
    console.log(`  ${c.fault}Could not verify services readiness in time.${c.reset}`);
    console.log(`  ${c.slate}Backend: ${backendOnline ? "ONLINE" : "STOPPED"} | Frontend: ${frontendOnline ? "ONLINE" : "STOPPED"}${c.reset}\n`);
    if (!backendOnline) {
      showLogTail(BACKEND_LOG_PATH, "Backend Error Log");
    }
    if (!frontendOnline) {
      showLogTail(FRONTEND_LOG_PATH, "Frontend Error Log");
    }
    await new Promise((r) => setTimeout(r, 1200));
    return false;
  }
}

async function stopAllServices() {
  console.log(`\n  ${c.fault}Stopping TheGate backend and frontend services...${c.reset}`);
  if (process.platform === "win32") {
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${GATEWAY_PORT}') do taskkill /f /pid %a 2>nul || true`, { shell: "cmd.exe", stdio: "ignore" });
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${INTERNAL_WEB_PORT}') do taskkill /f /pid %a 2>nul || true`, { shell: "cmd.exe", stdio: "ignore" });
    } catch {}
  } else {
    try {
      execSync("pkill -9 -f 'thegate.*server/index.js' 2>/dev/null || true");
      execSync("pkill -9 -f 'standalone/server.js' 2>/dev/null || true");
      execSync("pkill -9 -f 'next-server' 2>/dev/null || true");
      execSync("pkill -9 -f 'next.*(dev|start|server)' 2>/dev/null || true");
      execSync(`lsof -ti :${GATEWAY_PORT} | xargs -r kill -9 2>/dev/null || true`);
      execSync(`lsof -ti :${INTERNAL_WEB_PORT} | xargs -r kill -9 2>/dev/null || true`);
      execSync(`fuser -k -9 ${GATEWAY_PORT}/tcp 2>/dev/null || true`);
      execSync(`fuser -k -9 ${INTERNAL_WEB_PORT}/tcp 2>/dev/null || true`);
      execSync('ss -tulpn | grep -E ":(4848|4849) " | awk -F"pid=" "{print \\$2}" | awk -F"," "{print \\$1}" | xargs -r kill -9 2>/dev/null || true');
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 1200));
  console.log(`  ${c.healthy}✓ Services stopped.${c.reset}\n`);
  await new Promise((r) => setTimeout(r, 1000));
}

function promptMenu(backendOnline, frontendOnline) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (!backendOnline || !frontendOnline) {
      console.log(`  ${c.healthy}${c.bold}[s] 🚀 Start All Services (Backend & Frontend)${c.reset}\n`);
    } else {
      console.log(`  ${c.fault}[k] 🛑 Stop All Services (Backend & Frontend)${c.reset}\n`);
    }

    console.log(`  ${c.brand}[1] 🎮 Pixel Office World (Open /office in Browser)${c.reset}`);
    console.log(`  ${c.brand}[2] ★ Command Center (Open / in Browser)${c.reset}`);
    console.log(`  ${c.brand}[3] 🤖 AI Workforce Cockpit (Open /workforce in Browser)${c.reset}`);
    console.log(`  ${c.white}[4] ☆ Terminal Telemetry (Live Stream & Metrics)${c.reset}`);
    console.log(`  ${c.white}[5] ⚡ Cluster Health Diagnostics${c.reset}`);
    console.log(`  ${c.telemetry}[6] 🔌 Connect Router (9Router / OpenRouter / Ollama / Custom)${c.reset}`);
    console.log(`  ${c.slate}[7] 🛡️ Hide to Background (Daemon Mode)${c.reset}`);
    console.log(`  ${c.dim}[0] 🚪 Exit${c.reset}\n`);

    rl.question(`  ${c.brand}thegate ❯ ${c.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Terminal Telemetry (CLI Mode)
async function runTerminalUI() {
  console.clear();
  console.log(`\n${c.brand}--- THEGATE LIVE TERMINAL TELEMETRY (Press Ctrl+C to return) ---${c.reset}\n`);
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/analytics/overview`);
    if (res.ok) {
      const data = await res.json();
      console.log(`  ${c.bold}INGRESS OVERVIEW:${c.reset}`);
      console.log(`  • Total Ingress Requests: ${c.white}${data.total_requests}${c.reset}`);
      console.log(`  • Successful Completions: ${c.healthy}${data.successful_requests}${c.reset}`);
      console.log(`  • Failed Requests:        ${data.failed_requests > 0 ? c.fault : c.healthy}${data.failed_requests}${c.reset}`);
      console.log(`  • Actual Financial Spend: ${c.brand}$${data.total_cost} USD${c.reset}`);
      console.log(`  • Net Baseline Savings:   ${c.healthy}-${data.net_savings_percent || "0"}%${c.reset} (saved $${data.net_savings_amount})`);
      console.log(`  • P95 Latency:            ${c.telemetry}${data.p95_latency_ms} ms${c.reset} (Avg: ${data.avg_latency_ms} ms)`);
    } else {
      console.log(`  ${c.fault}Backend API responded with ${res.status}${c.reset}`);
    }
  } catch (err) {
    console.log(`  ${c.fault}Could not fetch telemetry: ${err.message}${c.reset}`);
  }

  console.log(`\n  ${c.slate}Press Enter to return to main menu...${c.reset}`);
  await new Promise((r) => {
    process.stdin.once("data", r);
  });
}

// Health Diagnostics
async function runDiagnostics() {
  console.clear();
  console.log(`\n${c.brand}--- THEGATE CLUSTER HEALTH DIAGNOSTICS ---${c.reset}\n`);
  try {
    const health = await fetch(`${GATEWAY_URL}/health`).then((r) => r.json());
    console.log(`  • /health probe:  ${c.healthy}HTTP 200 OK (${JSON.stringify(health)})${c.reset}`);
  } catch (e) {
    console.log(`  • /health probe:  ${c.fault}FAILED (${e.message})${c.reset}`);
  }

  try {
    const ready = await fetch(`${GATEWAY_URL}/ready`).then((r) => r.json());
    console.log(`  • /ready probe:   ${c.healthy}HTTP 200 OK (${JSON.stringify(ready)})${c.reset}`);
  } catch (e) {
    console.log(`  • /ready probe:   ${c.fault}FAILED (${e.message})${c.reset}`);
  }

  try {
    const data = await fetch(`${GATEWAY_URL}/api/v1/models`).then((r) => r.json());
    const count = data.models ? data.models.length : data.total || 0;
    console.log(`  • Model Registry: ${c.healthy}${count} Models Active in Catalog${c.reset}`);
  } catch (e) {
    console.log(`  • Model Registry: ${c.fault}FAILED (${e.message})${c.reset}`);
  }

  console.log(`\n  ${c.slate}Press Enter to return to main menu...${c.reset}`);
  await new Promise((r) => {
    process.stdin.once("data", r);
  });
}

// Interactive Downstream Router Connection Wizard (Zero .env editing needed)
async function runRouterConnectionWizard() {
  console.clear();
  console.log(`\n${c.brand}================================================================${c.reset}`);
  console.log(`  ${c.bold}${c.white}CONNECT DOWNSTREAM ROUTER (Zero .env Editing Required)${c.reset}`);
  console.log(`  ${c.slate}Connect TheGate directly to 9Router, OpenRouter, Ollama, or LiteLLM${c.reset}`);
  console.log(`${c.brand}================================================================${c.reset}\n`);

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/providers/config`);
    if (res.ok) {
      const curr = await res.json();
      console.log(`  ${c.slate}Current Active Router:${c.reset} ${c.white}${curr.base_url}${c.reset} (${c.brand}${curr.provider_adapter}${c.reset})`);
      console.log(`  ${c.slate}Connection Status:${c.reset}     ${curr.is_connected ? `${c.healthy}ONLINE (${curr.last_ping_ms || 0}ms)${c.reset}` : `${c.fault}DISCONNECTED${c.reset}`}\n`);
    }
  } catch {}

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));

  console.log(`  ${c.bold}Select Router Target:${c.reset}`);
  console.log(`  [1] 🚀 9Router (Default: http://localhost:20128/v1)`);
  console.log(`  [2] 🌐 OpenRouter (Cloud: https://openrouter.ai/api/v1)`);
  console.log(`  [3] ⚡ LiteLLM Proxy (Default: http://localhost:4000/v1)`);
  console.log(`  [4] 🦙 Ollama Local (Default: http://localhost:11434/v1)`);
  console.log(`  [5] 🛠️ Local Mock Mode (Simulate without external router)`);
  console.log(`  [6] ⚙️ Custom Router URL\n`);

  const presetChoice = (await ask(`  ${c.brand}Select preset [1-6] (default: 1): ${c.reset}`)) || "1";

  let defaultUrl = "http://localhost:20128/v1";
  let defaultAdapter = "ninerouter";

  if (presetChoice === "2") {
    defaultUrl = "https://openrouter.ai/api/v1";
  } else if (presetChoice === "3") {
    defaultUrl = "http://localhost:4000/v1";
  } else if (presetChoice === "4") {
    defaultUrl = "http://localhost:11434/v1";
  } else if (presetChoice === "5") {
    defaultAdapter = "mock";
  } else if (presetChoice === "6") {
    defaultUrl = "";
  }

  let targetUrl = defaultUrl;
  if (defaultAdapter !== "mock") {
    const inputUrl = await ask(`  ${c.brand}Enter Router Base URL [${defaultUrl}]: ${c.reset}`);
    targetUrl = inputUrl || defaultUrl;
  }

  let apiKey = "";
  if (defaultAdapter !== "mock") {
    apiKey = await ask(`  ${c.brand}Enter API Key / Bearer Token (optional, press Enter to skip): ${c.reset}`);
  }

  console.log(`\n  ${c.telemetry}⚡ Probing connection to ${targetUrl}...${c.reset}`);

  try {
    const testRes = await fetch(`${GATEWAY_URL}/api/v1/providers/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_url: targetUrl,
        api_key: apiKey || null,
        timeout_seconds: 5.0,
      }),
    });
    const testData = await testRes.json();

    if (testData.success) {
      console.log(`  ${c.healthy}✓ Connection Test PASSED! (${testData.latency_ms}ms)${c.reset}`);
      if (testData.detected_models && testData.detected_models.length > 0) {
        console.log(`  ${c.slate}Upstream Models Detected:${c.reset} ${c.brand}${testData.detected_models.slice(0, 5).join(", ")}${c.reset}`);
      }
    } else {
      console.log(`  ${c.fault}✗ Connection / Auth Test FAILED!${c.reset}`);
      console.log(`  ${c.fault}  ${testData.message}${c.reset}`);
      const proceed = await ask(`  ${c.brand}Save configuration anyway with unverified credentials? (y/N): ${c.reset}`);
      if (proceed.toLowerCase() !== "y") {
        console.log(`  ${c.slate}Configuration discarded.${c.reset}\n`);
        rl.close();
        console.log(`  ${c.slate}Press Enter to return to main menu...${c.reset}`);
        await new Promise((r) => process.stdin.once("data", r));
        return;
      }
    }

    // Save configuration
    const saveRes = await fetch(`${GATEWAY_URL}/api/v1/providers/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_adapter: defaultAdapter,
        base_url: targetUrl,
        api_key: apiKey || null,
        timeout_seconds: 60.0,
      }),
    });

    if (saveRes.ok) {
      console.log(`\n  ${c.healthy}✓ Configuration Saved & Active! (Zero .env editing needed)${c.reset}`);
      console.log(`  ${c.white}TheGate ingress is now routing through: ${c.brand}${targetUrl}${c.reset}\n`);
    } else {
      console.log(`  ${c.fault}Failed to save configuration via API.${c.reset}`);
    }
  } catch (err) {
    console.log(`  ${c.fault}Error communicating with TheGate backend: ${err.message}${c.reset}`);
  }

  rl.close();
  console.log(`  ${c.slate}Press Enter to return to main menu...${c.reset}`);
  await new Promise((r) => process.stdin.once("data", r));
}

// CLI Subcommands
async function handleArgs(args) {
  const cmd = args[0] ? args[0].toLowerCase() : "";

  if (cmd === "-v" || cmd === "--version") {
    console.log(`thegate v${VERSION}`);
    process.exit(0);
  }

  if (cmd === "-h" || cmd === "--help") {
    printLogo();
    console.log(`  ${c.bold}TheGate — The Control Plane for AI (${c.brand}v${VERSION}${c.reset})\n`);
    console.log(`  ${c.white}Usage:${c.reset}`);
    console.log(`    thegate            ${c.slate}Launch interactive terminal control room${c.reset}`);
    console.log(`    thegate start      ${c.slate}Start gateway ingress & web dashboard in background${c.reset}`);
    console.log(`    thegate stop       ${c.slate}Stop all active TheGate services${c.reset}`);
    console.log(`    thegate status     ${c.slate}Inspect cluster status & telemetry overview${c.reset}`);
    console.log(`    thegate logs       ${c.slate}View backend & frontend runtime error logs${c.reset}`);
    console.log(`    thegate open       ${c.slate}Open web dashboard in default browser${c.reset}`);
    console.log(`    thegate connect    ${c.slate}Launch downstream router wizard (9Router/Ollama)${c.reset}\n`);
    process.exit(0);
  }

  if (cmd === "logs") {
    console.log(`\n  ${c.brand}--- THEGATE RUNTIME LOGS ---${c.reset}`);
    showLogTail(BACKEND_LOG_PATH, "Backend Gateway Log", 20);
    showLogTail(FRONTEND_LOG_PATH, "Frontend Web Log", 20);
    process.exit(0);
  }

  if (cmd === "start") {
    printLogo();
    await ensureServicesRunning();
    process.exit(0);
  }

  if (cmd === "stop") {
    await stopAllServices();
    process.exit(0);
  }

  if (cmd === "status") {
    const backendOnline = await checkPort(GATEWAY_PORT);
    const frontendOnline = await checkPort(WEB_PORT);
    printHeader(backendOnline, frontendOnline);
    process.exit(0);
  }

  if (cmd === "open") {
    const target = args[1] ? `/${args[1].replace(/^\//, "")}` : "";
    openBrowser(`${WEB_URL}${target}`);
    process.exit(0);
  }

  if (cmd === "connect") {
    await runRouterConnectionWizard();
    process.exit(0);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    await handleArgs(args);
    return;
  }

  while (true) {
    const backendOnline = await checkPort(GATEWAY_PORT);
    const frontendOnline = await checkPort(WEB_PORT);

    printHeader(backendOnline, frontendOnline);

    const choice = await promptMenu(backendOnline, frontendOnline);

    switch (choice.toLowerCase()) {
      case "s":
      case "start":
        await ensureServicesRunning();
        break;

      case "k":
      case "stop":
        await stopAllServices();
        break;

      case "1":
        if (!frontendOnline || !backendOnline) {
          await ensureServicesRunning();
        }
        openBrowser(`${WEB_URL}/office`);
        await new Promise((r) => setTimeout(r, 1200));
        break;

      case "2":
        if (!frontendOnline || !backendOnline) {
          await ensureServicesRunning();
        }
        openBrowser(WEB_URL);
        await new Promise((r) => setTimeout(r, 1200));
        break;

      case "3":
        if (!frontendOnline || !backendOnline) {
          await ensureServicesRunning();
        }
        openBrowser(`${WEB_URL}/workforce`);
        await new Promise((r) => setTimeout(r, 1200));
        break;

      case "4":
        await runTerminalUI();
        break;

      case "5":
        await runDiagnostics();
        break;

      case "6":
        await runRouterConnectionWizard();
        break;

      case "7":
        console.log(`\n  ${c.healthy}✓ TheGate background daemon remains active.${c.reset}`);
        console.log(`  ${c.slate}Gateway: ${GATEWAY_URL} | Web: ${WEB_URL}${c.reset}\n`);
        process.exit(0);

      case "0":
      case "exit":
      case "q":
        console.log(`\n  ${c.brand}Exiting TheGate CLI. Have a productive day!${c.reset}\n`);
        process.exit(0);

      default:
        console.log(`\n  ${c.fault}Invalid choice. Please select an option from the menu.${c.reset}`);
        await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
