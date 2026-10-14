import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const require = createRequire(import.meta.url);
const iconMode = require("../js/name-suffix-icon-mode.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGIONS = [
  "central",
  "central-smart",
  "mrt-tamsui",
  "north",
  "north-smart",
  "south",
  "ximen",
];

const STYLE = readFileSync(path.join(ROOT, "css/style.css"), "utf8");

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
        if (!filePath.startsWith(ROOT)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        let data;
        try {
          data = readFileSync(filePath);
        } catch {
          const indexPath = path.join(filePath, "index.html");
          filePath = indexPath;
          data = readFileSync(indexPath);
        }
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

async function pseudoAfterMetrics(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) {
      return null;
    }
    const style = getComputedStyle(el, "::after");
    return {
      content: style.content,
      display: style.display,
      width: style.width,
      marginLeft: style.marginLeft,
      backgroundImage: style.backgroundImage,
    };
  }, selector);
}

async function cnameRect(page, selector) {
  return page.locator(selector).boundingBox();
}

test("1) default (?icon absent): seven regions hide RCname ::after icons", async () => {
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch();
  try {
    for (const region of REGIONS) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await page.goto(`${baseUrl}/regions/${region}/`, { waitUntil: "networkidle" });
      await page.waitForSelector(".animation[data-ready='1']");
      const animClass = await page.locator(".animation").getAttribute("class");
      assert.match(animClass || "", /rcname-suffix-icons-off/);
      assert.doesNotMatch(animClass || "", /rcname-suffix-icons-on/);
      const metrics = await pseudoAfterMetrics(page, ".R03Cname");
      assert.ok(metrics);
      assert.equal(metrics.content, "none");
      assert.equal(metrics.width, "0px");
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});

test("2) icon CSS rules and imgur assets remain in style.css", () => {
  assert.match(STYLE, /\.R03Cname::after/);
  assert.match(STYLE, /i\.imgur\.com\/jefyVWB\.png/);
  assert.match(STYLE, /\.animation\.rcname-suffix-icons-off \.RCname::after/);
});

test("3) hub index.html is unchanged for icon mode (no player inject class)", async () => {
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    const html = await page.content();
    assert.doesNotMatch(html, /rcname-suffix-icons-off/);
    assert.doesNotMatch(html, /name-suffix-icon-mode\.js/);
  } finally {
    await browser.close();
    server.close();
  }
});

test("4) ?icon=off: seven regions hide RCname ::after icons", async () => {
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch();
  try {
    for (const region of REGIONS) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await page.goto(`${baseUrl}/regions/${region}/?icon=off`, { waitUntil: "networkidle" });
      await page.waitForSelector(".animation[data-ready='1']");
      const animClass = await page.locator(".animation").getAttribute("class");
      assert.match(animClass || "", /rcname-suffix-icons-off/);
      assert.doesNotMatch(animClass || "", /rcname-suffix-icons-on/);
      const metrics = await pseudoAfterMetrics(page, ".R03Cname");
      assert.ok(metrics);
      assert.equal(metrics.content, "none");
      assert.equal(metrics.width, "0px");
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});

test("5) ?icon=on shows suffix icons on RCname", async () => {
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${baseUrl}/regions/north/?icon=on`, { waitUntil: "networkidle" });
    await page.waitForSelector(".animation[data-ready='1']");
    const animClass = await page.locator(".animation").getAttribute("class");
    assert.match(animClass || "", /rcname-suffix-icons-on/);
    const metrics = await pseudoAfterMetrics(page, ".R03Cname");
    assert.ok(metrics);
    assert.notEqual(metrics.content, "none");
    assert.notEqual(metrics.backgroundImage, "none");
  } finally {
    await browser.close();
    server.close();
  }
});

test("6) query parser: default/off hide, only icon=on shows", () => {
  assert.equal(iconMode.shouldShowRcnameSuffixIcons(""), false);
  assert.equal(iconMode.shouldShowRcnameSuffixIcons("?icon=off"), false);
  assert.equal(iconMode.shouldShowRcnameSuffixIcons("?icon=on"), true);
  assert.equal(iconMode.shouldShowRcnameSuffixIcons("?icon=invalid"), false);
});

test("7) hidden mode: no layout shift vs icon=on (7 regions, tolerance 0)", async () => {
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch();
  const fixtureDir = path.join(ROOT, "tests/fixtures/hide-icons-r-off");
  try {
    for (const region of REGIONS) {
      const offPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await offPage.goto(`${baseUrl}/regions/${region}/`, { waitUntil: "networkidle" });
      await offPage.waitForSelector(".animation[data-ready='1']");
      await offPage.evaluate(() => {
        document.querySelectorAll(".animation, .animation *").forEach((el) => {
          el.style.animation = "none";
        });
      });
      for (let rank = 1; rank <= 10; rank++) {
        const nn = String(rank).padStart(2, "0");
        const sel = `.R${nn}Cname`;
        const hasIconRule = await offPage.evaluate((n) => {
          return Boolean(document.querySelector(".R" + n + "Cname"));
        }, nn);
        if (!hasIconRule) {
          continue;
        }
        const offAfter = await pseudoAfterMetrics(offPage, sel);
        assert.equal(offAfter.width, "0px", `${region} ${sel} ::after width`);
        assert.equal(offAfter.marginLeft, "0px", `${region} ${sel} ::after margin`);
      }
      const shotPath = path.join(fixtureDir, `${region}.png`);
      const shotBuf = await offPage.locator(".R").screenshot();
      const current = PNG.sync.read(shotBuf);
      if (!existsSync(shotPath)) {
        mkdirSync(fixtureDir, { recursive: true });
        writeFileSync(shotPath, PNG.sync.write(current));
      }
      assert.ok(existsSync(shotPath), `missing baseline ${shotPath}`);
      const baseline = PNG.sync.read(readFileSync(shotPath));
      assert.equal(current.width, baseline.width);
      assert.equal(current.height, baseline.height);
      const diffPixels = pixelmatch(
        current.data,
        baseline.data,
        null,
        current.width,
        current.height,
        { threshold: 0 }
      );
      assert.equal(diffPixels, 0, `${region} R panel pixel diff`);
      await offPage.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
