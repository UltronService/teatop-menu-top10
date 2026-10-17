import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  resetCycleStart,
  startXvfbIfNeeded,
  waitForPageReady,
  waitForTop1Centered,
} from "./xvfb-record.mjs";
import { LIVE_NORTH_URL, VIEWPORT } from "./timing.mjs";

export async function captureCycleStartReferencePng(outPath) {
  await startXvfbIfNeeded();
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--app=${LIVE_NORTH_URL}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--window-position=0,0",
      "--no-first-run",
      "--hide-scrollbars",
      "--no-sandbox",
    ],
  });

  try {
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages()[0] ?? await context.newPage();
    if (!page.url().includes("regions/north")) {
      await page.goto(LIVE_NORTH_URL, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
    }
    await waitForPageReady(page);
    await resetCycleStart(page, true);
    await waitForTop1Centered(page);
    await page.waitForTimeout(80);
    const cdp = await context.newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        scale: 1,
      },
    });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(data, "base64"));
  } finally {
    await browser.close();
  }
}
