import type { PassiveId, StatKey, UpgradeOption, WeaponId } from '../types';
import { WEAPONS, STARTABLE_WEAPONS, MAX_WEAPONS, MAX_PASSIVES } from './weapons';
import { RUN_BOOSTS } from './balance';
import type { RunState } from '../systems/RunState';
import { weaponStatsAt } from '../systems/WeaponSystem';
import { globalRng } from '../util/rng';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  desc: string;
  maxLevel: number;
  icon: string;
  /** Applies ONE level's worth of effect to run stats. */
  apply: (run: RunState) => void;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  shield_belt: {
    id: 'shield_belt',
    name: 'Holtzman Shield Belt',
    desc: '+2 armor. The slow blade penetrates.',
    maxLevel: 3,
    icon: 'ic_shield',
    apply: (run) => {
      run.stats.armor += 2;
    },
  },
  stillsuit: {
    id: 'stillsuit',
    name: 'Stillsuit',
    desc: '+0.6 HP/s regen. Waste not a drop.',
    maxLevel: 3,
    icon: 'ic_swirl',
    apply: (run) => {
      run.stats.regen += 0.6;
    },
  },
  spice_melange: {
    id: 'spice_melange',
    name: 'Spice Melange',
    desc: '+8% damage. The spice extends awareness.',
    maxLevel: 3,
    icon: 'ic_eye',
    apply: (run) => {
      run.stats.might *= 1.08;
    },
  },
  fremkit: {
    id: 'fremkit',
    name: 'Fremkit',
    desc: '+10% area. Desert survival tools.',
    maxLevel: 3,
    icon: 'ic_knife',
    apply: (run) => {
      run.stats.area *= 1.1;
    },
  },
  filmbook: {
    id: 'filmbook',
    name: 'Filmbook',
    desc: '+10% XP gain. Knowledge is power.',
    maxLevel: 3,
    icon: 'ic_note',
    apply: (run) => {
      run.stats.xpGain *= 1.1;
    },
  },
};

const STAT_BOOSTS: Array<{ stat: StatKey; title: string; desc: string; icon: string }> = [
  { stat: 'might', title: 'Sharpened Edge', desc: `+${RUN_BOOSTS.might * 100}% damage`, icon: 'ic_knife' },
  { stat: 'maxHp', title: 'Water Discipline', desc: `+${RUN_BOOSTS.maxHp} max HP`, icon: 'ic_shield' },
  { stat: 'speed', title: 'Sand Walk', desc: `+${Math.round(RUN_BOOSTS.speed * 100)}% move speed`, icon: 'ic_rush' },
  { stat: 'cooldown', title: 'Battle Trance', desc: `${Math.round(RUN_BOOSTS.cooldown * 100)}% faster attacks`, icon: 'ic_fist' },
  { stat: 'area', title: 'Wide Arc', desc: `+${Math.round(RUN_BOOSTS.area * 100)}% attack area`, icon: 'ic_swirl' },
  { stat: 'magnet', title: 'Spice Sense', desc: `+${RUN_BOOSTS.magnet}px pickup range`, icon: 'ic_eye' },
];

/** Roll 3 distinct level-up options for the current run state. */
export function rollUpgradeOptions(run: RunState): UpgradeOption[] {
  const options: Array<{ opt: UpgradeOption; weight: number }> = [];

  // Weapon level-ups.
  for (const w of run.weapons) {
    const def = WEAPONS[w.id];
    if (w.level < def.maxLevel) {
      const next = weaponStatsAt(def, w.level + 1);
      const cur = weaponStatsAt(def, w.level);
      const parts: string[] = [];
      if (next.damage !== cur.damage) parts.push(`+${next.damage - cur.damage} dmg`);
      if (next.count !== cur.count) parts.push(`+${next.count - cur.count} shot`);
      if (next.cooldown !== cur.cooldown) parts.push('faster');
      if (next.area !== cur.area) parts.push('bigger');
      if (next.pierce !== cur.pierce) parts.push('pierce');
      options.push({
        weight: 30,
        opt: {
          id: `wl_${w.id}`,
          kind: 'weaponLevel',
          weapon: w.id,
          title: `${def.name} LV${w.level + 1}`,
          desc: parts.join(', ') || 'improved',
          icon: def.projectileSprite,
        },
      });
    }
  }

  // New weapons.
  if (run.weapons.length < MAX_WEAPONS) {
    for (const id of STARTABLE_WEAPONS) {
      if (run.weapons.some((w) => w.id === id)) continue;
      const def = WEAPONS[id as WeaponId];
      options.push({
        weight: 18,
        opt: {
          id: `wn_${id}`,
          kind: 'weaponNew',
          weapon: id,
          title: def.name,
          desc: def.desc,
          icon: def.projectileSprite,
        },
      });
    }
  }

  // Passives.
  for (const p of Object.values(PASSIVES)) {
    const lvl = run.passives.get(p.id) ?? 0;
    if (lvl >= p.maxLevel) continue;
    if (lvl === 0 && run.passives.size >= MAX_PASSIVES) continue;
    options.push({
      weight: lvl > 0 ? 20 : 14,
      opt: {
        id: `ps_${p.id}`,
        kind: 'passive',
        passive: p.id,
        title: lvl > 0 ? `${p.name} LV${lvl + 1}` : p.name,
        desc: p.desc,
        icon: p.icon,
      },
    });
  }

  // Stat boosts.
  for (const b of STAT_BOOSTS) {
    options.push({
      weight: 8,
      opt: {
        id: `sb_${b.stat}`,
        kind: 'statBoost',
        stat: b.stat,
        title: b.title,
        desc: b.desc,
        icon: b.icon,
      },
    });
  }

  // Heal (only when hurt).
  if (run.hp < run.stats.maxHp * 0.7) {
    options.push({
      weight: 12,
      opt: {
        id: 'heal',
        kind: 'heal',
        title: 'Water of Life',
        desc: 'Restore 40 HP',
        icon: 'ic_eye',
      },
    });
  }

  // Weighted sample without replacement.
  const picked: UpgradeOption[] = [];
  const pool = [...options];
  while (picked.length < 3 && pool.length > 0) {
    const total = pool.reduce((s, o) => s + o.weight, 0);
    let roll = globalRng.range(0, total);
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i]!.weight;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool[idx]!.opt);
    pool.splice(idx, 1);
  }
  return picked;
}

/** Apply a chosen upgrade to the run. */
export function applyUpgrade(run: RunState, opt: UpgradeOption): void {
  switch (opt.kind) {
    case 'weaponLevel': {
      const w = run.weapons.find((x) => x.id === opt.weapon);
      if (w) w.level++;
      break;
    }
    case 'weaponNew': {
      if (opt.weapon) run.weapons.push({ id: opt.weapon, level: 1, timer: 0.3 });
      break;
    }
    case 'passive': {
      if (opt.passive) {
        const lvl = (run.passives.get(opt.passive) ?? 0) + 1;
        run.passives.set(opt.passive, lvl);
        PASSIVES[opt.passive].apply(run);
      }
      break;
    }
    case 'statBoost': {
      const s = opt.stat!;
      if (s === 'maxHp') {
        run.stats.maxHp += RUN_BOOSTS.maxHp;
        run.hp += RUN_BOOSTS.maxHp;
      } else if (s === 'magnet') {
        run.stats.magnet += RUN_BOOSTS.magnet;
      } else if (s === 'cooldown') {
        run.stats.cooldown *= 1 - RUN_BOOSTS.cooldown;
      } else if (s === 'might') {
        run.stats.might *= 1 + RUN_BOOSTS.might;
      } else if (s === 'speed') {
        run.stats.speed *= 1 + RUN_BOOSTS.speed;
      } else if (s === 'area') {
        run.stats.area *= 1 + RUN_BOOSTS.area;
      }
      break;
    }
    case 'heal': {
      run.hp = Math.min(run.stats.maxHp, run.hp + 40);
      break;
    }
  }
}

/** Evolution check: max-level weapon + required passive → evolved weapon. */
export function availableEvolution(run: RunState): { from: WeaponId; into: WeaponId } | null {
  for (const w of run.weapons) {
    const def = WEAPONS[w.id];
    if (!def.evolution) continue;
    if (w.level >= def.maxLevel && (run.passives.get(def.evolution.requiresPassive) ?? 0) > 0) {
      return { from: w.id, into: def.evolution.into };
    }
  }
  return null;
}
