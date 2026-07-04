import type { CharacterId, MapId, Settings } from '../types';

export interface CharacterSave {
  xp: number;
  level: number;
  spentPoints: number;
  /** nodeId -> rank */
  nodes: Record<string, number>;
  bestTimeSec: number;
  runs: number;
  wins: number;
}

export interface SaveV1 {
  version: 1;
  characters: Record<CharacterId, CharacterSave>;
  unlockedMaps: MapId[];
  settings: Settings;
  stats: { totalKills: number; totalRuns: number; totalPlaySec: number };
}

export function freshCharacterSave(): CharacterSave {
  return { xp: 0, level: 1, spentPoints: 0, nodes: {}, bestTimeSec: 0, runs: 0, wins: 0 };
}

export function freshSave(): SaveV1 {
  return {
    version: 1,
    characters: {
      paul: freshCharacterSave(),
      jessica: freshCharacterSave(),
      gurney: freshCharacterSave(),
      stilgar: freshCharacterSave(),
    },
    unlockedMaps: ['arrakeen'],
    settings: {
      layoutMode: 'auto',
      fpsCap: 60,
      batterySaver: false,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      showDamageNumbers: true,
      haptics: true,
    },
    stats: { totalKills: 0, totalRuns: 0, totalPlaySec: 0 },
  };
}

/** Coerce unknown stored data into a valid SaveV1 (fills gaps, drops junk). */
export function migrate(raw: unknown): SaveV1 {
  const fresh = freshSave();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<SaveV1>;
  if (r.characters && typeof r.characters === 'object') {
    for (const id of Object.keys(fresh.characters) as CharacterId[]) {
      const c = (r.characters as Record<string, unknown>)[id];
      if (c && typeof c === 'object') {
        fresh.characters[id] = { ...freshCharacterSave(), ...(c as Partial<CharacterSave>) };
      }
    }
  }
  if (Array.isArray(r.unlockedMaps) && r.unlockedMaps.length > 0) {
    fresh.unlockedMaps = r.unlockedMaps.filter((m): m is MapId => m === 'arrakeen' || m === 'deep_desert');
    if (!fresh.unlockedMaps.includes('arrakeen')) fresh.unlockedMaps.push('arrakeen');
  }
  if (r.settings && typeof r.settings === 'object') {
    fresh.settings = { ...fresh.settings, ...(r.settings as Partial<Settings>) };
  }
  if (r.stats && typeof r.stats === 'object') {
    fresh.stats = { ...fresh.stats, ...(r.stats as Partial<SaveV1['stats']>) };
  }
  return fresh;
}
