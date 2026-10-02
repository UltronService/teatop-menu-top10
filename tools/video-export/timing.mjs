/**
 * Playback cycle derived from js/script.js + css/style.css:
 * - TOP1..TOP5 slots are 5.5s apart (last slideOut at 27s + 0.3s fadeOut on L05Ename).
 * - script.js waits 500ms after that fadeOut animationend before resetting (setTimeout 500).
 */
export const FPS = 30;
export const CYCLE_SECONDS = 27.8;
export const FRAME_COUNT = Math.round(CYCLE_SECONDS * FPS);
export const FRAME_MS = 1000 / FPS;
export const LIVE_NORTH_URL =
  "https://ultronservice.github.io/teatop-menu-top10/regions/north/";
export const VIEWPORT = { width: 1920, height: 1080 };
