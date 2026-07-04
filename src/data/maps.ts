import type { MapDef, MapId, WaveBand } from '../types';

/**
 * Arrakeen outskirts: 15 minutes, Harkonnen occupation forces.
 * Pacing: troopers -> hounds -> gunners -> mercs -> Sardaukar -> captains,
 * ornithopter strafing runs as periodic events, Rabban at 14:00.
 */
const arrakeenWaves: WaveBand[] = [
  {
    t0: 0,
    t1: 60,
    spawns: [{ enemy: 'trooper', ratePerSec: 1.0, cap: 30 }],
  },
  {
    t0: 60,
    t1: 150,
    spawns: [
      { enemy: 'trooper', ratePerSec: 1.6, cap: 55 },
      { enemy: 'hound', ratePerSec: 0.5, cap: 14 },
    ],
    events: [{ at: 120, type: 'ring', enemy: 'trooper', count: 18 }],
  },
  {
    t0: 150,
    t1: 300,
    spawns: [
      { enemy: 'trooper', ratePerSec: 1.8, cap: 70 },
      { enemy: 'hound', ratePerSec: 0.8, cap: 20 },
      { enemy: 'gunner', ratePerSec: 0.5, cap: 16 },
    ],
    events: [
      { at: 180, type: 'eliteSpawn', enemy: 'trooper' },
      { at: 240, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 300,
    t1: 480,
    spawns: [
      { enemy: 'trooper', ratePerSec: 1.5, cap: 60 },
      { enemy: 'gunner', ratePerSec: 0.8, cap: 22 },
      { enemy: 'crazed_merc', ratePerSec: 0.7, cap: 24 },
      { enemy: 'hound', ratePerSec: 1.0, cap: 26 },
    ],
    events: [
      { at: 330, type: 'eliteSpawn', enemy: 'hound' },
      { at: 390, type: 'ring', enemy: 'hound', count: 22 },
      { at: 450, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 480,
    t1: 660,
    spawns: [
      { enemy: 'crazed_merc', ratePerSec: 1.2, cap: 34 },
      { enemy: 'gunner', ratePerSec: 1.0, cap: 26 },
      { enemy: 'sardaukar', ratePerSec: 0.5, cap: 18 },
    ],
    events: [
      { at: 510, type: 'eliteSpawn', enemy: 'gunner' },
      { at: 600, type: 'ring', enemy: 'sardaukar', count: 14 },
    ],
  },
  {
    t0: 660,
    t1: 840,
    spawns: [
      { enemy: 'sardaukar', ratePerSec: 1.0, cap: 30 },
      { enemy: 'crazed_merc', ratePerSec: 1.2, cap: 30 },
      { enemy: 'sardaukar_captain', ratePerSec: 0.15, cap: 6 },
      { enemy: 'hound', ratePerSec: 1.2, cap: 30 },
    ],
    events: [
      { at: 690, type: 'ornithopterRun' },
      { at: 720, type: 'eliteSpawn', enemy: 'sardaukar' },
      { at: 780, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 840,
    t1: 900,
    spawns: [
      { enemy: 'sardaukar', ratePerSec: 0.8, cap: 24 },
      { enemy: 'sardaukar_captain', ratePerSec: 0.2, cap: 8 },
    ],
    events: [{ at: 840, type: 'boss', enemy: 'boss_rabban' }],
  },
];

/**
 * Deep Desert: 20 minutes, the open bled. Fremen-hostile wildlife and the
 * Emperor's finest, ending with Shai-Hulud.
 */
const deepDesertWaves: WaveBand[] = [
  {
    t0: 0,
    t1: 90,
    spawns: [
      { enemy: 'sandtrout', ratePerSec: 2.2, cap: 50 },
      { enemy: 'crazed_merc', ratePerSec: 0.4, cap: 12 },
    ],
  },
  {
    t0: 90,
    t1: 240,
    spawns: [
      { enemy: 'sandtrout', ratePerSec: 3.0, cap: 70 },
      { enemy: 'crazed_merc', ratePerSec: 0.8, cap: 22 },
      { enemy: 'hound', ratePerSec: 0.6, cap: 16 },
    ],
    events: [{ at: 150, type: 'ring', enemy: 'sandtrout', count: 26 }],
  },
  {
    t0: 240,
    t1: 420,
    spawns: [
      { enemy: 'sandtrout', ratePerSec: 2.5, cap: 60 },
      { enemy: 'gunner', ratePerSec: 0.8, cap: 22 },
      { enemy: 'sardaukar', ratePerSec: 0.5, cap: 16 },
    ],
    events: [
      { at: 270, type: 'eliteSpawn', enemy: 'sandtrout' },
      { at: 360, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 420,
    t1: 660,
    spawns: [
      { enemy: 'sardaukar', ratePerSec: 0.9, cap: 26 },
      { enemy: 'crazed_merc', ratePerSec: 1.2, cap: 30 },
      { enemy: 'sandtrout', ratePerSec: 3.0, cap: 70 },
    ],
    events: [
      { at: 480, type: 'eliteSpawn', enemy: 'sardaukar' },
      { at: 570, type: 'ring', enemy: 'hound', count: 24 },
      { at: 640, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 660,
    t1: 900,
    spawns: [
      { enemy: 'sardaukar', ratePerSec: 1.2, cap: 32 },
      { enemy: 'sardaukar_captain', ratePerSec: 0.15, cap: 6 },
      { enemy: 'sandtrout', ratePerSec: 3.5, cap: 80 },
      { enemy: 'hound', ratePerSec: 1.0, cap: 24 },
    ],
    events: [
      { at: 700, type: 'eliteSpawn', enemy: 'crazed_merc' },
      { at: 800, type: 'ornithopterRun' },
      { at: 840, type: 'eliteSpawn', enemy: 'sardaukar_captain' },
    ],
  },
  {
    t0: 900,
    t1: 1140,
    spawns: [
      { enemy: 'sardaukar', ratePerSec: 1.4, cap: 36 },
      { enemy: 'sardaukar_captain', ratePerSec: 0.25, cap: 10 },
      { enemy: 'crazed_merc', ratePerSec: 1.4, cap: 34 },
    ],
    events: [
      { at: 960, type: 'ring', enemy: 'sardaukar', count: 18 },
      { at: 1020, type: 'eliteSpawn', enemy: 'sardaukar_captain' },
      { at: 1080, type: 'ornithopterRun' },
    ],
  },
  {
    t0: 1140,
    t1: 1200,
    spawns: [{ enemy: 'sandtrout', ratePerSec: 2.0, cap: 50 }],
    events: [{ at: 1140, type: 'boss', enemy: 'boss_shai_hulud' }],
  },
];

export const MAPS: Record<MapId, MapDef> = {
  arrakeen: {
    id: 'arrakeen',
    name: 'Arrakeen Outskirts',
    desc: 'The occupied city\'s edge. Harkonnen patrols everywhere.',
    durationSec: 900,
    hpMult: 1.0,
    dmgMult: 1.0,
    palette: 'arrakeen',
    waves: arrakeenWaves,
    boss: 'boss_rabban',
    music: 'map1',
    ambient: 'dust',
  },
  deep_desert: {
    id: 'deep_desert',
    name: 'Deep Desert',
    desc: 'The open bled. Worm sign on every horizon.',
    durationSec: 1200,
    hpMult: 1.6,
    dmgMult: 1.3,
    palette: 'deep',
    waves: deepDesertWaves,
    boss: 'boss_shai_hulud',
    music: 'map2',
    ambient: 'spice',
    unlockAfter: 'arrakeen',
  },
};
