import type { CharacterDef, MapDef, PassiveId, Stats, WeaponId } from '../types';
import { xpToNext } from '../data/balance';

export interface EquippedWeapon {
  id: WeaponId;
  level: number;
  /** Seconds until next volley. */
  timer: number;
}

/** Central mutable state for one run. Systems read/write this, UI observes it. */
export class RunState {
  readonly character: CharacterDef;
  readonly map: MapDef;

  /** Resolved stat block: base * meta bonuses + in-run boosts. */
  stats: Stats;
  hp: number;
  level = 1;
  xp = 0;
  xpNeeded = xpToNext(1);
  kills = 0;
  gemsCollected = 0;
  /** Run clock in seconds (excludes pauses and level-up overlays). */
  time = 0;
  weapons: EquippedWeapon[] = [];
  passives = new Map<PassiveId, number>();

  /** Ability slots (2 base, 3rd via meta capstone). */
  abilityCooldowns: number[] = [0, 0, 0];
  abilityDurations: number[] = [0, 0, 0];

  /** Transient combat flags. */
  iframes = 0;
  phasing = false;
  detargeted = false;
  /** Enemy/projectile time scale (Paul's prescience). */
  worldTimeScale = 1;
  damageBuffMult = 1;
  attackSpeedMult = 1;
  facingX = 1;
  facingY = 0;
  bossActive = false;
  bossDefeated = false;
  dead = false;

  constructor(character: CharacterDef, map: MapDef, metaStats: Partial<Stats>) {
    this.character = character;
    this.map = map;
    this.stats = { ...character.base };
    // Meta bonuses: multiplicative for multipliers, additive for flats.
    for (const [k, v] of Object.entries(metaStats) as Array<[keyof Stats, number]>) {
      if (k === 'maxHp') this.stats.maxHp = Math.round(this.stats.maxHp * (1 + v));
      else if (k === 'magnet' || k === 'regen' || k === 'armor') this.stats[k] += v;
      else if (k === 'cooldown') this.stats.cooldown *= 1 - v;
      else this.stats[k] *= 1 + v;
    }
    this.hp = this.stats.maxHp;
    this.weapons.push({ id: character.startWeapon, level: 1, timer: 0.5 });
  }

  /** Weapon damage multiplier including character innates and buffs. */
  damageMult(weaponId: WeaponId): number {
    let m = this.stats.might * this.damageBuffMult;
    const innate = this.character.innate;
    if (innate?.weapon === weaponId && innate.damageMult) m *= innate.damageMult;
    return m;
  }

  addXp(amount: number): boolean {
    this.xp += amount * this.stats.xpGain;
    if (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level += 1;
      this.xpNeeded = xpToNext(this.level);
      return true;
    }
    return false;
  }
}
