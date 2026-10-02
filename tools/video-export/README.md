# TEATOP TOP10 video export

Offline capture of the live region playback page (no changes to `regions/*` or site assets).

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
- `Xvfb`
- `fonts-noto-cjk` (Chinese glyphs if web fonts fail)
- `openbox` (window manager on Xvfb for borderless kiosk)
- `tesseract-ocr` (optional; QA uses feature stdev + SSIM)
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
- `/opt/cursor/artifacts/ffprobe.txt`
- `/opt/cursor/artifacts/qa-report.json`
- `/opt/cursor/artifacts/north-frame-2_5s.png` … `north-frame-24_5s.png`
- `/opt/cursor/artifacts/contact-0-6s.png` (0–6s every 0.25s)
- `/opt/cursor/artifacts/full-frame-8s.png`

Set `ARTIFACTS_DIR` to override the output directory.

## How it works

1. **Xvfb** 1920×1080 + **openbox**, Chromium **kiosk** (single tab, no per-frame reload). Assert `innerWidth`/`innerHeight`/`devicePixelRatio` before record.
2. Wait for `data-ready`, fonts, and **all images** before timing starts.
3. Reset CSS animations to cycle start (clone `L05Ename` to drop loop `animationend` handler).
4. Play animations; wait for the first natural loop boundary (`L05Ename` `fadeOut` + 500ms), re-`play()` Web Animations after the script reset, then **ffmpeg x11grab** real-time at 30fps.
5. **Trim** 834 frames `[start, start+834)` with stable content and loop seam SSIM ≥ 0.99 (no duplicate-frame patch).
6. **QA** (`qa-report.json`): viewport metrics, per-second right-edge / top-chrome checks, right-panel layout SSIM vs kiosk reference at t≈2.5s, five TOP segments, loop seam ≥ 0.99.
7. libx264 yuv420p, `+faststart`; raise CRF if output exceeds 45 MB.

## Verify

```bash
npm run verify
```
