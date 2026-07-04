import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons';
import type { WeaponDef } from '../types';
import { ATLAS } from '../gfx/AtlasBuilder';
import type { EnemySystem } from './EnemySystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { RunState, EquippedWeapon } from './RunState';
import type { PlayerController } from './PlayerController';
import { globalRng } from '../util/rng';

export interface ResolvedWeaponStats {
  damage: number;
  cooldown: number;
  count: number;
  pierce: number;
  area: number;
  speed: number;
  duration: number;
}

/** Weapon stats at a level, before run-stat modifiers. */
export function weaponStatsAt(def: WeaponDef, level: number): ResolvedWeaponStats {
  const s: ResolvedWeaponStats = { ...def.base };
  for (let l = 2; l <= level; l++) {
    const d = def.perLevel[l - 2];
    if (!d) break;
    s.damage += d.damage ?? 0;
    s.cooldown += d.cooldown ?? 0;
    s.count += d.count ?? 0;
    s.pierce += d.pierce ?? 0;
    s.area += d.area ?? 0;
    s.speed += d.speed ?? 0;
    s.duration += d.duration ?? 0;
  }
  s.cooldown = Math.max(0.25, s.cooldown);
  return s;
}

export class WeaponSystem {
  private scene: Phaser.Scene;
  private run: RunState;
  private enemies: EnemySystem;
  private projectiles: ProjectileSystem;
  private player: PlayerController;
  onSlash: ((x: number, y: number, angle: number, reach: number) => void) | null = null;
  onBeam: ((x: number, y: number, angle: number, length: number) => void) | null = null;
  onPulse: ((x: number, y: number, radius: number) => void) | null = null;
  onHit: ((x: number, y: number, damage: number) => void) | null = null;
  onFire: ((weaponId: string) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    run: RunState,
    enemies: EnemySystem,
    projectiles: ProjectileSystem,
    player: PlayerController,
  ) {
    this.scene = scene;
    this.run = run;
    this.enemies = enemies;
    this.projectiles = projectiles;
    this.player = player;
  }

  update(dt: number): void {
    for (const w of this.run.weapons) {
      w.timer -= dt * this.run.attackSpeedMult;
      if (w.timer <= 0) {
        const def = WEAPONS[w.id];
        const stats = this.resolve(def, w);
        w.timer += stats.cooldown;
        this.fire(def, stats);
        this.onFire?.(def.id);
      }
    }
  }

  private resolve(def: WeaponDef, w: EquippedWeapon): ResolvedWeaponStats {
    const s = weaponStatsAt(def, w.level);
    s.damage *= this.run.damageMult(def.id);
    s.cooldown *= this.run.stats.cooldown;
    s.area *= this.run.stats.area;
    return s;
  }

  private fire(def: WeaponDef, s: ResolvedWeaponStats): void {
    const px = this.player.x;
    const py = this.player.y;
    switch (def.behavior) {
      case 'meleeArc': {
        // Slash toward nearest enemy (falls back to facing).
        const reach = 34 * s.area;
        for (let i = 0; i < s.count; i++) {
          const target = this.enemies.grid.nearest(px, py, 140);
          let angle: number;
          if (target !== -1) {
            const e = this.enemies.at(target);
            angle = Math.atan2(e.y - py, e.x - px);
          } else {
            angle = Math.atan2(this.run.facingY, this.run.facingX);
          }
          angle += i * ((Math.PI * 2) / Math.max(2, s.count)) * (i > 0 ? 1 : 0);
          const delay = i * 90;
          this.scene.time.delayedCall(delay, () => {
            if (this.run.dead) return;
            this.slashAt(angle, reach, s.damage);
          });
        }
        break;
      }
      case 'nearestDart': {
        for (let i = 0; i < s.count; i++) {
          const target = this.enemies.grid.nearest(px, py, 260);
          let dx: number;
          let dy: number;
          if (target !== -1) {
            const e = this.enemies.at(target);
            const spread = (i - (s.count - 1) / 2) * 0.12;
            const base = Math.atan2(e.y - py, e.x - px) + spread;
            dx = Math.cos(base);
            dy = Math.sin(base);
          } else {
            const a = globalRng.range(0, Math.PI * 2);
            dx = Math.cos(a);
            dy = Math.sin(a);
          }
          this.projectiles.fire(px, py, dx, dy, {
            sprite: def.projectileSprite,
            damage: s.damage,
            speed: s.speed,
            life: s.duration,
            pierce: s.pierce,
          });
        }
        break;
      }
      case 'fan': {
        const base = Math.atan2(this.run.facingY, this.run.facingX);
        const spread = Math.PI / 5;
        for (let i = 0; i < s.count; i++) {
          const t = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
          const a = base + t * spread * 2;
          this.projectiles.fire(px, py, Math.cos(a), Math.sin(a), {
            sprite: def.projectileSprite,
            damage: s.damage,
            speed: s.speed,
            life: s.duration,
            pierce: s.pierce,
          });
        }
        break;
      }
      case 'homing': {
        for (let i = 0; i < s.count; i++) {
          const a = globalRng.range(0, Math.PI * 2);
          this.projectiles.fire(px, py, Math.cos(a), Math.sin(a), {
            sprite: def.projectileSprite,
            damage: s.damage,
            speed: s.speed,
            life: s.duration,
            pierce: s.pierce,
            homing: true,
          });
        }
        break;
      }
      case 'beam': {
        const len = 130 * s.area;
        for (let i = 0; i < s.count; i++) {
          const target = this.enemies.grid.nearest(px, py, 300);
          let angle: number;
          if (target !== -1) {
            const e = this.enemies.at(target);
            angle = Math.atan2(e.y - py, e.x - px);
          } else {
            angle = Math.atan2(this.run.facingY, this.run.facingX);
          }
          if (i === 1) angle += Math.PI; // second beam covers your back
          if (i === 2) angle += Math.PI / 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          // Damage everything near the beam line.
          this.enemies.grid.forEachInRadius(px + cos * len * 0.5, py + sin * len * 0.5, len * 0.55, (j) => {
            const e = this.enemies.at(j);
            if (!e.active) return;
            // Perpendicular distance from beam line.
            const rx = e.x - px;
            const ry = e.y - py;
            const along = rx * cos + ry * sin;
            if (along < 0 || along > len) return;
            const perp = Math.abs(-rx * sin + ry * cos);
            if (perp < 7 + e.def.radius) {
              const dealt = this.enemies.damage(e, s.damage, 10, px, py);
              this.onHit?.(e.x, e.y, dealt);
            }
          });
          this.onBeam?.(px, py, angle, len);
        }
        break;
      }
      case 'aoePulse': {
        const radius = 46 * s.area;
        this.enemies.grid.forEachInRadius(px, py, radius, (j) => {
          const e = this.enemies.at(j);
          if (!e.active) return;
          const dealt = this.enemies.damage(e, s.damage, 90, px, py);
          this.onHit?.(e.x, e.y, dealt);
        });
        this.onPulse?.(px, py, radius);
        break;
      }
    }
  }

  private slashAt(angle: number, reach: number, damage: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const halfArc = Math.PI / 2.6;
    this.enemies.grid.forEachInRadius(px, py, reach + 6, (j) => {
      const e = this.enemies.at(j);
      if (!e.active) return;
      const a = Math.atan2(e.y - py, e.x - px);
      let diff = Math.abs(Phaser.Math.Angle.Wrap(a - angle));
      if (diff < halfArc) {
        const dealt = this.enemies.damage(e, damage, 70, px, py);
        this.onHit?.(e.x, e.y, dealt);
      }
    });
    this.onSlash?.(px, py, angle, reach);
  }
}

/** Lightweight weapon visuals owned by GameScene (slash sweeps, beams, pulses). */
export class WeaponVisuals {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < 24; i++) {
      this.pool.push(scene.add.image(0, 0, ATLAS, 'pr_crysknife').setVisible(false).setDepth(13));
    }
  }

  private obtain(): Phaser.GameObjects.Image | null {
    for (const s of this.pool) if (!s.visible) return s;
    return null;
  }

  slash(x: number, y: number, angle: number, reach: number): void {
    const img = this.obtain();
    if (!img) return;
    img
      .setTexture(ATLAS, 'pr_crysknife')
      .setVisible(true)
      .setAlpha(1)
      .setScale(1.4)
      .setPosition(x + Math.cos(angle - 0.6) * reach * 0.7, y + Math.sin(angle - 0.6) * reach * 0.7)
      .setRotation(angle + Math.PI / 4);
    this.scene.tweens.add({
      targets: img,
      x: x + Math.cos(angle + 0.6) * reach * 0.7,
      y: y + Math.sin(angle + 0.6) * reach * 0.7,
      rotation: angle + Math.PI / 4 + 1.2,
      alpha: 0,
      duration: 160,
      onComplete: () => img.setVisible(false).setScale(1),
    });
  }

  beam(x: number, y: number, angle: number, length: number, tint = 0xe03a2f): void {
    const img = this.obtain();
    if (!img) return;
    img
      .setTexture(ATLAS, 'fx_px')
      .setVisible(true)
      .setAlpha(1)
      .setTint(tint)
      .setOrigin(0, 0.5)
      .setPosition(x, y)
      .setRotation(angle)
      .setScale(length / 2, 1.5);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleY: 0.2,
      duration: 190,
      onComplete: () => {
        img.setVisible(false).setOrigin(0.5).setScale(1).setTint(0xffffff);
      },
    });
  }

  pulse(x: number, y: number, radius: number, tint = 0xffd23f): void {
    const img = this.obtain();
    if (!img) return;
    img
      .setTexture(ATLAS, 'fx_ring9')
      .setVisible(true)
      .setAlpha(0.9)
      .setTint(tint)
      .setPosition(x, y)
      .setScale(0.5);
    this.scene.tweens.add({
      targets: img,
      scale: (radius * 2) / 9,
      alpha: 0,
      duration: 320,
      onComplete: () => img.setVisible(false).setScale(1).setTint(0xffffff),
    });
  }
}
