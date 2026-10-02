import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  collectFeatureStdevSeries,
  frameStdevAtTime,
  ssimBetweenFrames,
} from "./qa-analyze.mjs";
import { FRAME_COUNT } from "./timing.mjs";

const STABLE_STDEV = 61;
const SSIM_MIN = 0.99;

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}

function isStableRun(series, index) {
  const a = series[index];
  const b = series[index + 1];
  const c = series[index + 2];
  if (!a || !b || !c) return false;
  return (
    a.stdev >= STABLE_STDEV &&
    b.stdev >= STABLE_STDEV &&
    c.stdev >= STABLE_STDEV
  );
}

function midCycleStdev(mp4Path) {
  return frameStdevAtTime(mp4Path, 13.5);
}

function firstStableIndex(series) {
  for (let i = 0; i < series.length - 3; i += 1) {
    if (isStableRun(series, i)) return i;
  }
  return 0;
}

function buildCandidateStarts(series) {
  const maxStart = series.length - FRAME_COUNT;
  const base = firstStableIndex(series);
  const candidates = new Set([0, base]);
  for (let d = -60; d <= 60; d += 1) {
    const a = base + d;
    if (a >= 0 && a <= maxStart) candidates.add(a);
  }
  return [...candidates].sort((x, y) => x - y);
}

function rankCycleStarts(rawPath, series) {
  const tmpDir = "/tmp/teatop-trim-ssim";
  const candidates = buildCandidateStarts(series);
  const ranked = [];

  for (const i of candidates) {
    if (!isStableRun(series, i)) continue;
    const endFrame = i + FRAME_COUNT - 1;
    if (endFrame >= series.length) continue;
    const rawSsim = ssimBetweenFrames(rawPath, i, endFrame, tmpDir);
    ranked.push({ startFrame: i, endFrame, rawSsim });
  }

  ranked.sort((a, b) => b.rawSsim - a.rawSsim);
  if (ranked.length === 0) {
    const startFrame = firstStableIndex(series);
    const endFrame = startFrame + FRAME_COUNT - 1;
    const rawSsim = ssimBetweenFrames(rawPath, startFrame, endFrame, tmpDir);
    ranked.push({ startFrame, endFrame, rawSsim });
  }
  return ranked;
}

function encodeCycleWindow(rawPath, outPath, startFrame, endFrame) {
  run("ffmpeg", [
    "-y",
    "-i",
    rawPath,
    "-vf",
    `select=between(n\\,${startFrame}\\,${endFrame}),setpts=N/FRAME_RATE/TB`,
    "-frames:v",
    String(FRAME_COUNT),
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
  ]);
}

export function trimToCycleWindow(rawPath, outPath) {
  const series = collectFeatureStdevSeries(rawPath);
  const ranked = rankCycleStarts(rawPath, series);
  const tmpDir = "/tmp/teatop-trim-ssim";
  let chosen = ranked[0];
  let outputSeam = 0;
  let pickSearch = "best-output-seam";

  const tryPath = `${outPath}.trim-try.mp4`;
  let bestTops = null;
  for (let t = 0; t < ranked.length; t += 1) {
    const pick = ranked[t];
    encodeCycleWindow(rawPath, tryPath, pick.startFrame, pick.endFrame);
    outputSeam = ssimBetweenFrames(
      tryPath,
      0,
      FRAME_COUNT - 1,
      tmpDir
    );
    const midStdev = midCycleStdev(tryPath);
    const topsLikely = midStdev >= 58;
    if (topsLikely && (!bestTops || outputSeam > bestTops.outputSeam)) {
      bestTops = { pick, outputSeam };
    }
    if (outputSeam >= SSIM_MIN && topsLikely) {
      chosen = pick;
      fs.renameSync(tryPath, outPath);
      pickSearch = "output-seam-pass";
      break;
    }
    if (fs.existsSync(tryPath)) fs.unlinkSync(tryPath);
  }
  if (!fs.existsSync(outPath) && bestTops) {
    encodeCycleWindow(
      rawPath,
      outPath,
      bestTops.pick.startFrame,
      bestTops.pick.endFrame
    );
    chosen = bestTops.pick;
    outputSeam = bestTops.outputSeam;
    pickSearch = "best-tops-seam";
  }

  const startPng = path.join(path.dirname(outPath), "cycle-start-from-raw.png");
  run("ffmpeg", [
    "-y",
    "-i",
    rawPath,
    "-vf",
    `select=eq(n\\,${chosen.startFrame})`,
    "-frames:v",
    "1",
    "-update",
    "1",
    startPng,
  ]);

  return {
    startFrame: chosen.startFrame,
    endFrame: chosen.endFrame,
    startPng,
    loopSeamRawSsim: chosen.rawSsim,
    loopSeamOutputSsim: outputSeam,
    pickSearch,
    candidatesTried: ranked.length,
  };
}
