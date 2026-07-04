/** Arrakis color language. Every sprite palette pulls from these ramps. */

export const C = {
  // Sand / desert ramp
  sand0: '#2b1a0e',
  sand1: '#5c3a1e',
  sand2: '#8f5e2f',
  sand3: '#c08a4a',
  sand4: '#e0b36c',
  sand5: '#f2d492',
  // Spice
  spice1: '#8a3a10',
  spice2: '#d95f18',
  spice3: '#ff9433',
  spice4: '#ffc36e',
  // Atreides
  atrGreen1: '#1d3b2a',
  atrGreen2: '#2f6b45',
  atrGreen3: '#4f9e63',
  // Harkonnen
  hark1: '#1a1418',
  hark2: '#3a2f36',
  hark3: '#5c4a52',
  hark4: '#8a6f7a',
  // Sardaukar
  sard1: '#2a2a33',
  sard2: '#4a4a5c',
  sard3: '#767689',
  sard4: '#a8a8bd',
  // Fremen
  frem1: '#33261a',
  frem2: '#59422c',
  frem3: '#86643f',
  // Skin
  skin1: '#8a5a3a',
  skin2: '#c08a5e',
  skin3: '#e6b585',
  // Accents
  blue: '#3fd0ff', // eyes of ibad / holtzman
  blueDeep: '#1a6a99',
  red: '#e03a2f',
  redDeep: '#8a1f18',
  gold: '#ffd23f',
  white: '#f5efe6',
  black: '#0d0906',
  outline: '#120a05',
  purple: '#7a3fa8',
  green: '#4fd05a',
} as const;

export type ColorKey = keyof typeof C;

/** GBC shell skin — Dune desert riff on the classic teal Game Boy Color. */
export const GBC_SHELL = {
  body: '#b56d2e',
  bodyDark: '#8a4e1d',
  bodyLight: '#d98f45',
  screenBezel: '#241812',
  screenBezelLight: '#3a281c',
  buttonA: '#d95f18',
  buttonB: '#c08a4a',
  buttonShadow: '#5c3a1e',
  text: '#f2d492',
} as const;

export function hexToInt(hex: string): number {
  return parseInt(hex.slice(1), 16);
}
