import Phaser from 'phaser';
import { PERF } from '../config';
import { ATLAS } from '../gfx/AtlasBuilder';
import type { EnemySystem } from './EnemySystem';
import type { RunState } from './RunState';
import type { PlayerController } from './PlayerController';

interface Projectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  life: number;
  homing: boolean;
  speed: number;
  /** Enemy indices already hit (avoid double-hit while piercing). */
  hitMask: Set<number>;
  sprite: Phaser.GameObjects.Image;
}

interface EnemyShot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  sprite: Phaser.GameObjects.Image;
}

export class ProjectileSystem {
  private pool: Projectile[] = [];
  private shots: EnemyShot[] = [];
  private run: RunState;
  private enemies: EnemySystem;
  private player: PlayerController;
  onHit: ((x: number, y: number, damage: number) => void) | null = null;

  constructor(scene: Phaser.Scene, run: RunState, enemies: EnemySystem, player: PlayerController) {
    this.run = run;
    this.enemies = enemies;
    this.player = player;
    for (let i = 0; i < PERF.maxProjectiles; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        damage: 0,
        pierce: 0,
        life: 0,
        homing: false,
        speed: 0,
        hitMask: new Set(),
        sprite: scene.add.image(0, 0, ATLAS, 'pr_dart').setVisible(false).setDepth(12),
      });
    }
    for (let i = 0; i < 60; i++) {
      this.shots.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        damage: 0,
        life: 0,
        sprite: scene.add.image(0, 0, ATLAS, 'fx_dot3').setVisible(false).setDepth(12).setTint(0xff9433),
      });
    }
  }

  fire(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    opts: { sprite: string; damage: number; speed: number; life: number; pierce: number; homing?: boolean },
  ): void {
    let p: Projectile | null = null;
    for (const cand of this.pool) {
      if (!cand.active) {
        p = cand;
        break;
      }
    }
    if (!p) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = dirX * opts.speed;
    p.vy = dirY * opts.speed;
    p.speed = opts.speed;
    p.damage = opts.damage;
    p.pierce = opts.pierce;
    p.life = opts.life;
    p.homing = opts.homing ?? false;
    p.hitMask.clear();
    p.sprite
      .setTexture(ATLAS, opts.sprite)
      .setVisible(true)
      .setRotation(Math.atan2(dirY, dirX))
      .setPosition(x, y);
  }

  fireEnemyShot(x: number, y: number, tx: number, ty: number, speed: number, damage: number): void {
    let s: EnemyShot | null = null;
    for (const cand of this.shots) {
      if (!cand.active) {
        s = cand;
        break;
      }
    }
    if (!s) return;
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    s.active = true;
    s.x = x;
    s.y = y;
    s.vx = (dx / len) * speed;
    s.vy = (dy / len) * speed;
    s.damage = damage;
    s.life = 4;
    s.sprite.setVisible(true).setPosition(x, y);
  }

  update(dt: number): void {
    const wdt = dt * this.run.worldTimeScale;

    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.setVisible(false);
        continue;
      }

      if (p.homing) {
        const target = this.enemies.grid.nearest(p.x, p.y, 160);
        if (target !== -1) {
          const e = this.enemies.at(target);
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          // Steer toward target, keeping speed constant.
          p.vx += (dx / len) * p.speed * 4 * dt;
          p.vy += (dy / len) * p.speed * 4 * dt;
          const v = Math.hypot(p.vx, p.vy) || 1;
          p.vx = (p.vx / v) * p.speed;
          p.vy = (p.vy / v) * p.speed;
          p.sprite.setRotation(Math.atan2(p.vy, p.vx));
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);

      // Hit detection against enemies.
      let dead = false;
      this.enemies.grid.forEachInRadius(p.x, p.y, 9, (i) => {
        if (p.hitMask.has(i)) return;
        const e = this.enemies.at(i);
        if (!e.active) return;
        p.hitMask.add(i);
        const dealt = this.enemies.damage(e, p.damage, 40, p.x - p.vx * 0.01, p.y - p.vy * 0.01);
        this.onHit?.(e.x, e.y, dealt);
        if (p.pierce <= 0) {
          dead = true;
          return true;
        }
        p.pierce--;
      });
      if (dead) {
        p.active = false;
        p.sprite.setVisible(false);
      }
    }

    // Enemy shots vs player.
    const px = this.player.x;
    const py = this.player.y;
    for (const s of this.shots) {
      if (!s.active) continue;
      s.life -= wdt;
      s.x += s.vx * wdt;
      s.y += s.vy * wdt;
      s.sprite.setPosition(s.x, s.y);
      if (s.life <= 0) {
        s.active = false;
        s.sprite.setVisible(false);
        continue;
      }
      const dx = s.x - px;
      const dy = s.y - py;
      if (dx * dx + dy * dy < 64 && !this.run.phasing) {
        this.player.takeDamage(s.damage);
        s.active = false;
        s.sprite.setVisible(false);
      }
    }
  }
}
