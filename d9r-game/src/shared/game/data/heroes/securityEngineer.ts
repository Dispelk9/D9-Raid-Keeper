import type { HeroTemplate } from '../../types';

export const securityEngineer: HeroTemplate = {
  id: 'award-sage',
  name: 'Security Engineer',
  title: 'Incident Guardian',
  role: 'Tank',
  rarity: 'Epic',
  icon: 'SEC',
  spriteFrame: 4,
  stats: { hp: 190, atk: 23, def: 33, mag: 14, res: 29, spd: 15 },
  skill: {
    id: 'firewall-bash',
    name: 'Firewall Bash',
    summary: 'DEF-scaled guard strike',
    power: 1.16,
    kind: 'strike',
  },
  secondarySkill: {
    id: 'patch-guard',
    name: 'Patch Guard',
    summary: 'Guard strike, raises party evasion',
    power: 1.02,
    kind: 'strike',
    effect: {
      target: 'party',
      evasionModifier: 0.1,
      duration: 2,
    },
  },
  skillUnlocks: [
    {
      level: 9,
      skill: {
        id: 'threat-model',
        name: 'Threat Model',
        summary: 'Guard strike, lowers boss accuracy',
        power: 1.28,
        kind: 'strike',
        effect: {
          target: 'boss',
          accuracyModifier: -0.15,
          duration: 2,
        },
      },
    },
    {
      level: 21,
      skill: {
        id: 'zero-trust-taunt',
        name: 'Zero-Trust Taunt',
        summary: 'Guard strike, party evasion up',
        power: 1.48,
        kind: 'strike',
        effect: {
          target: 'party',
          evasionModifier: 0.08,
          duration: 2,
        },
      },
    },
  ],
  ultimate: {
    id: 'breach-containment',
    name: 'Breach Containment',
    summary: 'Heavy guard strike',
    power: 2.42,
    kind: 'strike',
  },
};
