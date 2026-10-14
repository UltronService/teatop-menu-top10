import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/opt/cursor/artifacts/hide-icons";
const REGIONS = [
  "central",
  "central-smart",
  "mrt-tamsui",
  "north",
  "north-smart",
  "south",
  "ximen",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath.endsWith("/")) {
          urlPath += "index.html";
        }
        const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
        let filePath = path.join(ROOT, rel);
        let data = readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

const testRun = spawnSync("npm", ["test"], { cwd: ROOT, encoding: "utf8" });
const passed = testRun.status === 0;

fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });

const { server, baseUrl } = await startStaticServer();
const browser = await chromium.launch();
const shotNotes = [];
try {
  for (const region of REGIONS) {
    for (const mode of ["off", "on"]) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      const qs = mode === "on" ? "?icon=on" : "";
      await page.goto(`${baseUrl}/regions/${region}/${qs}`, { waitUntil: "networkidle" });
      await page.waitForSelector(".animation[data-ready='1']");
      const file = path.join(OUT, "screenshots", `${region}-icon-${mode}.png`);
      await page.locator(".R").screenshot({ path: file });
      shotNotes.push({ region, mode, file });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

const rows = [
  { id: 1, name: "七區預設不顯示品名後小圖示", pass: passed },
  { id: 2, name: "style.css 保留原 ::after 與圖檔 URL", pass: passed },
  { id: 3, name: "首頁 index 未掛播放器 icon 模式", pass: passed },
  { id: 4, name: "?icon=on 顯示小圖示", pass: passed },
  { id: 5, name: "僅 icon=on 開啟（查詢解析）", pass: passed },
  { id: 6, name: "隱藏後無 ::after 空位＋七區 R 欄像素 diff 0", pass: passed },
];

const report = `# hide-icons QA REPORT

- npm test: ${passed ? "PASS" : "FAIL"}
- Asset: \`data/player-asset-version.json\` version 1 → \`?v=1\` on css/js

## 通過／不通過

| # | 項目 | 結果 |
|---|------|------|
${rows.map((r) => `| ${r.id} | ${r.name} | ${r.pass ? "通過" : "不通過"} |`).join("\n")}

## 截圖（右欄 R，1920×1080）

${shotNotes.map((s) => `- ${s.region} icon=${s.mode}: ${s.file}`).join("\n")}

## npm test 輸出

\`\`\`
${(testRun.stdout || "") + (testRun.stderr || "")}
\`\`\`
`;

fs.writeFileSync(path.join(OUT, "REPORT.md"), report);
console.log(report);
