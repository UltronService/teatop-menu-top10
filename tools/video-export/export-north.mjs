import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  CYCLE_SECONDS,
  FRAME_COUNT,
  FRAME_MS,
  FPS,
  LIVE_NORTH_URL,
  VIEWPORT,
} from "./timing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS =
  process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
const FRAMES_DIR = path.join(__dirname, "frames");
const EXTRA_FRAMES = 1;
const TOTAL_CAPTURE_FRAMES = FRAME_COUNT + EXTRA_FRAMES;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed: ${r.stderr || r.stdout || r.status}`
    );
  }
  return r.stdout;
}

async function waitForPageReady(page) {
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

async function resetCycleStart(page) {
  await page.evaluate(() => {
    const l05 = document.querySelector(".L05Ename");
    if (l05) {
      const clone = l05.cloneNode(true);
      l05.parentNode?.replaceChild(clone, l05);
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
  });
}

async function seekAnimations(page, globalMs) {
  await page.evaluate((ms) => {
    const anims = document.getAnimations({ subtree: true });
    for (const anim of anims) {
      const effect = anim.effect;
      if (!effect || typeof effect.getComputedTiming !== "function") continue;
      const timing = effect.getComputedTiming();
      const delay = Number(timing.delay) || 0;
      const duration = Number(timing.duration) || 0;
      const iterations = timing.iterations;

      anim.pause();

      if (ms < delay) {
        anim.currentTime = 0;
        continue;
      }

      const elapsed = ms - delay;
      if (iterations === Infinity) {
        anim.currentTime = duration > 0 ? elapsed % duration : elapsed;
      } else {
        const active = Number(timing.activeDuration) || duration;
        anim.currentTime = Math.min(elapsed, active);
      }
    }
  }, globalMs);
}

async function captureFrames(page, framesDir) {
  ensureDir(framesDir);
  const existing = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
  for (const f of existing) fs.unlinkSync(path.join(framesDir, f));

  for (let i = 0; i < TOTAL_CAPTURE_FRAMES; i++) {
    if (i === FRAME_COUNT) {
      await resetCycleStart(page);
      await seekAnimations(page, 0);
    } else {
      const globalMs = i * FRAME_MS;
      await seekAnimations(page, globalMs);
    }
    const name = `frame_${String(i).padStart(5, "0")}.png`;
    await page.screenshot({
      path: path.join(framesDir, name),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      animations: "allow",
    });
    if (i % 60 === 0) {
      console.log(`Captured frame ${i}/${TOTAL_CAPTURE_FRAMES - 1}`);
    }
  }
}

function encodeVideo(framesDir, outPath, crf) {
  const inputPattern = path.join(framesDir, "frame_%05d.png");
  const limitedFrames = FRAME_COUNT;
  run("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    inputPattern,
    "-frames:v",
    String(limitedFrames),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    String(crf),
    "-preset",
    "slow",
    "-movflags",
    "+faststart",
    outPath,
  ]);
}

function fileSizeMb(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
}

function encodeWithSizeCap(framesDir, outPath) {
  let crf = 17;
  encodeVideo(framesDir, outPath, crf);
  while (fileSizeMb(outPath) > 45 && crf < 28) {
    crf += 1;
    console.log(`MP4 > 45MB, re-encoding with CRF ${crf}`);
    encodeVideo(framesDir, outPath, crf);
  }
  return crf;
}

function extractStills(mp4Path, artifactsDir) {
  const times = [0, 2.75, 8.25, 13.75, 19.25, 25];
  const labels = ["00", "01", "02", "03", "04", "05"];
  times.forEach((t, idx) => {
    const out = path.join(artifactsDir, `north-frame-${labels[idx]}.png`);
    run("ffmpeg", [
      "-y",
      "-ss",
      String(t),
      "-i",
      mp4Path,
      "-frames:v",
      "1",
      out,
    ]);
  });
}

function loopSeamMetric(framesDir) {
  const f0 = path.join(framesDir, "frame_00000.png");
  const fCycle = path.join(
    framesDir,
    `frame_${String(FRAME_COUNT).padStart(5, "0")}.png`
  );
  const r = spawnSync(
    "ffmpeg",
    ["-i", f0, "-i", fCycle, "-lavfi", "ssim", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const combined = `${r.stdout}\n${r.stderr}`;
  const m = combined.match(/All:([\d.]+)/);
  return { raw: combined.trim(), ssim: m ? Number(m[1]) : null };
}

function writeFfprobe(mp4Path, artifactsDir, extra) {
  const probe = run("ffprobe", [
    "-hide_banner",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    mp4Path,
  ]);
  const human = run("ffprobe", ["-hide_banner", mp4Path]);
  const text = `${human}\n\n--- JSON ---\n${probe}\n\n--- export meta ---\n${JSON.stringify(extra, null, 2)}\n`;
  fs.writeFileSync(path.join(artifactsDir, "ffprobe.txt"), text);
}

async function main() {
  ensureDir(ARTIFACTS);
  const mp4Path = path.join(ARTIFACTS, "teatop-north-top10-1080p.mp4");

  const browser = await chromium.launch({
    headless: true,
    args: ["--font-render-hinting=none"],
  });

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      locale: "zh-TW",
      colorScheme: "light",
    });
    await context.addInitScript(() => {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.margin = "0";
      document.body.style.cursor = "none";
    });

    const page = await context.newPage();
    await page.goto(LIVE_NORTH_URL, { waitUntil: "networkidle", timeout: 120_000 });
    await waitForPageReady(page);
    await resetCycleStart(page);

    await captureFrames(page, FRAMES_DIR);

    const seam = loopSeamMetric(FRAMES_DIR);
    console.log("Loop seam SSIM:", seam.ssim, seam.raw.split("\n").slice(-3).join("\n"));

    const crfUsed = encodeWithSizeCap(FRAMES_DIR, mp4Path);
    extractStills(mp4Path, ARTIFACTS);

    writeFfprobe(mp4Path, ARTIFACTS, {
      sourceUrl: LIVE_NORTH_URL,
      cycleSeconds: CYCLE_SECONDS,
      fps: FPS,
      frameCount: FRAME_COUNT,
      crf: crfUsed,
      loopSeamSsim: seam.ssim,
      cycleDerivation:
        "5×5.5s TOP slots; L05Ename fadeOut ends 27.3s; script.js setTimeout(500) → 27.8s",
    });

    console.log(`Done: ${mp4Path}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
