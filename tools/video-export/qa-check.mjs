import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARTIFACTS = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";

export const QA_SAMPLE_TIMES = [2, 8, 13.5, 19, 24.5];

export function extractQaStills(mp4Path, artifactsDir = ARTIFACTS) {
  QA_SAMPLE_TIMES.forEach((t) => {
    const label = String(t).replace(".", "_");
    const out = path.join(artifactsDir, `north-frame-${label}s.png`);
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-ss", String(t), "-i", mp4Path, "-frames:v", "1", out],
      { encoding: "utf8" }
    );
    if (r.status !== 0) {
      throw new Error(`ffmpeg still @${t}s failed: ${r.stderr}`);
    }
  });
}

export function countSceneChanges(mp4Path, threshold = 0.02) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-i",
      mp4Path,
      "-filter:v",
      `select='gt(scene,${threshold})',showinfo`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  const text = `${r.stdout}\n${r.stderr}`;
  const matches = text.match(/pts_time:([\d.]+)/g) || [];
  const pts = matches.map((m) => Number(m.replace("pts_time:", "")));
  const topBoundaries = [5.5, 11, 16.5, 22];
  const boundaryHits = topBoundaries.filter((b) =>
    pts.some((t) => Math.abs(t - b) <= 1.25)
  );
  return {
    count: pts.length,
    pts: matches,
    topBoundaryHits: boundaryHits.length,
    topBoundariesExpected: topBoundaries.length,
  };
}

export function writeQaReport(artifactsDir, payload) {
  const p = path.join(artifactsDir, "qa-report.json");
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`);
  return p;
}
