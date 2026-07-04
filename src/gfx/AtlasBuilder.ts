import Phaser from 'phaser';
import { renderSprite, drawSpriteToCtx, type SpriteSpec } from './PixelDSL';
import { characterSprites } from './sprites/characters';
import { enemySprites } from './sprites/enemies';
import { miscSprites } from './sprites/misc';
import { drawFontStrip, fontStripWidth, FONT_CHARS, GLYPH_W, GLYPH_H } from './font';
import { C } from './palettes';
import { Rng } from '../util/rng';

export const ATLAS = 'atlas';
export const FONT = 'pixfont';
export const FONT_TEX = 'pixfont-tex';

interface PackItem {
  key: string;
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

const PAD = 1;

/** Builds the single runtime texture atlas: sprites, fx frames, tiles, font. */
export function buildAtlas(scene: Phaser.Scene): void {
  const items: PackItem[] = [];

  const allSpecs: SpriteSpec[] = [...characterSprites, ...enemySprites, ...miscSprites];
  for (const spec of allSpecs) {
    const rendered = renderSprite(spec);
    items.push({
      key: spec.key,
      w: rendered.width,
      h: rendered.height,
      draw: (ctx, x, y) => drawSpriteToCtx(ctx, rendered, x, y),
    });
  }

  addFxFrames(items);
  addTiles(items);

  // Shelf pack, tallest first.
  const sorted = [...items].sort((a, b) => b.h - a.h);
  const canvasW = 1024;
  let cx = PAD;
  let cy = PAD;
  let shelfH = 0;
  const placed = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const item of sorted) {
    if (cx + item.w + PAD > canvasW) {
      cx = PAD;
      cy += shelfH + PAD;
      shelfH = 0;
    }
    placed.set(item.key, { x: cx, y: cy, w: item.w, h: item.h });
    cx += item.w + PAD;
    shelfH = Math.max(shelfH, item.h);
  }
  const canvasH = Phaser.Math.Pow2.GetNext(cy + shelfH + PAD);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (const item of items) {
    const p = placed.get(item.key)!;
    item.draw(ctx, p.x, p.y);
  }

  const tex = scene.textures.addCanvas(ATLAS, canvas);
  if (!tex) throw new Error('atlas texture creation failed');
  for (const [key, p] of placed) {
    tex.add(key, 0, p.x, p.y, p.w, p.h);
  }
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  registerFont(scene);
}

/**
 * The font gets its own texture: RetroFont.Parse resolves UVs against the
 * image key's *first frame* cut position, which on a multi-frame atlas is an
 * arbitrary sprite — a dedicated texture keeps offsets at zero.
 */
function registerFont(scene: Phaser.Scene): void {
  const canvas = document.createElement('canvas');
  canvas.width = Phaser.Math.Pow2.GetNext(fontStripWidth());
  canvas.height = Phaser.Math.Pow2.GetNext(GLYPH_H);
  const ctx = canvas.getContext('2d')!;
  drawFontStrip(ctx, 0, 0);
  const tex = scene.textures.addCanvas(FONT_TEX, canvas);
  if (!tex) throw new Error('font texture creation failed');
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const config: Phaser.Types.GameObjects.BitmapText.RetroFontConfig = {
    image: FONT_TEX,
    width: GLYPH_W,
    height: GLYPH_H,
    chars: FONT_CHARS,
    charsPerRow: FONT_CHARS.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 1,
  };
  const data = Phaser.GameObjects.RetroFont.Parse(scene, config);
  scene.cache.bitmapFont.add(FONT, data);
}

/** Tiny frames used by particle emitters and primitive draws. */
function addFxFrames(items: PackItem[]): void {
  const solid = (key: string, size: number, color: string) =>
    items.push({
      key,
      w: size,
      h: size,
      draw: (ctx, x, y) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
      },
    });

  solid('fx_px', 2, '#ffffff');
  solid('fx_px1', 1, '#ffffff');

  // Round dots (pixelated circles).
  const dot = (key: string, r: number, color: string) =>
    items.push({
      key,
      w: r * 2 + 1,
      h: r * 2 + 1,
      draw: (ctx, x, y) => {
        ctx.fillStyle = color;
        for (let py = -r; py <= r; py++)
          for (let px = -r; px <= r; px++)
            if (px * px + py * py <= r * r + r * 0.5) ctx.fillRect(x + r + px, y + r + py, 1, 1);
      },
    });
  dot('fx_dot3', 1, '#ffffff');
  dot('fx_dot5', 2, '#ffffff');
  dot('fx_dot9', 4, '#ffffff');

  // Soft glow (stepped alpha rings) for additive blending.
  items.push({
    key: 'fx_glow16',
    w: 16,
    h: 16,
    draw: (ctx, x, y) => {
      const cx = x + 8;
      const cy = y + 8;
      const steps: Array<[number, number]> = [
        [8, 0.15],
        [6, 0.3],
        [4, 0.55],
        [2, 1],
      ];
      for (const [r, a] of steps) {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        for (let py = -r; py <= r; py++)
          for (let px = -r; px <= r; px++)
            if (px * px + py * py <= r * r) ctx.fillRect(cx + px, cy + py, 1, 1);
      }
    },
  });

  // Ring (for shockwaves / voice).
  items.push({
    key: 'fx_ring9',
    w: 9,
    h: 9,
    draw: (ctx, x, y) => {
      ctx.fillStyle = '#ffffff';
      const r = 4;
      for (let py = -r; py <= r; py++)
        for (let px = -r; px <= r; px++) {
          const d = px * px + py * py;
          if (d <= r * r && d >= (r - 1.2) * (r - 1.2)) ctx.fillRect(x + 4 + px, y + 4 + py, 1, 1);
        }
    },
  });

  // Holtzman shield hex.
  items.push({
    key: 'fx_hex7',
    w: 7,
    h: 7,
    draw: (ctx, x, y) => {
      ctx.fillStyle = '#ffffff';
      const rows = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
      for (let py = 0; py < 7; py++)
        for (let px = 0; px < 7; px++) if (rows[py]![px] === '#') ctx.fillRect(x + px, y + py, 1, 1);
    },
  });

  // Spark (horizontal sliver, rotated at runtime).
  items.push({
    key: 'fx_spark',
    w: 5,
    h: 1,
    draw: (ctx, x, y) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 5, 1);
    },
  });

  // Directional shadow blob.
  items.push({
    key: 'fx_shadow',
    w: 10,
    h: 4,
    draw: (ctx, x, y) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 2, y, 6, 4);
      ctx.fillRect(x + 1, y + 1, 8, 2);
      ctx.fillRect(x, y + 1, 10, 2);
    },
  });
}

/** Seeded dithered ground tiles: 4 variants per map biome. */
function addTiles(items: PackItem[]): void {
  const TILE = 24;
  const biomes: Record<string, { base: string; specks: string[]; rare: string }> = {
    arrakeen: { base: C.sand2, specks: [C.sand1, C.sand3], rare: '#6a4a28' },
    deep: { base: C.sand3, specks: [C.sand2, C.sand4], rare: C.spice2 },
  };
  for (const [biome, cfg] of Object.entries(biomes)) {
    for (let v = 0; v < 4; v++) {
      const rng = new Rng(0xd00d + v * 131 + biome.length * 7);
      items.push({
        key: `tile_${biome}_${v}`,
        w: TILE,
        h: TILE,
        draw: (ctx, x, y) => {
          ctx.fillStyle = cfg.base;
          ctx.fillRect(x, y, TILE, TILE);
          const specks = 26 + v * 4;
          for (let i = 0; i < specks; i++) {
            const px = rng.int(0, TILE - 1);
            const py = rng.int(0, TILE - 1);
            ctx.fillStyle = rng.chance(0.06) ? cfg.rare : rng.pick(cfg.specks);
            ctx.fillRect(x + px, y + py, rng.chance(0.3) ? 2 : 1, 1);
          }
          // Occasional dune ripple line.
          if (rng.chance(0.6)) {
            ctx.fillStyle = cfg.specks[0]!;
            const ry = rng.int(3, TILE - 4);
            for (let i = 0; i < TILE; i += 2) ctx.fillRect(x + i, y + ry + (i % 4 === 0 ? 1 : 0), 1, 1);
          }
        },
      });
    }
  }
}
