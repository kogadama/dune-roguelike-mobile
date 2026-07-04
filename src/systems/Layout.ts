import { VIRTUAL_HEIGHT } from '../config';
import type { LayoutMode } from '../types';

export interface LayoutInfo {
  mode: 'landscape' | 'gbc';
  /** Game camera viewport in canvas pixels. */
  view: { x: number; y: number; w: number; h: number };
  /** Camera zoom so the viewport shows VIRTUAL_HEIGHT world px vertically. */
  zoom: number;
  /** Visible virtual world width/height. */
  vw: number;
  vh: number;
  /** Canvas size. */
  w: number;
  h: number;
  safe: { top: number; bottom: number; left: number; right: number };
}

let safeCache: LayoutInfo['safe'] | null = null;

/** Safe-area insets from the CSS vars set in index.html (notch / home bar). */
export function safeInsets(): LayoutInfo['safe'] {
  if (safeCache) return safeCache;
  const cs = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(cs.getPropertyValue(name)) || 0;
  safeCache = { top: px('--sat'), bottom: px('--sab'), left: px('--sal'), right: px('--sar') };
  return safeCache;
}

export function invalidateSafeInsets(): void {
  safeCache = null;
}

/** GBC mode: fraction of canvas height used by the "screen" region. */
const GBC_SCREEN_FRAC = 0.58;
const GBC_BEZEL = 10;

export function computeLayout(w: number, h: number, setting: LayoutMode): LayoutInfo {
  const safe = safeInsets();
  const mode: 'landscape' | 'gbc' =
    setting === 'auto' ? (w >= h ? 'landscape' : 'gbc') : setting;

  if (mode === 'landscape') {
    const zoom = Math.max(1, h / VIRTUAL_HEIGHT);
    return { mode, view: { x: 0, y: 0, w, h }, zoom, vw: w / zoom, vh: VIRTUAL_HEIGHT, w, h, safe };
  }

  // GBC: screen window at top (below safe area), shell below.
  const shellTop = safe.top + 4;
  const screenH = Math.round(h * GBC_SCREEN_FRAC) - shellTop;
  const viewX = GBC_BEZEL + 4;
  const viewY = shellTop + GBC_BEZEL;
  const viewW = w - viewX * 2;
  const viewH = screenH - GBC_BEZEL * 2;
  const zoom = Math.max(1, viewH / (VIRTUAL_HEIGHT * 0.82)); // slightly tighter view in portrait
  return {
    mode,
    view: { x: viewX, y: viewY, w: viewW, h: viewH },
    zoom,
    vw: viewW / zoom,
    vh: viewH / zoom,
    w,
    h,
    safe,
  };
}
