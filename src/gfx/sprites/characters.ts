import { C } from '../palettes';
import type { SpriteSpec } from '../PixelDSL';

/**
 * Player characters, 12x14, authored as left half (6 cols) and mirrored.
 * Silhouette rules: hair/hood shape + accent color = instant recognition.
 */

// Paul: dark hair, tan stillsuit, Atreides-green scarf, spice-blue eyes.
export const paul: SpriteSpec = {
  key: 'char_paul',
  mirrorX: true,
  palette: {
    H: '#241a12', // dark hair
    S: C.skin2,
    E: C.blue,
    A: C.atrGreen2, // scarf
    B: C.frem3, // stillsuit light
    D: C.frem2, // stillsuit dark
    L: C.frem1, // boots
  },
  grid: [
    '..HHHH',
    '.HHHHH',
    '.HSSSS',
    '.HSESS',
    '..SSSS',
    '..AAAA',
    '.BBBBB',
    '.BBBDB',
    '.BBBDB',
    '.DBBBB',
    '..DDDD',
    '..DD.D',
    '..DD.D',
    '..LL.L',
  ],
};

// Jessica: copper hair, dark Bene Gesserit robe with purple trim.
export const jessica: SpriteSpec = {
  key: 'char_jessica',
  mirrorX: true,
  palette: {
    H: '#8a4a1e', // copper hair
    S: C.skin3,
    E: C.blue,
    R: '#221a26', // robe dark
    P: C.purple, // trim
    D: '#171219',
  },
  grid: [
    '.HHHHH',
    'HHHHHH',
    'HHSSSS',
    'HHSESS',
    'H.SSSS',
    'H.RRRR',
    '.RRRRR',
    '.RPRRR',
    '.RPRRR',
    '.RRRRR',
    '.RRRRR',
    '..RRRR',
    '..RRRR',
    '..DDDD',
  ],
};

// Gurney: blond, bulky, Atreides green armor, red inkvine scar on jaw.
export const gurney: SpriteSpec = {
  key: 'char_gurney',
  mirrorX: true,
  palette: {
    H: '#b98a3f', // blond
    S: C.skin2,
    E: '#3a2a1a',
    K: C.redDeep, // scar (left side only, mirror makes subtle jaw shade)
    A: C.atrGreen2,
    G: C.atrGreen1,
    M: C.sand3, // belt
    L: C.frem1,
  },
  grid: [
    '..HHHH',
    '.HHHHH',
    '.HSSSS',
    '.HSESS',
    '.KSSSS',
    '.AAAAA',
    'AAAAAA',
    'AAGGAA',
    'AAGGAA',
    'A.GGGG',
    '..MMMM',
    '..GG.G',
    '..GG.G',
    '..LL.L',
  ],
};

// Stilgar: hooded Fremen, dark beard, intense blue eyes.
export const stilgar: SpriteSpec = {
  key: 'char_stilgar',
  mirrorX: true,
  palette: {
    O: C.frem2, // hood
    U: C.frem1, // hood shadow
    S: C.skin1,
    E: C.blue,
    B: '#241a12', // beard
    T: C.frem3, // robe
    D: C.frem2,
    L: C.frem1,
  },
  grid: [
    '.OOOOO',
    'OOOOOO',
    'OUSSSS',
    'OUSESS',
    'OUBBBB',
    'O.BBBB',
    '.TTTTT',
    '.TTTDT',
    '.TTTDT',
    '.TTTTT',
    '.TDDDD',
    '..TT.T',
    '..DD.D',
    '..LL.L',
  ],
};

export const characterSprites: SpriteSpec[] = [paul, jessica, gurney, stilgar];
