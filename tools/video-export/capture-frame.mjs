import fs from "node:fs";
import { advanceVirtualTime, attachVirtualTime } from "./capture-virtual-time.mjs";
import { FRAME_MS, LIVE_NORTH_URL, VIEWPORT } from "./timing.mjs";

export async function waitForPageReady(page) {
  await page.waitForSelector('.animation[data-ready="1"]', { timeout: 120_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  });
}

export async function resetCycleStart(page, detachLoopListener) {
  await page.evaluate((detach) => {
    if (detach) {
      const l05 = document.querySelector(".L05Ename");
      if (l05?.parentNode) {
        l05.parentNode.replaceChild(l05.cloneNode(true), l05);
      }
    }
    const nodes = document.querySelectorAll(".animation, .animation *");
    for (const el of nodes) {
      el.style.animation = "none";
      el.style.webkitAnimation = "none";
    }
    void document.body.offsetWidth;
    for (const el of nodes) {
      el.style.animation = "";
      el.style.webkitAnimation = "";
    }
    void document.body.offsetWidth;
  }, detachLoopListener);
}

export async function captureScreenshotCdp(cdp, filePath) {
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
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));
}

/**
 * Chromium couples Page.captureScreenshot to the compositor in a way that
 * desyncs CSS animation time when reused on one tab. A fresh tab per frame
 * with virtual-time advance (no screenshots until the target time) is stable.
 */
export async function captureFrameAtIndex(browser, frameIndex, outPath, options) {
  const { applyLoopSeamReset = false, readTop = false } = options;
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "zh-TW",
  });
  try {
    await page.goto(LIVE_NORTH_URL, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await waitForPageReady(page);
    await resetCycleStart(page, true);

    const cdp = await attachVirtualTime(page);
    for (let step = 0; step < frameIndex; step += 1) {
      await advanceVirtualTime(cdp, FRAME_MS);
    }
    if (applyLoopSeamReset) {
      await resetCycleStart(page, false);
    }
    let topSample = null;
    if (readTop) {
      const { readActiveTop } = await import("./capture-virtual-time.mjs");
      topSample = await readActiveTop(page);
    }
    await captureScreenshotCdp(cdp, outPath);
    return topSample;
  } finally {
    await page.close();
  }
}

export async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function runOne() {
    while (next < items.length) {
      const current = next;
      next += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runOne()
  );
  await Promise.all(runners);
  return results;
}
