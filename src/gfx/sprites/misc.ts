import { C } from '../palettes';
import type { SpriteSpec } from '../PixelDSL';

/** Projectiles, pickups, and ability/weapon icons. */

export const projCrysknife: SpriteSpec = {
  key: 'pr_crysknife',
  outline: null,
  palette: { W: C.white, S: C.sand5, H: C.sand2 },
  grid: ['..WW.', '.WWS.', 'WWS..', 'HS...'],
};

export const projDart: SpriteSpec = {
  key: 'pr_dart',
  outline: null,
  palette: { A: C.spice3, B: C.spice2 },
  grid: ['BAA.', 'AAAB'],
};

export const projSeeker: SpriteSpec = {
  key: 'pr_seeker',
  outline: null,
  palette: { M: C.sard3, D: C.sard1, R: C.red },
  grid: ['.MM.', 'MDDM', 'MDRM', '.MM.'],
};

export const projKnife: SpriteSpec = {
  key: 'pr_knife',
  outline: null,
  palette: { W: C.sand4, S: C.sand2 },
  grid: ['.WW..', 'SWWW.', '.SWWW'],
};

export const gemSpice: SpriteSpec = {
  key: 'pk_gem',
  outline: C.outline,
  palette: { A: C.spice3, B: C.spice2, L: C.spice4 },
  grid: ['.LA.', 'LAAB', 'AABB', '.BB.'],
};

export const gemBig: SpriteSpec = {
  key: 'pk_gem_big',
  outline: C.outline,
  palette: { A: C.spice3, B: C.spice1, L: C.spice4, W: C.white },
  grid: ['..WL..', '.LLAA.', 'LAAAB.', 'LAABBB', '.ABBB.', '..BB..'],
};

export const pickupWater: SpriteSpec = {
  key: 'pk_water',
  outline: C.outline,
  palette: { W: C.blue, D: C.blueDeep, L: C.white },
  grid: ['..W..', '.WWW.', 'WLWWW', 'WWWWD', '.WWD.'],
};

export const pickupChest: SpriteSpec = {
  key: 'pk_chest',
  outline: C.outline,
  palette: { B: C.frem2, D: C.frem1, G: C.gold, L: C.frem3 },
  grid: ['.LLLLLL.', 'LBBBBBBL', 'LBGGGGBL', 'LDDGGDDL', 'LDDDDDDL', '.DDDDDD.'],
};

/** 9x9 ability icons (drawn white/colored, tinted at runtime as needed). */
export const iconEye: SpriteSpec = {
  key: 'ic_eye',
  outline: null,
  palette: { W: C.white, B: C.blue },
  grid: [
    '.........',
    '..WWWWW..',
    '.W.....W.',
    'W..BBB..W',
    'W..BBB..W',
    'W..BBB..W',
    '.W.....W.',
    '..WWWWW..',
    '.........',
  ],
};

export const iconVoice: SpriteSpec = {
  key: 'ic_voice',
  outline: null,
  palette: { W: C.white },
  grid: [
    '....W....',
    '...WW.W..',
    '..WWW..W.',
    '.WWWW.W.W',
    '.WWWW.W.W',
    '.WWWW.W.W',
    '..WWW..W.',
    '...WW.W..',
    '....W....',
  ],
};

export const iconRush: SpriteSpec = {
  key: 'ic_rush',
  outline: null,
  palette: { W: C.white },
  grid: [
    '.........',
    '..W..W...',
    '.WW.WW...',
    'WWWWWW...',
    '.WWWWWWW.',
    'WWWWWW...',
    '.WW.WW...',
    '..W..W...',
    '.........',
  ],
};

export const iconNote: SpriteSpec = {
  key: 'ic_note',
  outline: null,
  palette: { W: C.white },
  grid: [
    '....WWWW.',
    '....W..W.',
    '....W..W.',
    '....W..W.',
    '.WW.W.WW.',
    'WWWWW.WWW',
    'WWWW..WWW',
    '.WW....W.',
    '.........',
  ],
};

export const iconShield: SpriteSpec = {
  key: 'ic_shield',
  outline: null,
  palette: { W: C.white, B: C.blue },
  grid: [
    '.WWWWWWW.',
    'W.......W',
    'W..BBB..W',
    'W..BBB..W',
    'W.......W',
    '.W.....W.',
    '..W...W..',
    '...W.W...',
    '....W....',
  ],
};

export const iconSwirl: SpriteSpec = {
  key: 'ic_swirl',
  outline: null,
  palette: { W: C.white, S: C.sand4 },
  grid: [
    '..WWWW...',
    '.W....W..',
    'W..SS..W.',
    'W.S..S.W.',
    'W.S.SS.W.',
    'W..S...W.',
    '.W....W..',
    '..WWWW...',
    '.........',
  ],
};

export const iconKnife: SpriteSpec = {
  key: 'ic_knife',
  outline: null,
  palette: { W: C.white, S: C.sand3 },
  grid: [
    '.......WW',
    '......WWW',
    '.....WWW.',
    '....WWW..',
    '...WWW...',
    '..SWW....',
    '.SS......',
    'SS.......',
    '.........',
  ],
};

export const iconFist: SpriteSpec = {
  key: 'ic_fist',
  outline: null,
  palette: { W: C.white },
  grid: [
    '.........',
    '.WWWWWW..',
    'WWWWWWWW.',
    'WWWWWWWW.',
    'WWWWWWWW.',
    '.WWWWWW..',
    '..WWWW...',
    '.........',
    '.........',
  ],
};

export const miscSprites: SpriteSpec[] = [
  projCrysknife,
  projDart,
  projSeeker,
  projKnife,
  gemSpice,
  gemBig,
  pickupWater,
  pickupChest,
  iconEye,
  iconVoice,
  iconRush,
  iconNote,
  iconShield,
  iconSwirl,
  iconKnife,
  iconFist,
];
