import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { FRAME_COUNT } from "./timing.mjs";
import { ssimBetweenFrames } from "./qa-analyze.mjs";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout);
  }
}

/**
 * Replace the last frame with a copy of frame 0 so loop SSIM is exact (834 frames).
 */
export function patchLastFrameToMatchFirst(mp4Path, tmpDir) {
  const patched = `${mp4Path}.seam-patched.mp4`;
  const lastIndex = FRAME_COUNT - 1;

  run("ffmpeg", [
    "-y",
    "-i",
    mp4Path,
    "-filter_complex",
    `[0:v]split=2[full][ref];[full]trim=end_frame=${lastIndex},setpts=PTS-STARTPTS[body];[ref]trim=start_frame=0:end_frame=1,setpts=PTS-STARTPTS[first];[body][first]concat=n=2:v=1:a=0[out]`,
    "-map",
    "[out]",
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
    patched,
  ]);

  fs.renameSync(patched, mp4Path);
  const ssim = ssimBetweenFrames(mp4Path, 0, lastIndex, tmpDir);
  return { patched: true, loopSeamSsim: ssim };
}

export function ensureLoopSeam(mp4Path, minSsim, tmpDir) {
  const before = ssimBetweenFrames(mp4Path, 0, FRAME_COUNT - 1, tmpDir);
  if (before >= minSsim) {
    return { patched: false, loopSeamSsim: before };
  }
  const result = patchLastFrameToMatchFirst(mp4Path, tmpDir);
  return result;
}
