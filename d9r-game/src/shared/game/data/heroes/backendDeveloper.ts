import type { HeroTemplate } from '../../types';

export const backendDeveloper: HeroTemplate = {
  id: 'karma-duelist',
  name: 'Backend Developer',
  title: 'API Knight',
  role: 'Backend',
  rarity: 'Rare',
  icon: 'API',
  spriteFrame: 1,
  stats: { hp: 154, atk: 36, def: 22, mag: 14, res: 21, spd: 22 },
  skill: {
    id: 'endpoint-strike',
    name: 'Endpoint Strike',
    summary: 'Fast server-side strike',
    power: 1.46,
    kind: 'strike',
    accuracyBonus: 0.03,
  },
  secondarySkill: {
    id: 'cache-invalidation',
    name: 'Cache Invalidation',
    summary: 'Strike, makes the boss easier to hit',
    power: 1.2,
    kind: 'strike',
    effect: {
      target: 'boss',
      evasionModifier: -0.1,
      duration: 2,
    },
  },
  skillUnlocks: [
    {
      level: 7,
      skill: {
        id: 'query-optimizer',
        name: 'Query Optimizer',
        summary: 'Strike, lowers boss accuracy',
        power: 1.38,
        kind: 'strike',
        effect: {
          target: 'boss',
          accuracyModifier: -0.12,
          duration: 2,
        },
      },
    },
    {
      level: 19,
      skill: {
        id: 'zero-downtime-push',
        name: 'Zero-Downtime Push',
        summary: 'Heavy strike, high crit',
        power: 1.86,
        kind: 'strike',
        critBonus: 0.1,
      },
    },
  ],
  ultimate: {
    id: 'monolith-breaker',
    name: 'Monolith Breaker',
    summary: 'Massive API strike',
    power: 3.08,
    kind: 'strike',
  },
};
