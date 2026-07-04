import Phaser from 'phaser';
import { FONT } from '../gfx/AtlasBuilder';

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
