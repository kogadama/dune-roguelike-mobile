import { get as idbGet, set as idbSet } from 'idb-keyval';
import { migrate, type SaveV1 } from './schema';

const KEY = 'sietch-save-v1';

/**
 * Debounced persistence: IndexedDB primary, localStorage mirror as fallback
 * (iOS can evict either; both surviving is likely). Flushes on pagehide.
 */
export class SaveManager {
  data: SaveV1;
  private dirty = false;
  private timer: number | null = null;

  private constructor(data: SaveV1) {
    this.data = data;
    const flush = () => this.flushNow();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushNow();
    });
  }

  static async load(): Promise<SaveManager> {
    let raw: unknown = null;
    try {
      raw = await idbGet(KEY);
    } catch {
      // IndexedDB unavailable (private mode edge cases) — fall through.
    }
    if (!raw) {
      try {
        const ls = localStorage.getItem(KEY);
        if (ls) raw = JSON.parse(ls);
      } catch {
        // Corrupt mirror — start fresh.
      }
    }
    return new SaveManager(migrate(raw));
  }

  /** Mark dirty; actual write happens at most once per second. */
  save(): void {
    this.dirty = true;
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.flushNow();
    }, 1000);
  }

  flushNow(): void {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const json = JSON.stringify(this.data);
    idbSet(KEY, this.data).catch(() => undefined);
    try {
      localStorage.setItem(KEY, json);
    } catch {
      // Storage full/blocked — IndexedDB write may still have landed.
    }
  }
}
