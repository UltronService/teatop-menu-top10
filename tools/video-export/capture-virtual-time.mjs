/**
 * CDP virtual-time frame advance (CSS animations + JS timers run together).
 */
import { FRAME_MS } from "./timing.mjs";

export async function attachVirtualTime(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setVirtualTimePolicy", {
    policy: "pause",
    initialVirtualTime: 0,
  });
  return cdp;
}

export async function advanceVirtualTime(cdp, budgetMs) {
  const result = await cdp.send("Emulation.setVirtualTimePolicy", {
    policy: "advance",
    budget: budgetMs,
  });
  return result;
}

export async function readActiveTop(page) {
  return page.evaluate(() => {
    const panelW = (window.innerWidth * 9) / 16;
    const targetCx = panelW / 2;
    let bestTop = null;
    let bestDist = Number.POSITIVE_INFINITY;
    let bestLabel = null;

    for (let i = 1; i <= 5; i += 1) {
      const nn = String(i).padStart(2, "0");
      const el = document.querySelector(`.Ltop${nn}`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 20) continue;
      if (rect.left < -100 || rect.left > panelW) continue;
      const cx = rect.left + rect.width / 2;
      const dist = Math.abs(cx - targetCx);
      if (dist < bestDist) {
        bestDist = dist;
        bestTop = i;
        bestLabel = el.textContent?.trim() || null;
      }
    }

    return { top: bestTop, label: bestLabel };
  });
}

export async function captureWithVirtualTime(page, framesDir, options) {
  const {
    totalFrames,
    onFrame,
    beforeFirstFrame,
    afterCycleFrame,
  } = options;

  const cdp = await attachVirtualTime(page);
  if (beforeFirstFrame) await beforeFirstFrame(page);

  for (let i = 0; i < totalFrames; i += 1) {
    if (i > 0) {
      await advanceVirtualTime(cdp, FRAME_MS);
    }
    if (afterCycleFrame && i === totalFrames - 1) {
      await afterCycleFrame(page, cdp);
    }
    if (onFrame) await onFrame(page, i);
  }

  return cdp;
}
