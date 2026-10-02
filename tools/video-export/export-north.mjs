import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  captureFrameAtIndex,
  mapWithConcurrency,
} from "./capture-frame.mjs";
import {
  CYCLE_SECONDS,
  FRAME_COUNT,
  FPS,
  LIVE_NORTH_URL,
} from "./timing.mjs";
import {
  countSceneChanges,
  extractQaStills,
  QA_SAMPLE_TIMES,
  writeQaReport,
} from "./qa-check.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
const FRAMES_DIR = path.join(__dirname, "frames");
const EXTRA_FRAMES = 1;
const TOTAL_CAPTURE_FRAMES = FRAME_COUNT + EXTRA_FRAMES;
const CAPTURE_CONCURRENCY = Number(process.env.CAPTURE_CONCURRENCY || "4");

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

async function captureAllFrames(browser, framesDir) {
  ensureDir(framesDir);
  for (const f of fs.readdirSync(framesDir).filter((n) => n.endsWith(".png"))) {
    fs.unlinkSync(path.join(framesDir, f));
  }

  const indices = Array.from({ length: TOTAL_CAPTURE_FRAMES }, (_, i) => i);
  const qaFrameIndex = new Map(
    QA_SAMPLE_TIMES.map((t) => [Math.round(t * FPS), t])
  );
  const qaByTime = {};
  let done = 0;
  await mapWithConcurrency(indices, CAPTURE_CONCURRENCY, async (frameIndex) => {
    const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
    const topSample = await captureFrameAtIndex(
      browser,
      frameIndex,
      path.join(framesDir, name),
      {
        applyLoopSeamReset: frameIndex === FRAME_COUNT,
        readTop: qaFrameIndex.has(frameIndex),
      }
    );
    if (qaFrameIndex.has(frameIndex)) {
      qaByTime[String(qaFrameIndex.get(frameIndex))] = topSample;
    }
    done += 1;
    if (done % 30 === 0 || done === TOTAL_CAPTURE_FRAMES) {
      console.log(`Captured ${done}/${TOTAL_CAPTURE_FRAMES}`);
    }
  });
  return qaByTime;
}

function encodeVideo(framesDir, outPath, crf) {
  run("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "frame_%05d.png"),
    "-frames:v",
    String(FRAME_COUNT),
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
    args: [
      "--font-render-hinting=none",
      "--disable-background-timer-throttling",
    ],
  });

  try {
    const qaDuringCapture = await captureAllFrames(browser, FRAMES_DIR);

    const seam = loopSeamMetric(FRAMES_DIR);
    console.log("Loop seam SSIM:", seam.ssim);

    const crfUsed = encodeWithSizeCap(FRAMES_DIR, mp4Path);
    extractQaStills(mp4Path, ARTIFACTS);
    const scenes = countSceneChanges(mp4Path);

    const qaReport = {
      samplesDuringCapture: qaDuringCapture,
      sceneChangesAbove002: scenes.count,
      topBoundaryHits: scenes.topBoundaryHits,
      expectedTops: { "2": 1, "8": 2, "13.5": 3, "19": 4, "24.5": 5 },
    };
    writeQaReport(ARTIFACTS, qaReport);
    console.log("QA samples:", JSON.stringify(qaDuringCapture, null, 2));
    console.log("Scene changes (gt 0.02):", scenes.count);

    writeFfprobe(mp4Path, ARTIFACTS, {
      sourceUrl: LIVE_NORTH_URL,
      cycleSeconds: CYCLE_SECONDS,
      fps: FPS,
      frameCount: FRAME_COUNT,
      crf: crfUsed,
      loopSeamSsim: seam.ssim,
      captureMethod:
        "Per-frame fresh tab + CDP virtual-time advance (avoids screenshot/virtual-time desync on a single tab)",
      captureConcurrency: CAPTURE_CONCURRENCY,
      cycleDerivation:
        "5×5.5s TOP slots; L05Ename fadeOut ends 27.3s; script.js setTimeout(500) → 27.8s",
      qa: qaReport,
    });

    const topsOk = QA_SAMPLE_TIMES.every((t) => {
      const expected = qaReport.expectedTops[String(t)];
      const got = qaDuringCapture[String(t)]?.top;
      return got === expected;
    });
    if (!topsOk || scenes.count < 5 || scenes.topBoundaryHits < 4) {
      console.error("QA failed");
      process.exit(1);
    }

    console.log(`Done: ${mp4Path}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
