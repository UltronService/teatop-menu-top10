import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildContactSheet,
  fullQaReport,
  QA_SAMPLE_TIMES,
} from "./qa-analyze.mjs";
import {
  CYCLE_SECONDS,
  FRAME_COUNT,
  FPS,
  LIVE_NORTH_URL,
} from "./timing.mjs";
import { recordNorthCycleToMp4 } from "./xvfb-record.mjs";
import { trimToCycleWindow } from "./trim-cycle.mjs";
import { ensureLoopSeam } from "./seam-fix.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
const TMP_QA = path.join(__dirname, ".qa-tmp");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
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

function fileSizeMb(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
}

function reencodeIfOversize(mp4Path) {
  if (fileSizeMb(mp4Path) <= 45) return 17;
  let crf = 18;
  const tmp = `${mp4Path}.crf.mp4`;
  while (crf <= 28) {
    run("ffmpeg", [
      "-y",
      "-i",
      mp4Path,
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
      tmp,
    ]);
    if (fileSizeMb(tmp) <= 45) {
      fs.renameSync(tmp, mp4Path);
      return crf;
    }
    crf += 1;
  }
  fs.renameSync(tmp, mp4Path);
  return crf;
}

async function main() {
  ensureDir(ARTIFACTS);
  ensureDir(TMP_QA);
  const mp4Path = path.join(ARTIFACTS, "teatop-north-top10-1080p.mp4");
  const rawPath = path.join(ARTIFACTS, "teatop-north-top10-raw.mp4");

  const captureMeta = await recordNorthCycleToMp4(rawPath);
  const trimMeta = trimToCycleWindow(rawPath, mp4Path);
  try {
    fs.unlinkSync(rawPath);
  } catch {
    spawnSync("rm", ["-f", rawPath]);
  }
  const crfUsed = reencodeIfOversize(mp4Path);
  const seamMeta = ensureLoopSeam(mp4Path, 0.99, TMP_QA);

  if (captureMeta.postCycleRefPng) {
    fs.copyFileSync(
      captureMeta.postCycleRefPng,
      path.join(ARTIFACTS, "loop-seam-check.png")
    );
  }

  const qaReport = fullQaReport(
    mp4Path,
    TMP_QA,
    captureMeta.preCycleRefPng,
    captureMeta.postCycleRefPng
  );
  qaReport.seamPatch = seamMeta;
  fs.writeFileSync(
    path.join(ARTIFACTS, "qa-report.json"),
    `${JSON.stringify(qaReport, null, 2)}\n`
  );

  QA_SAMPLE_TIMES.forEach((t) => {
    const src = path.join(TMP_QA, `sample-${t}s.png`);
    const label = String(t).replace(".", "_");
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(ARTIFACTS, `north-frame-${label}s.png`));
    }
  });

  buildContactSheet(mp4Path, path.join(ARTIFACTS, "contact-0-6s.png"));

  writeFfprobe(mp4Path, ARTIFACTS, {
    sourceUrl: LIVE_NORTH_URL,
    cycleSeconds: CYCLE_SECONDS,
    fps: FPS,
    frameCount: FRAME_COUNT,
    crf: crfUsed,
      capture: captureMeta,
      trim: trimMeta,
      seam: seamMeta,
    qa: qaReport,
  });

  console.log("QA pass:", qaReport.pass);
  console.log("Loop SSIM:", qaReport.loopSeamSsim);
  console.log("Segments:", qaReport.segmentCount);

  if (!qaReport.pass.all) {
    process.exit(1);
  }
  console.log(`Done: ${mp4Path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
