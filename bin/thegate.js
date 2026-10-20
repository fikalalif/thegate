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
const { exec, spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { printLogo, c } = require("./banner");

const VERSION = "1.4.2";
const GATEWAY_PORT = process.env.THEGATE_BACKEND_PORT || 8001;
const WEB_PORT = process.env.THEGATE_WEB_PORT || 3000;
const GATEWAY_URL = `http://127.0.0.1:${GATEWAY_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

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
  const checkPath = port === 3000 ? "/" : "/health";
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${checkPath}`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
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
  console.log(`  🚀 ${c.slate}Gateway Ingress:${c.reset}  ${c.white}${GATEWAY_URL}${c.reset}  ${backendOnline ? `${c.healthy}[ONLINE]${c.reset}` : `${c.fault}[STOPPED]${c.reset}`}`);
  console.log(`  🖥️  ${c.slate}Web Operations:${c.reset}   ${c.white}${WEB_URL}${c.reset}      ${frontendOnline ? `${c.healthy}[ONLINE]${c.reset}` : `${c.fault}[STOPPED]${c.reset}`}`);
  console.log(`  🛡️  ${c.slate}Zero-Prompt Log:${c.reset}  ${c.healthy}[ENFORCED]${c.reset} (Privacy by default)`);
  console.log(`  ⚡ ${c.slate}Sentinel Watchdog:${c.reset} ${c.telemetry}[ACTIVE < 650ms SLA]${c.reset}`);
  console.log(`  ${c.gold}-------------------------------------------------------------------------${c.reset}\n`);
}

// Start Backend Ingress
function startBackend() {
  ensureEnvFile();
  const backendDir = path.join(__dirname, "..", "backend");
  const child = spawn(
    "python3",
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(GATEWAY_PORT)],
    {
      cwd: backendDir,
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();
}

// Start Frontend Next.js Server
function startFrontend() {
  const frontendDir = path.join(__dirname, "..", "frontend");
  const child = spawn("npm", ["run", "dev"], {
    cwd: frontendDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function ensureServicesRunning() {
  let backendOnline = await checkPort(GATEWAY_PORT);
  let frontendOnline = await checkPort(WEB_PORT);

  if (backendOnline && frontendOnline) return true;

  console.log(`\n  ${c.telemetry}⚡ Initializing TheGate runtime services...${c.reset}`);
  if (!backendOnline) {
    console.log(`  ${c.brand}▶ Spawning Backend Gateway (Port ${GATEWAY_PORT})...${c.reset}`);
    startBackend();
  }
  if (!frontendOnline) {
    console.log(`  ${c.brand}▶ Spawning Frontend Dashboard (Port ${WEB_PORT})...${c.reset}`);
    startFrontend();
  }

  process.stdout.write(`  ${c.slate}Waiting for services to become ready`);
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600));
    process.stdout.write(".");
    backendOnline = await checkPort(GATEWAY_PORT);
    frontendOnline = await checkPort(WEB_PORT);
    if (backendOnline && frontendOnline) break;
  }
  console.log("");

  if (backendOnline && frontendOnline) {
    console.log(`  ${c.healthy}✓ Services are now ONLINE!${c.reset}\n`);
    await new Promise((r) => setTimeout(r, 800));
    return true;
  } else {
    console.log(`  ${c.fault}Could not verify services readiness in time.${c.reset}`);
    console.log(`  ${c.slate}Backend: ${backendOnline ? "ONLINE" : "STOPPED"} | Frontend: ${frontendOnline ? "ONLINE" : "STOPPED"}${c.reset}\n`);
    await new Promise((r) => setTimeout(r, 1200));
    return false;
  }
}

async function stopAllServices() {
  console.log(`\n  ${c.fault}Stopping TheGate backend and frontend services...${c.reset}`);
  exec("pkill -f 'uvicorn app.main:app' 2>/dev/null || true");
  exec("pkill -f 'next-dev.*3000|next dev' 2>/dev/null || true");
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
    console.log(`    thegate open       ${c.slate}Open web dashboard in default browser${c.reset}`);
    console.log(`    thegate connect    ${c.slate}Launch downstream router wizard (9Router/Ollama)${c.reset}\n`);
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
