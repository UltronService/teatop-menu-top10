import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  FRAME_COUNT,
  FPS,
  LIVE_NORTH_URL,
  VIEWPORT,
} from "./timing.mjs";

const DISPLAY = ":99";
const RECORD_SECONDS = FRAME_COUNT / FPS;
const PROFILE_DIR = "/tmp/teatop-kiosk-profile";
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function startXvfbIfNeeded() {
  const lock = `/tmp/.X99-lock`;
  if (!fs.existsSync(lock)) {
    const proc = spawn(
      "Xvfb",
      [":99", "-screen", "0", `${VIEWPORT.width}x${VIEWPORT.height}x24`, "-ac"],
      { stdio: "ignore", detached: true }
    );
    proc.unref();
    await sleep(500);
  }
  process.env.DISPLAY = DISPLAY;
  await startOpenboxIfNeeded();
}

async function startOpenboxIfNeeded() {
  const listed = spawnSync("pgrep", ["-x", "openbox"], { encoding: "utf8" });
  if (listed.stdout.trim()) return;
  const proc = spawn("openbox", [], {
    env: { ...process.env, DISPLAY },
    stdio: "ignore",
    detached: true,
  });
  proc.unref();
  await sleep(400);
}

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

export async function readViewportMetrics(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  }));
}

export async function assertFullscreenViewport(page) {
  await page.waitForFunction(
    () =>
      window.innerWidth === 1920 &&
      window.innerHeight === 1080 &&
      window.devicePixelRatio === 1,
    null,
    { timeout: 30_000 }
  );
}

export async function pauseAnimationsAtZero(page) {
  await page.evaluate(() => {
    for (const anim of document.getAnimations({ subtree: true })) {
      anim.pause();
      anim.currentTime = 0;
    }
  });
}

function kickAnimations(page) {
  return page.evaluate(() => {
    for (const anim of document.getAnimations({ subtree: true })) {
      anim.play();
    }
  });
}

export async function installCycleResetCounter(page) {
  await page.evaluate(() => {
    window.__northCycleResets = 0;
    const el = document.querySelector(".L05Ename");
    if (!el) return;
    const kick = () => {
      for (const anim of document.getAnimations({ subtree: true })) {
        anim.play();
      }
    };
    el.addEventListener("animationend", (event) => {
      if (event.animationName !== "fadeOut") return;
      setTimeout(() => {
        window.__northCycleResets += 1;
        kick();
      }, 500);
    });
  });
}

export async function waitForCycleResets(page, count) {
  await page.waitForFunction(
    (target) => (window.__northCycleResets ?? 0) >= target,
    count,
    { timeout: 120_000 }
  );
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

function tryWmFullscreen() {
  spawnSync("wmctrl", ["-r", ":ACTIVE:", "-b", "add,fullscreen"], {
    encoding: "utf8",
  });
}

function runFfmpegPngFromVideo(videoPath, pngPath) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", videoPath, "-frames:v", "1", "-update", "1", pngPath],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg png extract failed: ${r.stderr}`);
  }
}

function runFfmpegGrabFrames(outPath, frameCount) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-f",
      "x11grab",
      "-draw_mouse",
      "0",
      "-framerate",
      String(FPS),
      "-video_size",
      `${VIEWPORT.width}x${VIEWPORT.height}`,
      "-i",
      `${DISPLAY}.0+0,0`,
      "-frames:v",
      String(frameCount),
      "-pix_fmt",
      "yuv420p",
      outPath,
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += String(d);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`ffmpeg grab failed (${code}): ${err.slice(-800)}`));
    });
  });
}

function runFfmpegRecord(outPath, frameCount) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-f",
      "x11grab",
      "-draw_mouse",
      "0",
      "-framerate",
      String(FPS),
      "-video_size",
      `${VIEWPORT.width}x${VIEWPORT.height}`,
      "-i",
      `${DISPLAY}.0+0,0`,
      "-frames:v",
      String(frameCount),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "17",
      "-preset",
      "slow",
      "-movflags",
      "+faststart",
      outPath,
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += String(d);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`ffmpeg x11grab failed (${code}): ${err.slice(-800)}`));
    });
  });
}

async function setWindowFullscreen(page) {
  const client = await page.context().newCDPSession(page);
  const { windowId } = await client.send("Browser.getWindowForTarget");
  await client.send("Browser.setWindowBounds", {
    windowId,
    bounds: { windowState: "fullscreen" },
  });
}

async function launchAppContext() {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      `--app=${LIVE_NORTH_URL}`,
      "--kiosk",
      "--start-fullscreen",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--window-position=0,0",
      "--force-device-scale-factor=1",
      "--no-first-run",
      "--disable-infobars",
      "--hide-scrollbars",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-session-crashed-bubble",
      "--disable-features=TranslateUI",
    ],
  });
}

/**
 * Single tab on Xvfb kiosk, real-time playback while x11grab records.
 */
export async function recordNorthCycleToMp4(outPath) {
  await startXvfbIfNeeded();

  const context = await launchAppContext();

  try {
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
      await page.goto(LIVE_NORTH_URL, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
    } else if (!page.url().includes("regions/north")) {
      await page.goto(LIVE_NORTH_URL, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
    }
    await waitForPageReady(page);
    await setWindowFullscreen(page);
    tryWmFullscreen();
    await sleep(400);
    await assertFullscreenViewport(page);

    const viewportMetrics = await readViewportMetrics(page);

    await page.evaluate(() => {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.margin = "0";
      document.body.style.cursor = "none";
    });

    await resetCycleStart(page, true);
    await pauseAnimationsAtZero(page);
    const preCycleRefPng = path.join(path.dirname(outPath), "pre-cycle-x11grab.png");
    const preRefVid = path.join(path.dirname(outPath), "pre-cycle-x11grab.mp4");
    await runFfmpegGrabFrames(preRefVid, 1);
    runFfmpegPngFromVideo(preRefVid, preCycleRefPng);

    await installCycleResetCounter(page);
    await page.evaluate(() => {
      for (const anim of document.getAnimations({ subtree: true })) {
        anim.play();
      }
    });
    await waitForCycleResets(page, 1);
    await kickAnimations(page);
    await sleep(80);

    const layoutRefScreenshot = path.join(
      path.dirname(outPath),
      "kiosk-layout-ref-2.5s.png"
    );
    const recordPromise = runFfmpegRecord(outPath, FRAME_COUNT + 90);
    await sleep(2500);
    await page.screenshot({ path: layoutRefScreenshot, fullPage: false });
    await recordPromise;

    const postCycleRefPng = path.join(path.dirname(outPath), "post-cycle-x11grab.png");
    const postRefVid = path.join(path.dirname(outPath), "post-cycle-x11grab.mp4");
    await resetCycleStart(page, false);
    await pauseAnimationsAtZero(page);
    await sleep(200);
    await runFfmpegGrabFrames(postRefVid, 1);
    runFfmpegPngFromVideo(postRefVid, postCycleRefPng);

    return {
      method: "xvfb-kiosk-x11grab-cycle-sync",
      display: DISPLAY,
      recordSeconds: RECORD_SECONDS,
      viewportMetrics,
      layoutRefScreenshot,
      preCycleRefPng,
      postCycleRefPng,
    };
  } finally {
    await context.close();
  }
}
