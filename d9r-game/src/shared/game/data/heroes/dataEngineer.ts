import type { HeroTemplate } from '../../types';

export const dataEngineer: HeroTemplate = {
  id: 'automod-oracle',
  name: 'Data Engineer',
  title: 'Warehouse Medic',
  role: 'Healer',
  rarity: 'Legendary',
  icon: 'DB',
  spriteFrame: 5,
  stats: { hp: 128, atk: 11, def: 15, mag: 35, res: 35, spd: 20 },
  skill: {
    id: 'etl-mend',
    name: 'ETL Mend',
    summary: 'Restore lowest ally',
    power: 1.44,
    kind: 'heal',
  },
  skillUnlocks: [
    {
      level: 10,
      skill: {
        id: 'data-quality-pass',
        name: 'Data Quality Pass',
        summary: 'Stronger heal, self evasion up',
        power: 1.6,
        kind: 'heal',
        effect: {
          target: 'self',
          evasionModifier: 0.1,
          duration: 2,
        },
      },
    },
    {
      level: 22,
      skill: {
        id: 'warehouse-refresh',
        name: 'Warehouse Refresh',
        summary: 'Heal, party evasion up',
        power: 1.36,
        kind: 'heal',
        effect: {
          target: 'party',
          evasionModifier: 0.08,
          duration: 2,
        },
      },
    },
  ],
  ultimate: {
    id: 'source-of-truth',
    name: 'Source of Truth',
    summary: 'Party-wide heal',
    power: 2.24,
    kind: 'heal',
  },
};
