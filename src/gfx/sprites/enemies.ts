import { C } from '../palettes';
import type { SpriteSpec } from '../PixelDSL';

/** Harkonnen trooper template — palette-swapped for gunner/Sardaukar tiers. */
const trooperGrid = [
  '..AAAA',
  '.AAAAA',
  '.AVVVV',
  '.AVEVV',
  '..AAAA',
  '.BBBBB',
  'BBBBCB',
  'BBBBCB',
  'B.BBBB',
  '..DDDD',
  '..DD.D',
  '..LL.L',
];

export const trooper: SpriteSpec = {
  key: 'en_trooper',
  mirrorX: true,
  palette: {
    A: C.hark2, // helmet
    V: C.hark3, // visor plate
    E: C.red, // eye slit
    B: C.hark3, // armor
    C: C.hark1, // chest seam
    D: C.hark2,
    L: C.hark1,
  },
  grid: trooperGrid,
};

export const gunner: SpriteSpec = {
  key: 'en_gunner',
  mirrorX: true,
  palette: {
    A: C.hark1,
    V: C.hark2,
    E: C.spice3, // orange optics
    B: C.hark2,
    C: C.redDeep,
    D: C.hark1,
    L: C.hark1,
  },
  grid: trooperGrid,
};

export const sardaukar: SpriteSpec = {
  key: 'en_sardaukar',
  mirrorX: true,
  palette: {
    A: C.sard2,
    V: C.sard3,
    E: C.white,
    B: C.sard2,
    C: C.sard1,
    D: C.sard1,
    L: C.sard1,
  },
  grid: [
    '..KKKK', // crest
    '..AAAA',
    '.AAAAA',
    '.AVVVV',
    '.AVEVV',
    '..AAAA',
    '.BBBBB',
    'BBBBCB',
    'BBBBCB',
    'B.BBBB',
    '..DDDD',
    '..DD.D',
    '..LL.L',
  ].map((r) => r),
};
sardaukar.palette['K'] = C.sard4;

export const sardaukarCaptain: SpriteSpec = {
  key: 'en_sardaukar_captain',
  mirrorX: true,
  palette: { ...sardaukar.palette, K: C.gold, E: C.gold },
  grid: sardaukar.grid,
};

/** Harkonnen war hound — low quadruped. */
export const hound: SpriteSpec = {
  key: 'en_hound',
  outline: C.outline,
  palette: {
    B: C.hark2,
    D: C.hark1,
    E: C.red,
    T: C.hark3,
  },
  grid: [
    '..........BB',
    '.BBBBBBBBBEB',
    'TBBBBBBBBBBB',
    '.BDBBBBBDBB.',
    '.BD.....DB..',
    '.B.......B..',
  ],
};

/** Crazed smuggler/mercenary — ragged desert scavenger. */
export const crazedMerc: SpriteSpec = {
  key: 'en_merc',
  mirrorX: true,
  palette: {
    H: C.sand1,
    S: C.skin1,
    E: C.red,
    B: C.sand2,
    R: C.sand1, // rags
    L: C.frem1,
  },
  grid: [
    '..HHHH',
    '.HSSSS',
    '.HSESS',
    '..SSSS',
    '.BBBBB',
    'BBRBBB',
    'BBRBBB',
    'B.BBRB',
    '..RRRR',
    '..RR.R',
    '..LL.L',
  ],
};

/** Ornithopter — strafing flyer, drawn side-on with dragonfly wings. */
export const ornithopter: SpriteSpec = {
  key: 'en_ornithopter',
  outline: C.outline,
  palette: {
    W: C.sard3, // wings
    w: C.sard2,
    B: C.hark2, // hull
    D: C.hark1,
    G: C.spice3, // cockpit glow
  },
  grid: [
    '..W......W......',
    '..WW....WW......',
    '...WW..WW.......',
    '.wwWWwwWWww.....',
    '..BBBBBBBBBBB...',
    '.BBGGBBBBBBBBBB.',
    '..BBBBBBBBBBDD..',
    '...DDBBBBBDD....',
    '.....DDDD.......',
  ],
};

/** Sandtrout — pale leathery blob (deep desert swarmer). */
export const sandtrout: SpriteSpec = {
  key: 'en_sandtrout',
  outline: C.outline,
  palette: {
    P: '#cbb8a0',
    D: '#a08a70',
    M: '#7a6a55',
  },
  grid: [
    '.PPPP.',
    'PPDPPP',
    'PDPPDP',
    'PPPDPP',
    '.MPPM.',
  ],
};

/** Beast Rabban — hulking brute boss. 20x22. */
export const bossRabban: SpriteSpec = {
  key: 'en_boss_rabban',
  mirrorX: true,
  palette: {
    H: '#3a2318', // scalp
    S: C.skin1,
    E: C.red,
    A: C.hark3, // pauldron
    B: C.hark2, // armor
    C: C.redDeep, // chest sigil
    D: C.hark1,
    G: C.gold, // trim
    L: C.hark1,
  },
  grid: [
    '....HHHHHH',
    '...HHHHHHH',
    '...HSSSSSS',
    '...HSSESSS',
    '...HSSSSSS',
    '....SSSSSS',
    '.AAAAAAAAA',
    'AAAAABBBBB',
    'AAABBBBBBB',
    'AABBBBCCBB',
    'AABBBBCCBB',
    'ABBBBBBBBB',
    'A.BBBGGBBB',
    'A.BBBBBBBB',
    'AA.BBBBBBB',
    '...DDDDDDD',
    '...DDDDDDD',
    '...DDD..DD',
    '...DDD..DD',
    '...DDD..DD',
    '...LLL..LL',
    '...LLL..LL',
  ],
};

/** Shai-Hulud head — rendered big; body segments drawn as separate sprite. */
export const shaiHuludHead: SpriteSpec = {
  key: 'en_worm_head',
  mirrorX: true,
  palette: {
    R: C.sand2, // hide
    D: C.sand1,
    M: '#4a2c14', // maw
    T: C.white, // crystal teeth
    G: C.spice2, // gullet glow
  },
  grid: [
    '.....RRRRRRRR',
    '...RRRRRRRRRR',
    '..RRRDDRRRRRR',
    '.RRDDRRRRRRRR',
    '.RRDRRRRRRRRR',
    'RRDRRRRTMMMMM',
    'RRDRRRTMMMMMM',
    'RRDRRTMMGGGGG',
    'RRDRRTMGGGGGG',
    'RRDRRTMMGGGGG',
    'RRDRRRTMMMMMM',
    'RRDRRRRTMMMMM',
    '.RRDRRRRRRRRR',
    '.RRDDRRRRRRRR',
    '..RRRDDRRRRRR',
    '...RRRRRRRRRR',
    '.....RRRRRRRR',
  ],
};

export const wormSegment: SpriteSpec = {
  key: 'en_worm_seg',
  mirrorX: true,
  palette: {
    R: C.sand2,
    D: C.sand1,
    L: C.sand3,
  },
  grid: [
    '....RRRRR',
    '..RRRRRRR',
    '.RRLRRRRR',
    '.RLRRRRRR',
    'RRLRRRRRR',
    'RRLRRRRRR',
    'RRLRRRRRR',
    '.RLRRRRRR',
    '.RRLRRRRR',
    '..RRRRRRR',
    '....RRRRR',
  ],
};

export const enemySprites: SpriteSpec[] = [
  trooper,
  gunner,
  sardaukar,
  sardaukarCaptain,
  hound,
  crazedMerc,
  ornithopter,
  sandtrout,
  bossRabban,
  shaiHuludHead,
  wormSegment,
];
