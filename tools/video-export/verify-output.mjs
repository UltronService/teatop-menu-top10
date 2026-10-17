import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CYCLE_SECONDS, FRAME_COUNT, FPS } from "./timing.mjs";

const ARTIFACTS = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
const mp4 = path.join(ARTIFACTS, "teatop-north-top10-1080p.mp4");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}

if (!fs.existsSync(mp4)) {
  console.error("Missing", mp4);
  process.exit(1);
}

const json = JSON.parse(
  run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-print_format", "json", mp4])
);
const v = json.streams.find((s) => s.codec_type === "video");
const duration = Number(json.format.duration);
const frames = Number(v.nb_frames);

console.log({
  codec: v.codec_name,
  width: v.width,
  height: v.height,
  fps: FPS,
  expectedFrames: FRAME_COUNT,
  expectedDuration: CYCLE_SECONDS,
  nb_frames: frames,
  duration,
});

const ok =
  v.codec_name === "h264" &&
  v.width === 1920 &&
  v.height === 1080 &&
  frames === FRAME_COUNT &&
  Math.abs(duration - CYCLE_SECONDS) < 0.05;

process.exit(ok ? 0 : 1);
