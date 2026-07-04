/**
 * String-grid pixel sprite DSL. Sprites are authored as arrays of strings;
 * each char indexes a palette color, '.' is transparent. Supports half-width
 * authoring with horizontal mirroring and automatic 1px outlines.
 */

export interface SpriteSpec {
  key: string;
  grid: string[];
  palette: Record<string, string>;
  /** Grid is the left half; right half is mirrored (center column not doubled if oddCenter). */
  mirrorX?: boolean;
  /** Duplicate the last column when mirroring (even width) — default true. */
  evenMirror?: boolean;
  /** Outline color; null disables. Default dark outline. */
  outline?: string | null;
}

export interface RenderedSprite {
  key: string;
  width: number;
  height: number;
  /** Flat RGBA-hex (or '' for transparent) per pixel, row-major. */
  pixels: string[];
}

const DEFAULT_OUTLINE = '#120a05';

export function renderSprite(spec: SpriteSpec): RenderedSprite {
  const rows = spec.grid;
  const h = rows.length;
  const halfW = Math.max(...rows.map((r) => r.length));

  // Normalize row lengths, expand mirror.
  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row = (rows[y] ?? '').padEnd(halfW, '.').split('');
    if (spec.mirrorX) {
      const mirrored = [...row].reverse();
      if (spec.evenMirror === false) mirrored.shift();
      grid.push([...row, ...mirrored]);
    } else {
      grid.push(row);
    }
  }
  const w = grid[0]?.length ?? 0;

  // Pad 1px border for outline room.
  const outline = spec.outline === null ? null : (spec.outline ?? DEFAULT_OUTLINE);
  const pad = outline ? 1 : 0;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const pixels: string[] = new Array(W * H).fill('');

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y]![x]!;
      if (ch === '.' || ch === ' ') continue;
      const color = spec.palette[ch];
      if (!color) throw new Error(`sprite ${spec.key}: no palette entry for '${ch}'`);
      pixels[(y + pad) * W + (x + pad)] = color;
    }
  }

  if (outline) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (pixels[y * W + x] !== '') continue;
        const filled =
          (x > 0 && isBody(pixels[y * W + x - 1])) ||
          (x < W - 1 && isBody(pixels[y * W + x + 1])) ||
          (y > 0 && isBody(pixels[(y - 1) * W + x])) ||
          (y < H - 1 && isBody(pixels[(y + 1) * W + x]));
        if (filled) pixels[y * W + x] = `O${outline}`;
      }
    }
    // Resolve outline markers.
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]!;
      if (p.startsWith('O')) pixels[i] = p.slice(1);
    }
  }

  return { key: spec.key, width: W, height: H, pixels };
}

function isBody(p: string | undefined): boolean {
  return !!p && !p.startsWith('O');
}

export function drawSpriteToCtx(
  ctx: CanvasRenderingContext2D,
  sprite: RenderedSprite,
  ox: number,
  oy: number,
): void {
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const color = sprite.pixels[y * sprite.width + x]!;
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}
