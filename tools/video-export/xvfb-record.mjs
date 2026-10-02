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

export async function pauseAnimationsAtZero(page) {
  await page.evaluate(() => {
    for (const anim of document.getAnimations({ subtree: true })) {
      anim.pause();
      anim.currentTime = 0;
    }
  });
}

export async function waitForTop1Centered(page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".Ltop01");
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const panelW = (window.innerWidth * 9) / 16;
      const cx = rect.left + rect.width / 2;
      return rect.width > 40 && Math.abs(cx - panelW / 2) < 60;
    },
    null,
    { timeout: 15_000 }
  );
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

function runFfmpegPngFromVideo(videoPath, pngPath) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", videoPath, "-frames:v", "1", pngPath],
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

/**
 * Single tab on Xvfb, real-time playback while x11grab records 834 frames.
 */
export async function recordNorthCycleToMp4(outPath) {
  await startXvfbIfNeeded();

  const browser = await chromium.launch({
    headless: false,
    args: [
      `--app=${LIVE_NORTH_URL}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--window-position=0,0",
      "--no-first-run",
      "--disable-infobars",
      "--hide-scrollbars",
      "--disable-dev-shm-usage",
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

    await runFfmpegRecord(outPath, FRAME_COUNT + 90);

    const postCycleRefPng = path.join(path.dirname(outPath), "post-cycle-x11grab.png");
    const postRefVid = path.join(path.dirname(outPath), "post-cycle-x11grab.mp4");
    await resetCycleStart(page, false);
    await pauseAnimationsAtZero(page);
    await sleep(200);
    await runFfmpegGrabFrames(postRefVid, 1);
    runFfmpegPngFromVideo(postRefVid, postCycleRefPng);

    return {
      method: "xvfb-x11grab-realtime-single-tab-cycle-sync",
      display: DISPLAY,
      recordSeconds: RECORD_SECONDS,
      preCycleRefPng,
      postCycleRefPng,
    };
  } finally {
    await browser.close();
  }
}
