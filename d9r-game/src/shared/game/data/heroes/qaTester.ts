import type { HeroTemplate } from '../../types';

export const qaTester: HeroTemplate = {
  id: 'qa-tester',
  name: 'QA Tester',
  title: 'Bug Hunter',
  role: 'QA',
  rarity: 'Rare',
  icon: 'QA',
  spriteFrame: 3,
  stats: { hp: 136, atk: 29, def: 18, mag: 16, res: 18, spd: 35 },
  skill: {
    id: 'regression-shot',
    name: 'Regression Shot',
    summary: 'SPD-assisted bug strike',
    power: 1.4,
    kind: 'strike',
    accuracyBonus: 0.08,
    critBonus: 0.04,
  },
  secondarySkill: {
    id: 'smoke-test',
    name: 'Smoke Test',
    summary: 'Precise strike, quick crit chance',
    power: 1.18,
    kind: 'strike',
    accuracyBonus: 0.14,
    critBonus: 0.06,
  },
  skillUnlocks: [
    {
      level: 8,
      skill: {
        id: 'edge-case-trap',
        name: 'Edge Case Trap',
        summary: 'Precise strike, high hit and crit',
        power: 1.5,
        kind: 'strike',
        accuracyBonus: 0.13,
        critBonus: 0.08,
      },
    },
    {
      level: 18,
      skill: {
        id: 'test-suite-volley',
        name: 'Test Suite Volley',
        summary: 'Volley, lowers boss accuracy',
        power: 1.66,
        kind: 'strike',
        accuracyBonus: 0.06,
        effect: {
          target: 'boss',
          accuracyModifier: -0.1,
          duration: 2,
        },
      },
    },
  ],
  ultimate: {
    id: 'release-blocker',
    name: 'Release Blocker',
    summary: 'Rapid precision burst',
    power: 2.88,
    kind: 'strike',
  },
};
