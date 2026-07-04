/** Shared content IDs and definition shapes. All content is data-driven off these. */

export type CharacterId = 'paul' | 'jessica' | 'gurney' | 'stilgar';

export type WeaponId =
  | 'crysknife'
  | 'maula'
  | 'lasgun'
  | 'hunter_seeker'
  | 'weirding_module'
  | 'knife_fan'
  // Evolutions
  | 'holtzman_cataclysm'
  | 'sayyadina_blade'
  | 'seeker_swarm'
  | 'voice_of_the_outer_world';

export type PassiveId = 'shield_belt' | 'stillsuit' | 'spice_melange' | 'fremkit' | 'filmbook';

export type AbilityId =
  | 'prescience'
  | 'the_voice'
  | 'voice_command'
  | 'prana_bindu'
  | 'war_song'
  | 'shield_bash'
  | 'sand_camo'
  | 'knife_flurry';

export type EnemyId =
  | 'trooper'
  | 'gunner'
  | 'hound'
  | 'crazed_merc'
  | 'sardaukar'
  | 'sardaukar_captain'
  | 'ornithopter'
  | 'sandtrout'
  | 'boss_rabban'
  | 'boss_shai_hulud';

export type MapId = 'arrakeen' | 'deep_desert';

export type StatKey =
  | 'maxHp'
  | 'speed'
  | 'might'
  | 'cooldown'
  | 'area'
  | 'magnet'
  | 'regen'
  | 'armor'
  | 'xpGain';

/** Player stat block resolved from base + meta tree + in-run boosts. */
export interface Stats {
  maxHp: number;
  /** Multipliers (1 = base). */
  speed: number;
  might: number;
  /** Lower is faster (0.9 = 10% faster fire). */
  cooldown: number;
  area: number;
  /** Pickup radius in px. */
  magnet: number;
  /** HP per second. */
  regen: number;
  /** Flat damage reduction per hit. */
  armor: number;
  xpGain: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  blurb: string;
  base: Stats;
  baseSpeedPx: number;
  startWeapon: WeaponId;
  abilities: [AbilityId, AbilityId];
  /** Third slot unlocked by meta capstone. */
  capstoneAbility?: AbilityId;
  innate?: { desc: string; weapon?: WeaponId; damageMult?: number };
  spriteKey: string;
  tint: number;
}

export type WeaponBehavior = 'meleeArc' | 'nearestDart' | 'beam' | 'homing' | 'aoePulse' | 'fan';

export interface WeaponLevelDelta {
  damage?: number;
  cooldown?: number;
  count?: number;
  pierce?: number;
  area?: number;
  speed?: number;
  duration?: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
  behavior: WeaponBehavior;
  base: {
    damage: number;
    /** Seconds between volleys. */
    cooldown: number;
    count: number;
    pierce: number;
    /** Radius / arc scale multiplier. */
    area: number;
    /** Projectile speed px/s. */
    speed: number;
    /** Lifetime seconds. */
    duration: number;
  };
  /** Deltas applied cumulatively for levels 2..maxLevel. */
  perLevel: WeaponLevelDelta[];
  maxLevel: number;
  evolution?: { requiresPassive: PassiveId; into: WeaponId };
  /** Evolved weapons are excluded from the level-up pool. */
  evolvedOnly?: boolean;
  projectileSprite: string;
  hitParticle: string;
  fireSfx: string;
}

export type AbilityEffect =
  | { kind: 'worldSlow'; factor: number }
  | { kind: 'coneStun'; range: number; halfAngleDeg: number; stunSec: number; damage: number }
  | { kind: 'aoeStun'; radius: number; stunSec: number; damage: number }
  | { kind: 'speedPhase'; speedMult: number }
  | { kind: 'damageBuff'; damageMult: number; attackSpeedMult: number }
  | { kind: 'knockbackRing'; radius: number; force: number; damage: number }
  | { kind: 'detarget' }
  | { kind: 'dash'; distance: number; damage: number };

export interface AbilityDef {
  id: AbilityId;
  name: string;
  desc: string;
  cooldown: number;
  duration: number;
  effect: AbilityEffect;
  icon: string;
  color: number;
}

export type EnemyBehavior = 'chase' | 'chaseRanged' | 'swarmer' | 'strafe' | 'erratic' | 'boss';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  behavior: EnemyBehavior;
  radius: number;
  spriteKey: string;
  tint?: number;
  /** Ranged attack config for chaseRanged/strafe. */
  ranged?: { range: number; cooldown: number; projSpeed: number; damage: number };
}

export interface SpawnEntry {
  enemy: EnemyId;
  ratePerSec: number;
  cap: number;
}

export interface WaveEvent {
  at: number;
  type: 'eliteSpawn' | 'ornithopterRun' | 'ring' | 'boss';
  enemy?: EnemyId;
  count?: number;
}

export interface WaveBand {
  t0: number;
  t1: number;
  spawns: SpawnEntry[];
  events?: WaveEvent[];
}

export interface MapDef {
  id: MapId;
  name: string;
  desc: string;
  durationSec: number;
  hpMult: number;
  dmgMult: number;
  palette: string;
  waves: WaveBand[];
  boss: EnemyId;
  music: string;
  /** Ambient particle key, e.g. spice glimmer / worm sign. */
  ambient?: string;
  unlockAfter?: MapId;
}

export type UpgradeKind = 'weaponNew' | 'weaponLevel' | 'passive' | 'statBoost' | 'heal';

export interface UpgradeOption {
  id: string;
  kind: UpgradeKind;
  weapon?: WeaponId;
  passive?: PassiveId;
  stat?: StatKey;
  value?: number;
  title: string;
  desc: string;
  icon: string;
}

export interface MetaNodeDef {
  id: string;
  character: CharacterId | 'all';
  name: string;
  desc: string;
  cost: number;
  requires?: string[];
  maxRank: number;
  effect:
    | { kind: 'stat'; stat: StatKey; valuePerRank: number }
    | { kind: 'unlockAbilitySlot' }
    | { kind: 'unlockWeapon'; weapon: WeaponId };
}

/** Layout modes for the two control-scheme skins. */
export type LayoutMode = 'auto' | 'landscape' | 'gbc';

export interface Settings {
  layoutMode: LayoutMode;
  fpsCap: 30 | 60;
  batterySaver: boolean;
  sfxVolume: number;
  musicVolume: number;
  showDamageNumbers: boolean;
  haptics: boolean;
}
