import type { HeroTemplate } from '../../types';

export const devopsEngineer: HeroTemplate = {
  id: 'flair-archmage',
  name: 'DevOps Engineer',
  title: 'Pipeline Warden',
  role: 'Support',
  rarity: 'Epic',
  icon: 'CI',
  spriteFrame: 2,
  stats: { hp: 146, atk: 18, def: 23, mag: 28, res: 33, spd: 25 },
  skill: {
    id: 'pipeline-shield',
    name: 'Pipeline Shield',
    summary: 'Rally, charges party skills',
    power: 1.1,
    kind: 'rally',
  },
  skillUnlocks: [
    {
      level: 8,
      skill: {
        id: 'rollback-plan',
        name: 'Rollback Plan',
        summary: 'Rally, party evasion up',
        power: 1.18,
        kind: 'rally',
        effect: {
          target: 'party',
          evasionModifier: 0.12,
          duration: 2,
        },
      },
    },
    {
      level: 20,
      skill: {
        id: 'cluster-surge',
        name: 'Cluster Surge',
        summary: 'Support spell, lowers boss accuracy',
        power: 1.64,
        kind: 'spell',
        accuracyBonus: 0.04,
        effect: {
          target: 'boss',
          accuracyModifier: -0.14,
          duration: 3,
        },
      },
    },
  ],
  ultimate: {
    id: 'blue-green-release',
    name: 'Blue-Green Release',
    summary: 'Heavy support spell',
    power: 2.65,
    kind: 'spell',
  },
};
