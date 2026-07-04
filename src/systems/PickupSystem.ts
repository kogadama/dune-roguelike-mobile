import Phaser from 'phaser';
import { PERF } from '../config';
import { ATLAS } from '../gfx/AtlasBuilder';
import type { RunState } from './RunState';
import type { PlayerController } from './PlayerController';

type PickupKind = 'gem' | 'water' | 'chest';

interface Pickup {
  active: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  /** Pull velocity while magnetized. */
  vel: number;
  sprite: Phaser.GameObjects.Image;
}

export class PickupSystem {
  private pool: Pickup[] = [];
  private run: RunState;
  private player: PlayerController;
  onLevelUp: (() => void) | null = null;
  onChest: (() => void) | null = null;
  onCollect: ((kind: PickupKind) => void) | null = null;

  constructor(scene: Phaser.Scene, run: RunState, player: PlayerController) {
    this.run = run;
    this.player = player;
    for (let i = 0; i < PERF.maxGems; i++) {
      this.pool.push({
        active: false,
        kind: 'gem',
        x: 0,
        y: 0,
        value: 1,
        vel: 0,
        sprite: scene.add.image(0, 0, ATLAS, 'pk_gem').setVisible(false).setDepth(3),
      });
    }
  }

  spawnGem(x: number, y: number, value: number): void {
    let p: Pickup | null = null;
    for (const cand of this.pool) {
      if (!cand.active) {
        p = cand;
        break;
      }
    }
    if (!p) {
      // Pool exhausted: fold the value into the nearest live gem.
      let best: Pickup | null = null;
      let bestD = Infinity;
      for (const g of this.pool) {
        if (g.active && g.kind === 'gem') {
          const d = Math.abs(g.x - x) + Math.abs(g.y - y);
          if (d < bestD) {
            bestD = d;
            best = g;
          }
        }
      }
      if (best) {
        best.value += value;
        best.sprite.setTexture(ATLAS, best.value >= 8 ? 'pk_gem_big' : 'pk_gem');
      }
      return;
    }
    p.active = true;
    p.kind = 'gem';
    p.x = x;
    p.y = y;
    p.value = value;
    p.vel = 0;
    p.sprite.setTexture(ATLAS, value >= 8 ? 'pk_gem_big' : 'pk_gem').setVisible(true).setPosition(x, y).setScale(1);
  }

  spawnSpecial(x: number, y: number, kind: 'water' | 'chest'): void {
    let p: Pickup | null = null;
    for (const cand of this.pool) {
      if (!cand.active) {
        p = cand;
        break;
      }
    }
    if (!p) return;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.value = kind === 'water' ? 30 : 0;
    p.vel = 0;
    p.sprite
      .setTexture(ATLAS, kind === 'water' ? 'pk_water' : 'pk_chest')
      .setVisible(true)
      .setPosition(x, y)
      .setScale(1);
  }

  update(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const magnetR = this.run.stats.magnet;

    for (const p of this.pool) {
      if (!p.active) continue;
      const dx = px - p.x;
      const dy = py - p.y;
      const d = Math.hypot(dx, dy);

      const pullR = p.kind === 'gem' ? magnetR : 18;
      if (d < pullR || p.vel > 0) {
        p.vel = Math.min(p.vel + 900 * dt, 420);
        if (d > 0.5) {
          p.x += (dx / d) * p.vel * dt;
          p.y += (dy / d) * p.vel * dt;
        }
        p.sprite.setPosition(p.x, p.y);
      }

      if (d < 9) {
        p.active = false;
        p.sprite.setVisible(false);
        this.onCollect?.(p.kind);
        if (p.kind === 'gem') {
          this.run.gemsCollected++;
          if (this.run.addXp(p.value)) this.onLevelUp?.();
        } else if (p.kind === 'water') {
          this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + p.value);
        } else {
          this.onChest?.();
        }
      }
    }
  }
}
