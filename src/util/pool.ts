/** Fixed-size object pool over a flat array — no per-frame allocation. */

export interface Poolable {
  active: boolean;
}

export class Pool<T extends Poolable> {
  readonly items: T[];
  private cursor = 0;

  constructor(size: number, factory: (index: number) => T) {
    this.items = new Array(size);
    for (let i = 0; i < size; i++) this.items[i] = factory(i);
  }

  /** Returns an inactive item or null if exhausted. Caller sets active=true. */
  obtain(): T | null {
    const n = this.items.length;
    for (let i = 0; i < n; i++) {
      this.cursor = (this.cursor + 1) % n;
      const item = this.items[this.cursor]!;
      if (!item.active) return item;
    }
    return null;
  }

  countActive(): number {
    let c = 0;
    for (let i = 0; i < this.items.length; i++) if (this.items[i]!.active) c++;
    return c;
  }

  forEachActive(fn: (item: T) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!;
      if (item.active) fn(item);
    }
  }
}
