# TEATOP TOP10 video export

Offline frame-by-frame capture of the live region playback page (no changes to `regions/*` or site assets).

## North region cycle timing

From `js/script.js` and `css/style.css`:

| Segment | Start (s) |
|---------|-----------|
| TOP1    | 0         |
| TOP2    | 5.5       |
| TOP3    | 11        |
| TOP4    | 16.5      |
| TOP5    | 22        |

Last visible beat: `L05Ename` `fadeOut` at 27s + 0.3s duration → **27.3s**. `script.js` then `setTimeout(..., 500)` before resetting animations → **cycle = 27.8s**.

- **FPS:** 30  
- **Frames:** `round(27.8 × 30)` = **834**

## Requirements

- Node.js 20+
- `ffmpeg` / `ffprobe`
- `fonts-noto-cjk` (Chinese glyphs if web fonts fail)
- Playwright Chromium (`npx playwright install chromium`)

## Export north (1080p MP4)

```bash
cd tools/video-export
npm install
npx playwright install chromium
npm run export:north
```

Artifacts (default):

- `/opt/cursor/artifacts/teatop-north-top10-1080p.mp4`
- `/opt/cursor/artifacts/north-frame-00.png` … `north-frame-05.png`
- `/opt/cursor/artifacts/ffprobe.txt`

Set `ARTIFACTS_DIR` to override the output directory.

## How it works

1. Load the **live** north URL in headless Chromium at 1920×1080 (`deviceScaleFactor: 1`).
2. Wait for `data-ready`, fonts, and images.
3. Reset CSS animations to cycle start (clone `L05Ename` to drop loop `animationend` handler).
4. For each output frame, open a **fresh** Chromium tab, reset animations to `t=0`, advance document time with CDP `Emulation.setVirtualTimePolicy` in `1000/30` ms steps (CSS + `script.js` timers), then take one CDP screenshot. (Reusing one tab and screenshotting every step desyncs animation time in headless Chromium.)
5. Encode **834** frames with libx264 (yuv420p, `+faststart`). Compare frame 0 vs frame 834 (extra capture) via ffmpeg SSIM for loop seam.
6. Raise CRF if output exceeds 45 MB.

## Verify

```bash
npm run verify
```
