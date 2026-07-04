import Phaser from 'phaser';
import { controls } from './Controls';
import type { RunState } from './RunState';
import { PLAYER_IFRAMES } from '../data/balance';
import { ATLAS } from '../gfx/AtlasBuilder';

export class PlayerController {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  private run: RunState;
  private wobbleT = 0;
  /** External speed multiplier (abilities). */
  speedMult = 1;
  x: number;
  y: number;

  constructor(scene: Phaser.Scene, run: RunState, x: number, y: number) {
    this.run = run;
    this.x = x;
    this.y = y;
    this.shadow = scene.add.image(x, y + 8, ATLAS, 'fx_shadow').setDepth(4);
    this.sprite = scene.add.sprite(x, y, ATLAS, run.character.spriteKey).setDepth(10);
    this.sprite.setOrigin(0.5, 0.78); // feet-anchored so depth sorting reads right
  }

  update(dt: number): void {
    const run = this.run;
    if (run.dead) return;

    const mx = controls.moveX;
    const my = controls.moveY;
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const speed = run.character.baseSpeedPx * run.stats.speed * this.speedMult;
      this.x += mx * speed * dt;
      this.y += my * speed * dt;
      if (Math.abs(mx) > 0.15) this.sprite.setFlipX(mx < 0);
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my) || 1;
        run.facingX = mx / len;
        run.facingY = my / len;
      }
      // VS-style walk wobble: slight rotation + bob, no extra frames needed.
      this.wobbleT += dt * 11;
      this.sprite.setRotation(Math.sin(this.wobbleT) * 0.09);
      this.sprite.y = this.y - Math.abs(Math.sin(this.wobbleT)) * 1.2;
    } else {
      this.wobbleT = 0;
      this.sprite.setRotation(0);
      this.sprite.y = this.y;
    }
    this.sprite.x = this.x;
    this.shadow.setPosition(this.x, this.y + 3);

    // Regen + i-frame decay.
    if (run.stats.regen > 0 && run.hp < run.stats.maxHp) {
      run.hp = Math.min(run.stats.maxHp, run.hp + run.stats.regen * dt);
    }
    if (run.iframes > 0) {
      run.iframes -= dt;
      this.sprite.setAlpha(Math.sin(run.time * 40) > 0 ? 0.35 : 1);
      if (run.iframes <= 0) this.sprite.setAlpha(run.detargeted ? 0.5 : 1);
    }
  }

  /** Returns true if the hit landed (not phased/invulnerable). */
  takeDamage(amount: number): boolean {
    const run = this.run;
    if (run.iframes > 0 || run.phasing || run.dead) return false;
    const dmg = Math.max(1, amount - run.stats.armor);
    run.hp -= dmg;
    run.iframes = PLAYER_IFRAMES;
    if (run.hp <= 0) {
      run.hp = 0;
      run.dead = true;
    }
    return true;
  }
}
