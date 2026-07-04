/**
 * Uniform spatial hash over flat typed arrays — zero allocation per frame.
 * Rebuilt every frame from the enemy pool; queried by weapons, projectiles,
 * and player contact checks.
 */

const BUCKETS = 1024; // power of two
const CELL = 32;

export class CollisionGrid {
  private head = new Int32Array(BUCKETS).fill(-1);
  private next: Int32Array;
  private xs: Float32Array;
  private ys: Float32Array;

  constructor(capacity: number) {
    this.next = new Int32Array(capacity).fill(-1);
    this.xs = new Float32Array(capacity);
    this.ys = new Float32Array(capacity);
  }

  clear(): void {
    this.head.fill(-1);
  }

  private static hash(cx: number, cy: number): number {
    return ((cx * 73856093) ^ (cy * 19349663)) & (BUCKETS - 1);
  }

  insert(index: number, x: number, y: number): void {
    const b = CollisionGrid.hash(Math.floor(x / CELL), Math.floor(y / CELL));
    this.next[index] = this.head[b]!;
    this.head[b] = index;
    this.xs[index] = x;
    this.ys[index] = y;
  }

  /**
   * Visit indices whose stored position is within r of (x,y).
   * Return true from the callback to stop early.
   */
  forEachInRadius(x: number, y: number, r: number, cb: (index: number, dx: number, dy: number, d2: number) => boolean | void): void {
    const r2 = r * r;
    const cx0 = Math.floor((x - r) / CELL);
    const cx1 = Math.floor((x + r) / CELL);
    const cy0 = Math.floor((y - r) / CELL);
    const cy1 = Math.floor((y + r) / CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        let i = this.head[CollisionGrid.hash(cx, cy)]!;
        while (i !== -1) {
          const dx = this.xs[i]! - x;
          const dy = this.ys[i]! - y;
          const d2 = dx * dx + dy * dy;
          // Hash collisions can put far cells in this bucket; d2 filters them.
          if (d2 <= r2) {
            if (cb(i, dx, dy, d2)) return;
          }
          i = this.next[i]!;
        }
      }
    }
  }

  /** Index of the nearest entry within maxR of (x,y), or -1. */
  nearest(x: number, y: number, maxR: number): number {
    let best = -1;
    let bestD2 = maxR * maxR;
    this.forEachInRadius(x, y, maxR, (i, _dx, _dy, d2) => {
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    });
    return best;
  }
}
