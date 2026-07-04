import Phaser from 'phaser';
import { ABILITIES } from '../data/abilities';
import type { AbilityDef, AbilityId } from '../types';
import { consumeAbilityPress } from './Controls';
import type { EnemySystem } from './EnemySystem';
import type { PlayerController } from './PlayerController';
import type { RunState } from './RunState';

interface ActiveEffect {
  def: AbilityDef;
  remaining: number;
}

/** Manual left-thumb abilities: cooldowns, durations, tagged-union effects. */
export class AbilitySystem {
  readonly slots: AbilityDef[] = [];
  private run: RunState;
  private enemies: EnemySystem;
  private player: PlayerController;
  private active: ActiveEffect[] = [];
  private dashTime = 0;
  private dashDx = 0;
  private dashDy = 0;
  onCast: ((def: AbilityDef) => void) | null = null;
  onPulseVisual: ((x: number, y: number, radius: number, tint: number) => void) | null = null;

  constructor(
    run: RunState,
    enemies: EnemySystem,
    player: PlayerController,
    extraSlot: AbilityId | null,
  ) {
    this.run = run;
    this.enemies = enemies;
    this.player = player;
    this.slots.push(ABILITIES[run.character.abilities[0]], ABILITIES[run.character.abilities[1]]);
    if (extraSlot) this.slots.push(ABILITIES[extraSlot]);
  }

  update(dt: number): void {
    // Cooldowns tick in real time (unaffected by prescience).
    for (let i = 0; i < this.slots.length; i++) {
      if (this.run.abilityCooldowns[i]! > 0) {
        this.run.abilityCooldowns[i] = Math.max(0, this.run.abilityCooldowns[i]! - dt);
      }
      if (consumeAbilityPress(i as 0 | 1 | 2) && this.run.abilityCooldowns[i] === 0 && !this.run.dead) {
        this.cast(i);
      }
    }

    // Active durations.
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]!;
      fx.remaining -= dt;
      if (fx.remaining <= 0) {
        this.expire(fx.def);
        this.active.splice(i, 1);
      }
    }

    // Dash motion.
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      const step = 360 * dt;
      this.player.x += this.dashDx * step;
      this.player.y += this.dashDy * step;
      // Carve through everything along the path.
      this.enemies.grid.forEachInRadius(this.player.x, this.player.y, 16, (j) => {
        const e = this.enemies.at(j);
        if (!e.active || e.hitFlash > 0) return;
        this.enemies.damage(e, this.dashDamage, 120, this.player.x - this.dashDx, this.player.y - this.dashDy);
      });
      if (this.dashTime <= 0) this.run.phasing = this.hasEffect('speedPhase');
    }
  }

  private dashDamage = 0;

  private hasEffect(kind: string): boolean {
    return this.active.some((a) => a.def.effect.kind === kind);
  }

  private cast(i: number): void {
    const def = this.slots[i]!;
    this.run.abilityCooldowns[i] = def.cooldown;
    this.run.abilityDurations[i] = def.duration;
    this.onCast?.(def);

    const fx = def.effect;
    const px = this.player.x;
    const py = this.player.y;

    switch (fx.kind) {
      case 'worldSlow': {
        this.run.worldTimeScale = fx.factor;
        this.active.push({ def, remaining: def.duration });
        break;
      }
      case 'coneStun': {
        const angle = Math.atan2(this.run.facingY, this.run.facingX);
        const half = (fx.halfAngleDeg * Math.PI) / 180;
        this.enemies.grid.forEachInRadius(px, py, fx.range, (j, dx, dy) => {
          const e = this.enemies.at(j);
          if (!e.active) return;
          const a = Math.atan2(dy, dx);
          if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) < half) {
            e.stun = Math.max(e.stun, fx.stunSec);
            if (fx.damage > 0) this.enemies.damage(e, fx.damage * this.run.stats.might);
          }
        });
        this.onPulseVisual?.(px + Math.cos(angle) * fx.range * 0.5, py + Math.sin(angle) * fx.range * 0.5, fx.range * 0.6, def.color);
        break;
      }
      case 'aoeStun': {
        this.enemies.grid.forEachInRadius(px, py, fx.radius, (j) => {
          const e = this.enemies.at(j);
          if (!e.active) return;
          e.stun = Math.max(e.stun, fx.stunSec);
          if (fx.damage > 0) this.enemies.damage(e, fx.damage * this.run.stats.might);
        });
        this.onPulseVisual?.(px, py, fx.radius, def.color);
        break;
      }
      case 'speedPhase': {
        this.player.speedMult = fx.speedMult;
        this.run.phasing = true;
        this.active.push({ def, remaining: def.duration });
        break;
      }
      case 'damageBuff': {
        this.run.damageBuffMult = fx.damageMult;
        this.run.attackSpeedMult = fx.attackSpeedMult;
        this.active.push({ def, remaining: def.duration });
        break;
      }
      case 'knockbackRing': {
        this.enemies.grid.forEachInRadius(px, py, fx.radius, (j) => {
          const e = this.enemies.at(j);
          if (!e.active) return;
          this.enemies.damage(e, fx.damage * this.run.stats.might, fx.force, px, py);
        });
        this.onPulseVisual?.(px, py, fx.radius, def.color);
        break;
      }
      case 'detarget': {
        this.run.detargeted = true;
        this.player.sprite.setAlpha(0.45);
        this.active.push({ def, remaining: def.duration });
        break;
      }
      case 'dash': {
        const len = Math.hypot(this.run.facingX, this.run.facingY) || 1;
        this.dashDx = this.run.facingX / len;
        this.dashDy = this.run.facingY / len;
        this.dashTime = def.duration;
        this.dashDamage = fx.damage * this.run.stats.might;
        this.run.phasing = true;
        this.active.push({ def, remaining: def.duration + 0.05 });
        break;
      }
    }
  }

  private expire(def: AbilityDef): void {
    switch (def.effect.kind) {
      case 'worldSlow':
        this.run.worldTimeScale = 1;
        break;
      case 'speedPhase':
        this.player.speedMult = 1;
        this.run.phasing = this.dashTime > 0;
        break;
      case 'damageBuff':
        this.run.damageBuffMult = 1;
        this.run.attackSpeedMult = 1;
        break;
      case 'detarget':
        this.run.detargeted = false;
        if (this.run.iframes <= 0) this.player.sprite.setAlpha(1);
        break;
      case 'dash':
        this.run.phasing = this.hasEffect('speedPhase');
        break;
      default:
        break;
    }
  }
}
