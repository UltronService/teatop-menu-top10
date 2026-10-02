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

Set `ARTIFACTS_DIR` to override the output directory.

## How it works

1. **Xvfb** 1920×1080 and one Chromium **app-mode** window (single tab, no per-frame reload).
2. Wait for `data-ready`, fonts, and **all images** before timing starts.
3. Reset CSS animations to cycle start (clone `L05Ename` to drop loop `animationend` handler).
4. Play animations; wait for the first natural loop boundary (`L05Ename` `fadeOut` + 500ms), re-`play()` Web Animations after the script reset, then **ffmpeg x11grab** real-time at 30fps.
5. **Trim** 834 frames with stable left-panel content and strong loop seam; optional **last-frame = first-frame** patch if encode seam &lt; 0.99.
6. **QA** (`qa-report.json`): five continuous TOP segments on the left half, no isolated blank/spike frames, sample times 2.5/8/13.5/19/24.5s, loop seam SSIM ≥ 0.99.
7. libx264 yuv420p, `+faststart`; raise CRF if output exceeds 45 MB.

## Verify

```bash
npm run verify
```
