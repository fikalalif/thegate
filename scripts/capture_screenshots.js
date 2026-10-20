const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const http = require("http");

const SCREENSHOT_DIR = path.join(__dirname, "..", "docs", "screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ password: "12345678" });
    const req = http.request(
      "http://127.0.0.1:8001/api/v1/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve(data.token);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

const PAGES = [
  { name: "01_dashboard_overview.png", url: "http://localhost:3000" },
  { name: "02_pixel_office_simulation.png", url: "http://localhost:3000/office" },
  { name: "03_cost_optimization.png", url: "http://localhost:3000/optimization" },
  { name: "04_ai_workforce.png", url: "http://localhost:3000/workforce" },
  { name: "05_policies_routing.png", url: "http://localhost:3000/policies" },
];

async function main() {
  console.log("🔐 Authenticating with backend...");
  const token = await getAuthToken();
  console.log("✓ Obtained token:", token ? "OK" : "NONE");

  console.log("🚀 Launching Google Chrome...");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  // Navigate to root first to establish domain context, then set token
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
  await page.evaluate((authToken) => {
    localStorage.setItem("thegate_auth_token", authToken);
  }, token);

  for (const p of PAGES) {
    console.log(`📸 Capturing ${p.url} -> ${p.name}...`);
    await page.goto(p.url, { waitUntil: "networkidle2" });
    // Allow canvas/charts/animations to render
    await new Promise((r) => setTimeout(r, 2000));
    const dest = path.join(SCREENSHOT_DIR, p.name);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`  ✓ Saved: ${dest}`);
  }

  await browser.close();
  console.log("✨ All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
