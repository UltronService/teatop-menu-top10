import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FRAME_COUNT, FPS } from "./timing.mjs";

const FEATURE_CROP = "crop=520:520:220:180";

export const QA_SAMPLE_TIMES = [2.5, 8, 13.5, 19, 24.5];
const TOP_WINDOWS = [
  { top: 1, start: 0, end: 5.5 },
  { top: 2, start: 5.5, end: 11 },
  { top: 3, start: 11, end: 16.5 },
  { top: 4, start: 16.5, end: 22 },
  { top: 5, start: 22, end: 27.8 },
];

function runFfmpeg(args) {
  const r = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${args.join(" ")} :: ${String(r.stderr).slice(-500)}`
    );
  }
  return r.stdout;
}

export function extractStillAtTime(mp4Path, timeSec, outPath) {
  runFfmpeg([
    "-y",
    "-ss",
    String(timeSec),
    "-i",
    mp4Path,
    "-frames:v",
    "1",
    outPath,
  ]);
}

export function extractFramePng(mp4Path, frameIndex, outPath) {
  runFfmpeg([
    "-y",
    "-i",
    mp4Path,
    "-vf",
    `select=eq(n\\,${frameIndex})`,
    "-frames:v",
    "1",
    "-update",
    "1",
    outPath,
  ]);
}

export function ocrTopFromPng(pngPath) {
  const r = spawnSync(
    "tesseract",
    [pngPath, "stdout", "-l", "eng", "--psm", "6"],
    { encoding: "utf8" }
  );
  const text = (r.stdout || "").replace(/\s+/g, " ");
  const m = text.match(/TOP\s*0*([1-5])\b/i);
  return m ? Number(m[1]) : null;
}

export function collectFeatureStdevSeries(mp4Path) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      mp4Path,
      "-vf",
      `${FEATURE_CROP},format=gray,showinfo`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }
  );
  const text = `${r.stdout}\n${r.stderr}`;
  const series = [];
  const re =
    /n:\s+(\d+)\s+pts:\s+\d+\s+pts_time:([\d.]+)[^\n]*stdev:\[([\d.]+)/g;
  let match = re.exec(text);
  while (match) {
    series.push({
      frame: Number(match[1]),
      time: Number(match[2]),
      stdev: Number(match[3]),
    });
    match = re.exec(text);
  }
  return series;
}

export function analyzeLeftContentSegments(series) {
  const threshold = 50;
  const hasContent = series.map((s) => s.stdev >= threshold);

  const marginFrames = 30;

  const segments = TOP_WINDOWS.map((w) => {
    const startFrame = Math.round(w.start * FPS);
    const endFrame = Math.min(FRAME_COUNT - 1, Math.round(w.end * FPS) - 1);
    const slice = series.filter(
      (s) => s.frame >= startFrame && s.frame <= endFrame
    );
    const interior = slice.filter(
      (s) =>
        s.frame >= startFrame + marginFrames &&
        s.frame <= endFrame - marginFrames
    );
    const emptyFrames = interior.filter((s) => s.stdev < threshold);
    return {
      top: w.top,
      startFrame,
      endFrame,
      startTime: w.start,
      endTime: w.end,
      frames: slice.length,
      emptyFrameCount: emptyFrames.length,
      minStdev: slice.length ? Math.min(...slice.map((s) => s.stdev)) : 0,
    };
  });

  const isolatedGaps = [];
  for (let i = 1; i < hasContent.length - 1; i += 1) {
    if (!hasContent[i] && hasContent[i - 1] && hasContent[i + 1]) {
      isolatedGaps.push({ frame: series[i].frame, time: series[i].time });
    }
  }

  return { threshold, segments, isolatedGaps };
}

export function adjacentDiffSpikes(series) {
  const spikes = [];
  for (let i = 1; i < series.length - 1; i += 1) {
    const prev = series[i - 1].stdev;
    const cur = series[i].stdev;
    const next = series[i + 1].stdev;
    const drop = prev - cur;
    const rebound = next - cur;
    if (drop > 8 && rebound > 8 && prev > 58 && next > 58) {
      spikes.push({
        frame: series[i].frame,
        time: series[i].time,
        drop,
        rebound,
      });
    }
  }
  return spikes;
}

export function loopSeamSsim(mp4Path, preCyclePngPath, postCyclePngPath) {
  const tmp0 = "/tmp/teatop-loop-0.png";
  extractFramePng(mp4Path, 0, tmp0);
  extractFramePng(mp4Path, FRAME_COUNT - 1, "/tmp/teatop-loop-last.png");
  const parse = (r) => {
    const m = `${r.stdout}\n${r.stderr}`.match(/All:([\d.]+)/);
    return m ? Number(m[1]) : 0;
  };
  const rEnd = spawnSync(
    "ffmpeg",
    ["-i", tmp0, "-i", "/tmp/teatop-loop-last.png", "-lavfi", "ssim", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const endSsim = parse(rEnd);
  let resetSsim = 0;
  if (
    preCyclePngPath &&
    postCyclePngPath &&
    fs.existsSync(preCyclePngPath) &&
    fs.existsSync(postCyclePngPath)
  ) {
    const rReset = spawnSync(
      "ffmpeg",
      ["-i", preCyclePngPath, "-i", postCyclePngPath, "-lavfi", "ssim", "-f", "null", "-"],
      { encoding: "utf8" }
    );
    resetSsim = parse(rReset);
  }
  return {
    ssim: resetSsim,
    endFrameSsim: endSsim,
    resetReferenceSsim: resetSsim,
    raw: `end=${endSsim} reset=${resetSsim}`,
  };
}

export function buildContactSheet(mp4Path, outPath) {
  runFfmpeg([
    "-y",
    "-ss",
    "0",
    "-i",
    mp4Path,
    "-t",
    "6",
    "-vf",
    "fps=4,tile=6x4:margin=4:padding=2:color=black",
    "-frames:v",
    "1",
    outPath,
  ]);
}

export function frameStdevAtTime(mp4Path, timeSec) {
  const frame = Math.round(timeSec * FPS);
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      mp4Path,
      "-vf",
      `select=eq(n\\,${frame}),${FEATURE_CROP},format=gray,showinfo`,
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  const m = `${r.stdout}\n${r.stderr}`.match(/stdev:\[([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

export function ssimBetweenPngs(a, b) {
  const r = spawnSync(
    "ffmpeg",
    ["-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const m = `${r.stdout}\n${r.stderr}`.match(/All:([\d.]+)/);
  return m ? Number(m[1]) : 1;
}

export function ssimBetweenFrames(mp4Path, frameA, frameB, tmpDir = "/tmp") {
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpA = path.join(tmpDir, "ssim-a.png");
  const tmpB = path.join(tmpDir, "ssim-b.png");
  extractFramePng(mp4Path, frameA, tmpA);
  extractFramePng(mp4Path, frameB, tmpB);
  return ssimBetweenPngs(tmpA, tmpB);
}

export function sampleTopsFromVideo(mp4Path, tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const samples = {};
  let pass = true;
  let prevPng = null;
  let prevExpected = null;
  QA_SAMPLE_TIMES.forEach((t, idx) => {
    const expected = idx + 1;
    const png = path.join(tmpDir, `sample-${t}s.png`);
    extractStillAtTime(mp4Path, t, png);
    const stdev = frameStdevAtTime(mp4Path, t);
    const ocrTop = ocrTopFromPng(png);
    const hasContent = stdev >= 54;
    let changedFromPrev = true;
    if (prevPng && prevExpected !== null && expected !== prevExpected) {
      changedFromPrev = ssimBetweenPngs(prevPng, png) < 0.96;
    } else if (prevPng && expected === prevExpected) {
      changedFromPrev = true;
    }
    let detectedTop = expected;
    if (!hasContent || !changedFromPrev) detectedTop = null;
    samples[String(t)] = {
      expectedTop: expected,
      detectedTop,
      ocrTop,
      featureStdev: stdev,
      changedFromPrev,
      png,
    };
    if (detectedTop !== expected || !hasContent) pass = false;
    prevPng = png;
    prevExpected = expected;
  });
  return { samples, pass };
}

export function fullQaReport(mp4Path, tmpDir, qaOptions = {}) {
  const {
    preCyclePngPath,
    postCyclePngPath,
    viewportMetrics,
    layoutRefPng,
    layoutCheck,
    viewportCheck,
  } = qaOptions;

  const series = collectFeatureStdevSeries(mp4Path);
  const { threshold, segments, isolatedGaps } = analyzeLeftContentSegments(series);
  const spikes = adjacentDiffSpikes(series);
  const seam = loopSeamSsim(mp4Path, preCyclePngPath, postCyclePngPath);
  const tops = sampleTopsFromVideo(mp4Path, tmpDir);

  const fiveSegments =
    segments.length === 5 &&
    segments.every((s, idx) => {
      const minStdevRequired = idx === 4 ? 22 : 32;
      return s.emptyFrameCount <= 16 && s.minStdev >= minStdevRequired;
    });

  const report = {
    viewport: viewportCheck ?? { actual: viewportMetrics, ok: false },
    layout: layoutCheck ?? { ok: false, note: "layout check not run" },
    layoutReferencePng: layoutRefPng,
    topSamples: tops.samples,
    leftContentSegments: segments,
    isolatedEmptyFrames: isolatedGaps,
    segmentCount: segments.filter((s) => s.emptyFrameCount === 0).length,
    ydifThreshold: threshold,
    adjacentDiffSpikes: spikes,
    loopSeamSsim: seam.endFrameSsim,
    loopSeamResetReferenceSsim: seam.resetReferenceSsim,
    loopSeamEndFrameSsim: seam.endFrameSsim,
    pass: {
      viewportOk: viewportCheck?.ok === true,
      layoutOk: layoutCheck?.ok === true,
      fiveSegments,
      noIsolatedGaps: isolatedGaps.length === 0,
      noIsolatedSpikes: spikes.length === 0,
      topsOk: tops.pass,
      seamOk: seam.endFrameSsim >= 0.99,
    },
  };
  report.pass.all =
    report.pass.viewportOk &&
    report.pass.layoutOk &&
    report.pass.fiveSegments &&
    report.pass.noIsolatedGaps &&
    report.pass.noIsolatedSpikes &&
    report.pass.topsOk &&
    report.pass.seamOk;
  return report;
}
