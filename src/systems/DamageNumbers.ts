import Phaser from 'phaser';
import { PERF } from '../config';
import { FONT } from '../gfx/AtlasBuilder';

/** Pooled floating damage numbers (world space, bitmap font). */
export class DamageNumbers {
  private pool: Phaser.GameObjects.BitmapText[] = [];
  private scene: Phaser.Scene;
  enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < PERF.maxDamageNumbers; i++) {
      this.pool.push(scene.add.bitmapText(0, 0, FONT, '').setVisible(false).setDepth(20));
    }
  }

  show(x: number, y: number, amount: number, tint = 0xf5efe6): void {
    if (!this.enabled) return;
    let t: Phaser.GameObjects.BitmapText | null = null;
    for (const cand of this.pool) {
      if (!cand.visible) {
        t = cand;
        break;
      }
    }
    if (!t) return;
    t.setText(String(Math.round(amount)))
      .setVisible(true)
      .setAlpha(1)
      .setTint(tint)
      .setPosition(Math.round(x - 3), Math.round(y - 10));
    this.scene.tweens.add({
      targets: t,
      y: t.y - 12,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => t!.setVisible(false),
    });
  }
}
