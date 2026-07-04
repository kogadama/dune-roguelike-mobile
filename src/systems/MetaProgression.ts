import { META_LEVEL_CAP, META_STAT_CAP, metaXpToNext } from '../data/balance';
import { META_TREE } from '../data/metaTree';
import type { SaveManager } from '../save/SaveManager';
import type { CharacterId, Stats } from '../types';

export interface RunSummary {
  victory: boolean;
  kills: number;
  timeSec: number;
  mapId: string;
}

/** Award meta XP; returns number of levels gained. Persists via save(). */
export function addMetaXp(
  save: SaveManager,
  characterId: CharacterId,
  xp: number,
  run: RunSummary,
): number {
  const c = save.data.characters[characterId];
  c.xp += xp;
  c.runs += 1;
  if (run.victory) {
    c.wins += 1;
    if (run.mapId === 'arrakeen' && !save.data.unlockedMaps.includes('deep_desert')) {
      save.data.unlockedMaps.push('deep_desert');
    }
  }
  c.bestTimeSec = Math.max(c.bestTimeSec, run.timeSec);
  save.data.stats.totalKills += run.kills;
  save.data.stats.totalRuns += 1;
  save.data.stats.totalPlaySec += Math.round(run.timeSec);

  let gained = 0;
  while (c.level < META_LEVEL_CAP && c.xp >= metaXpToNext(c.level)) {
    c.xp -= metaXpToNext(c.level);
    c.level += 1;
    gained += 1;
  }
  save.save();
  return gained;
}

export function skillPointsAvailable(save: SaveManager, characterId: CharacterId): number {
  const c = save.data.characters[characterId];
  return Math.max(0, c.level - 1 - c.spentPoints);
}

/** Resolved meta-tree stat bonuses for a character (fractions, capped). */
export function metaStatsFor(save: SaveManager, characterId: CharacterId): Partial<Stats> {
  const c = save.data.characters[characterId];
  const out: Partial<Record<keyof Stats, number>> = {};
  for (const node of META_TREE) {
    if (node.character !== 'all' && node.character !== characterId) continue;
    const rank = c.nodes[node.id] ?? 0;
    if (rank <= 0 || node.effect.kind !== 'stat') continue;
    const key = node.effect.stat as keyof Stats;
    out[key] = (out[key] ?? 0) + node.effect.valuePerRank * rank;
  }
  // Cap fractional bonuses so meta never trivializes scaling.
  for (const k of Object.keys(out) as Array<keyof Stats>) {
    if (k !== 'magnet' && k !== 'regen' && k !== 'armor') {
      out[k] = Math.min(out[k]!, META_STAT_CAP);
    }
  }
  return out;
}

/** True if the character has unlocked their third ability slot. */
export function hasThirdSlot(save: SaveManager, characterId: CharacterId): boolean {
  const c = save.data.characters[characterId];
  return META_TREE.some(
    (n) =>
      (n.character === characterId || n.character === 'all') &&
      n.effect.kind === 'unlockAbilitySlot' &&
      (c.nodes[n.id] ?? 0) > 0,
  );
}

/** Attempt to buy one rank of a node. Returns false if blocked. */
export function buyNode(save: SaveManager, characterId: CharacterId, nodeId: string): boolean {
  const node = META_TREE.find((n) => n.id === nodeId);
  if (!node) return false;
  const c = save.data.characters[characterId];
  const rank = c.nodes[nodeId] ?? 0;
  if (rank >= node.maxRank) return false;
  if (skillPointsAvailable(save, characterId) < node.cost) return false;
  if (node.requires && !node.requires.every((r) => (c.nodes[r] ?? 0) > 0)) return false;
  c.nodes[nodeId] = rank + 1;
  c.spentPoints += node.cost;
  save.save();
  return true;
}
