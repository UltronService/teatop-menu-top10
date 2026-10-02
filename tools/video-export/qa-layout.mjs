import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { LIVE_NORTH_URL, VIEWPORT } from "./timing.mjs";
import {
  extractStillAtTime,
  ssimBetweenPngs,
} from "./qa-analyze.mjs";
import {
  pauseAnimationsAtZero,
  resetCycleStart,
  waitForPageReady,
} from "./xvfb-record.mjs";

const RIGHT_PANEL_CROP = "crop=820:1080:1100:0";
const RIGHT_EDGE_CROP = "crop=20:1080:1900:0";
const TOP_CHROME_CROP = "crop=1920:80:0:0";

function runFfmpeg(args) {
  const r = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(String(r.stderr).slice(-400));
  }
  return r;
}

function cropToPng(inputPath, cropFilter, outPng) {
  runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vf",
    cropFilter,
    "-frames:v",
    "1",
    "-update",
    "1",
    outPng,
  ]);
}

function meanLumaFromPng(pngPath) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-i",
      pngPath,
      "-vf",
      "format=gray,scale=1:1",
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-",
    ],
    { encoding: "buffer" }
  );
  if (!r.stdout?.length) return 0;
  return r.stdout[0];
}

function topBandSignalStats(pngPath) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      pngPath,
      "-vf",
      `${TOP_CHROME_CROP},format=gray,signalstats`,
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  const text = `${r.stdout}\n${r.stderr}`;
  const yavg = Number(text.match(/YAVG:([\d.]+)/)?.[1] ?? 0);
  const ydif = Number(text.match(/YDIF:([\d.]+)/)?.[1] ?? 99);
  return { yavg, ydif };
}

export function expectedViewportMetrics() {
  return {
    innerWidth: VIEWPORT.width,
    innerHeight: VIEWPORT.height,
    devicePixelRatio: 1,
  };
}

export function checkViewportMetrics(metrics) {
  const expected = expectedViewportMetrics();
  const ok =
    metrics?.innerWidth === expected.innerWidth &&
    metrics?.innerHeight === expected.innerHeight &&
    metrics?.devicePixelRatio === expected.devicePixelRatio;
  return { expected, actual: metrics, ok };
}

/** Headless 1920×1080 fallback reference. */
export async function captureLiveLayoutReference(outPng) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    await page.goto(LIVE_NORTH_URL, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await waitForPageReady(page);
    await resetCycleStart(page, true);
    await pauseAnimationsAtZero(page);
    await page.screenshot({ path: outPng, fullPage: false });
  } finally {
    await browser.close();
  }
}

function topBandLooksLikeBrowserChrome(pngPath) {
  const { yavg, ydif } = topBandSignalStats(pngPath);
  return yavg >= 228 && yavg <= 248 && ydif < 9;
}

function rightPanelSsimBlurred(aPng, bPng, tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const a = path.join(tmpDir, "ssim-a-blur.png");
  const b = path.join(tmpDir, "ssim-b-blur.png");
  cropToPng(aPng, RIGHT_PANEL_CROP, a);
  cropToPng(bPng, RIGHT_PANEL_CROP, b);
  const r = spawnSync(
    "ffmpeg",
    [
      "-i",
      a,
      "-i",
      b,
      "-lavfi",
      "[0:v]gblur=sigma=2[ga];[1:v]gblur=sigma=2[gb];[ga][gb]ssim",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  const m = `${r.stdout}\n${r.stderr}`.match(/All:([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

function analyzePerSecondFrame(framePng) {
  const tmpDir = "/tmp/teatop-layout-frame";
  fs.mkdirSync(tmpDir, { recursive: true });
  const rightEdgePng = path.join(tmpDir, "right-edge.png");
  cropToPng(framePng, RIGHT_EDGE_CROP, rightEdgePng);
  const rightEdgeMean = meanLumaFromPng(rightEdgePng);
  const topStats = topBandSignalStats(framePng);
  const rightEdgeNotBlack = rightEdgeMean >= 28;
  const topNotBrowserChrome = !topBandLooksLikeBrowserChrome(framePng);
  return {
    rightEdgeMean,
    topBandMean: topStats.yavg,
    topBandYdif: topStats.ydif,
    rightEdgeNotBlack,
    topNotBrowserChrome,
    ok: rightEdgeNotBlack && topNotBrowserChrome,
  };
}

export function analyzeVideoLayout(mp4Path, refFullPng, tmpDir, durationSec = 28) {
  fs.mkdirSync(tmpDir, { recursive: true });

  const perSecond = [];
  for (let t = 0; t < durationSec; t += 1) {
    const framePng = path.join(tmpDir, `layout-t${t}s.png`);
    extractStillAtTime(mp4Path, t, framePng);
    perSecond.push({ second: t, ...analyzePerSecondFrame(framePng) });
  }

  const structureTimes = [2.5];
  const structureChecks = structureTimes.map((t) => {
    const framePng = path.join(tmpDir, `structure-${t}s.png`);
    extractStillAtTime(mp4Path, t, framePng);
    const rightPanelSsim = rightPanelSsimBlurred(
      refFullPng,
      framePng,
      path.join(tmpDir, `blur-${t}`)
    );
    return {
      timeSec: t,
      rightPanelSsim,
      ok: rightPanelSsim >= 0.95,
    };
  });

  const perSecondOk = perSecond.every((s) => s.ok);
  const structureOk = structureChecks.every((s) => s.ok);
  const worstRightEdge = Math.min(...perSecond.map((s) => s.rightEdgeMean));
  const worstRightPanelSsim = Math.min(
    ...structureChecks.map((s) => s.rightPanelSsim)
  );

  return {
    perSecond,
    structureChecks,
    worstRightEdgeMean: worstRightEdge,
    worstRightPanelSsim,
    ok: perSecondOk && structureOk,
  };
}
