import type { MetaNodeDef } from '../types';

/**
 * Per-character upgrade trees. Rows are tiers; a node requires its parent.
 * Stat values are per-rank fractions (0.04 = +4%) or flats for magnet/regen/armor.
 */
function commonTree(prefix: string): MetaNodeDef[] {
  const p = (id: string) => `${prefix}_${id}`;
  return [
    {
      id: p('vitality'),
      character: 'all',
      name: 'Vitality',
      desc: '+4% max HP per rank',
      cost: 1,
      maxRank: 5,
      effect: { kind: 'stat', stat: 'maxHp', valuePerRank: 0.04 },
    },
    {
      id: p('might'),
      character: 'all',
      name: 'Might',
      desc: '+3% damage per rank',
      cost: 1,
      maxRank: 5,
      effect: { kind: 'stat', stat: 'might', valuePerRank: 0.03 },
    },
    {
      id: p('celerity'),
      character: 'all',
      name: 'Celerity',
      desc: '+2% move speed per rank',
      cost: 1,
      maxRank: 4,
      effect: { kind: 'stat', stat: 'speed', valuePerRank: 0.02 },
    },
    {
      id: p('focus'),
      character: 'all',
      name: 'Battle Focus',
      desc: '2% faster attacks per rank',
      cost: 1,
      requires: [p('might')],
      maxRank: 4,
      effect: { kind: 'stat', stat: 'cooldown', valuePerRank: 0.02 },
    },
    {
      id: p('reach'),
      character: 'all',
      name: 'Reach',
      desc: '+3% attack area per rank',
      cost: 1,
      requires: [p('might')],
      maxRank: 4,
      effect: { kind: 'stat', stat: 'area', valuePerRank: 0.03 },
    },
    {
      id: p('senses'),
      character: 'all',
      name: 'Spice Senses',
      desc: '+8px pickup range per rank',
      cost: 1,
      requires: [p('celerity')],
      maxRank: 3,
      effect: { kind: 'stat', stat: 'magnet', valuePerRank: 8 },
    },
    {
      id: p('recovery'),
      character: 'all',
      name: 'Desert Hardening',
      desc: '+0.3 HP/s regen per rank',
      cost: 2,
      requires: [p('vitality')],
      maxRank: 3,
      effect: { kind: 'stat', stat: 'regen', valuePerRank: 0.3 },
    },
    {
      id: p('armor'),
      character: 'all',
      name: 'Shield Discipline',
      desc: '+1 armor per rank',
      cost: 2,
      requires: [p('vitality')],
      maxRank: 3,
      effect: { kind: 'stat', stat: 'armor', valuePerRank: 1 },
    },
    {
      id: p('wisdom'),
      character: 'all',
      name: 'Mentat Training',
      desc: '+4% XP gain per rank',
      cost: 1,
      maxRank: 4,
      effect: { kind: 'stat', stat: 'xpGain', valuePerRank: 0.04 },
    },
    {
      id: p('capstone'),
      character: 'all',
      name: 'Awakening',
      desc: 'Unlock a third ability slot',
      cost: 3,
      requires: [p('focus'), p('recovery')],
      maxRank: 1,
      effect: { kind: 'unlockAbilitySlot' },
    },
  ];
}

/**
 * The tree is shared in shape but tracked per character (node ids embed the
 * character), so every character levels and specs independently.
 */
export const META_TREE: MetaNodeDef[] = [
  ...commonTree('paul').map((n) => ({ ...n, character: 'paul' as const })),
  ...commonTree('jessica').map((n) => ({ ...n, character: 'jessica' as const })),
  ...commonTree('gurney').map((n) => ({ ...n, character: 'gurney' as const })),
  ...commonTree('stilgar').map((n) => ({ ...n, character: 'stilgar' as const })),
];

export function treeForCharacter(id: string): MetaNodeDef[] {
  return META_TREE.filter((n) => n.character === id);
}
