import Phaser from 'phaser';
import { FONT } from '../gfx/AtlasBuilder';
import { safeInsets } from '../systems/Layout';
import { sfx } from '../audio/index';

export interface UiBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Canvas minus safe-area insets (Dynamic Island / home bar). All menu
 * content must lay out inside this rect; only backgrounds go full-bleed.
 */
export function uiBounds(scene: Phaser.Scene): UiBounds {
  const s = safeInsets();
  return {
    x: s.left,
    y: s.top,
    w: scene.scale.width - s.left - s.right,
    h: scene.scale.height - s.top - s.bottom,
  };
}

/** Bitmap text helper — all UI text goes through this (uppercased for the 3x5 font). */
export function pixText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  scale = 1,
  tint = 0xf2d492,
): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(x, y, FONT, text.toUpperCase());
  t.setScale(scale);
  t.setTint(tint);
  t.setLetterSpacing(0);
  return t;
}

export function centerPixText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  scale = 1,
  tint = 0xf2d492,
): Phaser.GameObjects.BitmapText {
  const t = pixText(scene, x, y, text, scale, tint);
  t.setOrigin(0.5);
  return t;
}

/** Minimum tap target edge, in physical screen px (Apple HIG: 44pt). */
export const MIN_TOUCH_PX = 44;

export interface TextButtonOpts {
  /** 'center' anchors text center at (x,y); 'topLeft' anchors the text's top-left. */
  align?: 'center' | 'topLeft';
  /** Minimum hit-area edge in SCREEN px (converted through camera zoom). */
  minSize?: number;
  /** Extra hit padding around the label, screen px per side. */
  pad?: number;
  /** Draw a rounded backdrop + border so the button reads as tappable. */
  frame?: boolean;
  /** Skip the click sfx (e.g. when the handler plays its own). */
  silent?: boolean;
}

export interface TextButton {
  text: Phaser.GameObjects.BitmapText;
  zone: Phaser.GameObjects.Zone;
  setLabel(label: string): void;
  destroy(): void;
}

/**
 * Tap-friendly text button. BitmapText hit areas are unusable on mobile: the
 * default rect is glyph-sized (a few px tall) and Phaser mixes scaled and
 * unscaled units for scaled BitmapText, so the area drifts off the glyphs.
 * Instead the label stays non-interactive and an invisible Zone provides a
 * hit area of at least `minSize` screen px (converted through the scene's
 * camera zoom), padded around the text. Taps click, flash the label, and stop
 * propagation so buttons never leak through to scene-level tap handlers.
 */
export function textButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  scale: number,
  tint: number,
  onTap: () => void,
  opts: TextButtonOpts = {},
): TextButton {
  const zoom = scene.cameras.main.zoom || 1;
  const minSize = (opts.minSize ?? MIN_TOUCH_PX) / zoom;
  const pad = (opts.pad ?? 10) / zoom;

  const t = pixText(scene, 0, 0, label, scale, tint);
  t.setOrigin(0.5);

  const hitSize = (): { w: number; h: number } => ({
    w: Math.max(t.width + pad * 2, minSize),
    h: Math.max(t.height + pad * 2, minSize),
  });

  const center = (): { cx: number; cy: number } =>
    opts.align === 'topLeft'
      ? { cx: x + t.width / 2, cy: y + t.height / 2 }
      : { cx: x, cy: y };

  let { cx, cy } = center();
  t.setPosition(Math.round(cx), Math.round(cy));

  const size = hitSize();
  const frame = opts.frame ? scene.add.graphics() : null;
  const drawFrame = (): void => {
    if (!frame) return;
    const s = hitSize();
    frame.clear();
    frame.fillStyle(0x0d0906, 0.55);
    frame.fillRoundedRect(cx - s.w / 2, cy - s.h / 2, s.w, s.h, 6);
    frame.lineStyle(Math.max(1, Math.round(2 / zoom)), tint, 0.55);
    frame.strokeRoundedRect(cx - s.w / 2, cy - s.h / 2, s.w, s.h, 6);
  };
  if (frame) {
    drawFrame();
    scene.children.moveBelow(frame, t);
  }

  const zone = scene.add.zone(cx, cy, size.w, size.h);
  zone.setInteractive({ useHandCursor: true });
  zone.on(
    'pointerdown',
    (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev?: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation();
      if (!opts.silent) sfx.play('click');
      scene.tweens.add({ targets: t, alpha: 0.35, duration: 60, yoyo: true });
      onTap();
    },
  );

  return {
    text: t,
    zone,
    setLabel(next: string): void {
      t.setText(next.toUpperCase());
      ({ cx, cy } = center());
      t.setPosition(Math.round(cx), Math.round(cy));
      const s = hitSize();
      zone.setPosition(cx, cy);
      zone.setSize(s.w, s.h); // also resizes the input hit area
      drawFrame();
    },
    destroy(): void {
      zone.destroy();
      frame?.destroy();
      t.destroy();
    },
  };
}
