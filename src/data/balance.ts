/** Every tuning formula in one place. t is run time in MINUTES unless noted. */

import { clamp } from '../util/math';

/** In-run XP needed to go from level L to L+1. */
export function xpToNext(level: number): number {
  return Math.round(8 + 7 * (level - 1) + 2 * Math.pow(level - 1, 1.35));
}

/**
 * Enemy HP scale over run time: piecewise-linear with soft caps.
 * Late-run pressure comes from spawn density, not sponges.
 */
export function hpScale(tMin: number): number {
  if (tMin <= 10) return 1 + 0.1 * tMin;
  if (tMin <= 16) return 2.0 + 0.05 * (tMin - 10);
  return 2.3 + 0.025 * (tMin - 16);
}

/** Enemy damage scale, hard-capped at 2.5x. */
export function dmgScale(tMin: number): number {
  return Math.min(1 + 0.05 * tMin, 2.5);
}

/** Spawn rate multiplier over run time. */
export function spawnRateScale(tMin: number): number {
  return 1 + 0.03 * tMin;
}

/** Elite modifiers. */
export const ELITE = {
  hpMult: 10,
  dmgMult: 1.5,
  sizeMult: 1.7,
  xpMult: 12,
  speedMult: 0.85,
} as const;

/** Meta XP awarded for a run. */
export function metaXpForRun(kills: number, secondsSurvived: number, bossKilled: boolean): number {
  return Math.round(kills * 1 + (secondsSurvived / 60) * 20 + (bossKilled ? 300 : 0));
}

/** Meta XP needed to go from character level L to L+1. */
export function metaXpToNext(level: number): number {
  return 150 + 100 * (level - 1) + 10 * (level - 1) * (level - 1);
}

export const META_LEVEL_CAP = 40;

/** Per-stat cap on meta-tree bonuses so meta never trivializes scaling. */
export const META_STAT_CAP = 0.5;

/** Player i-frame duration after a hit (seconds). */
export const PLAYER_IFRAMES = 0.5;

/** Base player pickup radius (px), before magnet stat. */
export const BASE_MAGNET = 24;

/** Gem merge: when more than this many gems are live, merge clusters. */
export const GEM_MERGE_THRESHOLD = 140;

/** XP gem values by tier. */
export const GEM_TIERS = [1, 2, 4, 8, 25] as const;

/** In-run stat boost option magnitudes (applied multiplicatively/additively). */
export const RUN_BOOSTS = {
  might: 0.1,
  maxHp: 15,
  speed: 0.07,
  cooldown: 0.06,
  area: 0.08,
  magnet: 12,
  regen: 0.4,
  armor: 1,
  xpGain: 0.08,
} as const;

/** Convert overflow spawn budget into elite pressure when at the active cap. */
export function overflowEliteChance(overflow: number): number {
  return clamp(overflow * 0.02, 0, 0.35);
}
