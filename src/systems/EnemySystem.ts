import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { ELITE, dmgScale, hpScale } from '../data/balance';
import type { EnemyDef, EnemyId } from '../types';
import { PERF } from '../config';
import { ATLAS } from '../gfx/AtlasBuilder';
import { CollisionGrid } from './CollisionGrid';
import type { RunState } from './RunState';
import type { PlayerController } from './PlayerController';
import { globalRng } from '../util/rng';

export interface Enemy {
  active: boolean;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  elite: boolean;
  stun: number;
  /** Knockback velocity, decays fast. */
  kbx: number;
  kby: number;
  /** Ranged attack timer. */
  shotTimer: number;
  /** Strafe behavior: fixed flight vector. */
  fx: number;
  fy: number;
  wobble: number;
  sprite: Phaser.GameObjects.Image;
  hitFlash: number;
}

export class EnemySystem {
  readonly enemies: Enemy[] = [];
  readonly grid = new CollisionGrid(PERF.enemyPoolSize);
  activeCount = 0;
  private scene: Phaser.Scene;
  private run: RunState;
  private player: PlayerController;
  private deathEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  onDeath: ((e: Enemy) => void) | null = null;
  onEnemyShot: ((x: number, y: number, tx: number, ty: number, speed: number, damage: number) => void) | null = null;

  constructor(scene: Phaser.Scene, run: RunState, player: PlayerController) {
    this.scene = scene;
    this.run = run;
    this.player = player;
    for (let i = 0; i < PERF.enemyPoolSize; i++) {
      const sprite = scene.add.image(0, 0, ATLAS, 'en_trooper').setVisible(false).setDepth(8);
      this.enemies.push({
        active: false,
        def: ENEMIES.trooper,
        x: 0,
        y: 0,
        hp: 1,
        maxHp: 1,
        damage: 1,
        speed: 1,
        elite: false,
        stun: 0,
        kbx: 0,
        kby: 0,
        shotTimer: 0,
        fx: 0,
        fy: 0,
        wobble: Math.random() * Math.PI * 2,
        sprite,
        hitFlash: 0,
      });
    }
    this.deathEmitter = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_dot3',
      lifespan: 350,
      speed: { min: 20, max: 55 },
      scale: { start: 1, end: 0 },
      quantity: 5,
      emitting: false,
      tint: 0x8a1f18,
    });
    this.deathEmitter.setDepth(9);
  }

  spawn(id: EnemyId, x: number, y: number, elite = false): Enemy | null {
    if (!elite && this.activeCount >= PERF.maxEnemies) return null;
    const def = ENEMIES[id];
    let e: Enemy | null = null;
    for (const cand of this.enemies) {
      if (!cand.active) {
        e = cand;
        break;
      }
    }
    if (!e) return null;
    const tMin = this.run.time / 60;
    const hpMul = this.run.map.hpMult * hpScale(tMin) * (elite ? ELITE.hpMult : 1);
    const dmgMul = this.run.map.dmgMult * dmgScale(tMin) * (elite ? ELITE.dmgMult : 1);
    e.active = true;
    e.def = def;
    e.x = x;
    e.y = y;
    e.hp = e.maxHp = Math.round(def.hp * hpMul);
    e.damage = Math.round(def.damage * dmgMul);
    e.speed = def.speed * (elite ? ELITE.speedMult : 1) * (0.92 + globalRng.next() * 0.16);
    e.elite = elite;
    e.stun = 0;
    e.kbx = 0;
    e.kby = 0;
    e.shotTimer = def.ranged ? def.ranged.cooldown * (0.5 + globalRng.next() * 0.5) : 0;
    e.hitFlash = 0;
    if (def.behavior === 'strafe') {
      // Fly across the player's position.
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const len = Math.hypot(dx, dy) || 1;
      e.fx = dx / len;
      e.fy = dy / len;
    }
    e.sprite
      .setTexture(ATLAS, def.spriteKey)
      .setVisible(true)
      .setScale(elite ? ELITE.sizeMult : 1)
      .setTint(def.tint ?? 0xffffff)
      .setAlpha(1)
      .setRotation(0)
      .setOrigin(0.5, 0.7);
    if (elite) e.sprite.setTint(0xffd23f);
    this.activeCount++;
    return e;
  }

  /** Rebuild the spatial hash. Call once per frame before queries. */
  rebuildGrid(): void {
    this.grid.clear();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (e.active) this.grid.insert(i, e.x, e.y);
    }
  }

  update(dt: number): void {
    const run = this.run;
    const px = this.player.x;
    const py = this.player.y;
    const wdt = dt * run.worldTimeScale;
    const despawnR = Math.max(this.scene.scale.width, 800) * 1.2;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (!e.active) continue;

      const dxp = px - e.x;
      const dyp = py - e.y;
      const distP = Math.hypot(dxp, dyp) || 1;

      // Too far behind: recycle to the spawn ring ahead (bosses/flyers exempt).
      if (distP > despawnR && e.def.behavior !== 'boss' && e.def.behavior !== 'strafe') {
        const ang = Math.atan2(dyp, dxp) + (globalRng.next() - 0.5) * 1.2;
        const r = despawnR * 0.55;
        e.x = px + Math.cos(ang) * r;
        e.y = py + Math.sin(ang) * r;
        continue;
      }

      if (e.stun > 0) {
        e.stun -= wdt;
        e.sprite.setPosition(e.x, e.y);
        continue;
      }

      let mx = 0;
      let my = 0;
      const seekX = dxp / distP;
      const seekY = dyp / distP;
      const behavior = e.def.behavior;

      if (run.detargeted && behavior !== 'strafe') {
        // Sand camouflage: wander.
        e.wobble += wdt * 2;
        mx = Math.cos(e.wobble);
        my = Math.sin(e.wobble * 0.7);
      } else if (behavior === 'chase' || behavior === 'boss') {
        mx = seekX;
        my = seekY;
      } else if (behavior === 'swarmer') {
        e.wobble += wdt * 6;
        const s = Math.sin(e.wobble) * 0.5;
        mx = seekX - seekY * s;
        my = seekY + seekX * s;
      } else if (behavior === 'erratic') {
        e.wobble += wdt * 3.1;
        const s = Math.sin(e.wobble * 1.7) * 0.9;
        mx = seekX - seekY * s;
        my = seekY + seekX * s;
      } else if (behavior === 'chaseRanged') {
        const band = e.def.ranged?.range ?? 100;
        if (distP > band) {
          mx = seekX;
          my = seekY;
        } else if (distP < band * 0.7) {
          mx = -seekX;
          my = -seekY;
        }
        this.tickRanged(e, wdt, px, py);
      } else if (behavior === 'strafe') {
        mx = e.fx;
        my = e.fy;
        this.tickRanged(e, wdt, e.x + e.fx * 30, e.y + e.fy * 30);
        // Gone past and far away: retire.
        if (distP > despawnR * 0.8 && (e.fx * dxp + e.fy * dyp) < 0) {
          this.despawn(e);
          continue;
        }
      }

      // Local separation: sample neighbors in own cell radius.
      let sepX = 0;
      let sepY = 0;
      let sepN = 0;
      this.grid.forEachInRadius(e.x, e.y, 10, (j, dx, dy, d2) => {
        if (j === i || sepN >= 3) return sepN >= 3;
        if (d2 > 0.01) {
          const inv = 1 / Math.sqrt(d2);
          sepX -= dx * inv;
          sepY -= dy * inv;
          sepN++;
        }
      });
      if (sepN > 0) {
        mx += (sepX / sepN) * 0.6;
        my += (sepY / sepN) * 0.6;
        const len = Math.hypot(mx, my) || 1;
        mx /= len;
        my /= len;
      }

      e.x += (mx * e.speed + e.kbx) * wdt;
      e.y += (my * e.speed + e.kby) * wdt;
      e.kbx *= Math.exp(-8 * wdt);
      e.kby *= Math.exp(-8 * wdt);

      // Contact damage.
      const touchR = e.def.radius + 5;
      if (distP < touchR && !run.phasing) {
        if (this.player.takeDamage(e.damage)) {
          // Small self-knockback so hits read.
          e.kbx = -seekX * 60;
          e.kby = -seekY * 60;
        }
      }

      // Render.
      const s = e.sprite;
      s.setPosition(Math.round(e.x), Math.round(e.y));
      if (behavior !== 'strafe') s.setFlipX(dxp < 0);
      e.wobble += wdt * 9;
      s.setRotation(behavior === 'strafe' ? Math.atan2(e.fy, e.fx) * 0.15 : Math.sin(e.wobble) * 0.07);
      s.setDepth(5 + Phaser.Math.Clamp(e.y * 0.0001, -1, 1));
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        s.setTintFill(0xffffff);
        if (e.hitFlash <= 0) s.setTint(e.elite ? 0xffd23f : (e.def.tint ?? 0xffffff));
      }
    }
  }

  private tickRanged(e: Enemy, wdt: number, tx: number, ty: number): void {
    const r = e.def.ranged;
    if (!r || !this.onEnemyShot) return;
    e.shotTimer -= wdt;
    if (e.shotTimer <= 0) {
      e.shotTimer = r.cooldown;
      this.onEnemyShot(e.x, e.y, tx, ty, r.projSpeed, Math.round(r.damage * this.run.map.dmgMult * dmgScale(this.run.time / 60)));
    }
  }

  /** Apply damage; returns actual damage dealt. */
  damage(e: Enemy, amount: number, knockback = 0, fromX?: number, fromY?: number): number {
    if (!e.active) return 0;
    const dmg = Math.round(amount);
    e.hp -= dmg;
    e.hitFlash = 0.06;
    if (knockback > 0 && fromX !== undefined && fromY !== undefined) {
      const dx = e.x - fromX;
      const dy = e.y - fromY;
      const len = Math.hypot(dx, dy) || 1;
      const kb = e.def.behavior === 'boss' ? knockback * 0.15 : knockback;
      e.kbx += (dx / len) * kb;
      e.kby += (dy / len) * kb;
    }
    if (e.hp <= 0) this.kill(e);
    return dmg;
  }

  kill(e: Enemy): void {
    if (!e.active) return;
    this.run.kills++;
    this.deathEmitter.emitParticleAt(e.x, e.y, e.elite ? 12 : 5);
    this.onDeath?.(e);
    this.despawn(e);
  }

  despawn(e: Enemy): void {
    e.active = false;
    e.sprite.setVisible(false);
    this.activeCount--;
  }

  /** Enemy by grid index (grid indices are enemy array indices). */
  at(index: number): Enemy {
    return this.enemies[index]!;
  }
}
