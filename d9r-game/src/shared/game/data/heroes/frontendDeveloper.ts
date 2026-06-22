import type { HeroTemplate } from '../../types';

export const frontendDeveloper: HeroTemplate = {
  id: 'snoo-vanguard',
  name: 'Frontend Developer',
  title: 'Pixel Paladin',
  role: 'Mage',
  rarity: 'Rare',
  icon: '</>',
  spriteFrame: 0,
  stats: { hp: 132, atk: 16, def: 17, mag: 39, res: 24, spd: 27 },
  skill: {
    id: 'css-cascade',
    name: 'CSS Cascade',
    summary: 'MAG-scaled UI burst',
    power: 1.48,
    kind: 'spell',
    accuracyBonus: 0.04,
  },
  secondarySkill: {
    id: 'accessibility-sweep',
    name: 'Accessibility Sweep',
    summary: 'Spell, raises party evasion',
    power: 1.16,
    kind: 'spell',
    effect: {
      target: 'party',
      evasionModifier: 0.08,
      duration: 2,
    },
  },
  skillUnlocks: [
    {
      level: 6,
      skill: {
        id: 'responsive-refactor',
        name: 'Responsive Refactor',
        summary: 'Spell, raises party evasion',
        power: 1.26,
        kind: 'spell',
        effect: {
          target: 'party',
          evasionModifier: 0.1,
          duration: 2,
        },
      },
    },
    {
      level: 17,
      skill: {
        id: 'component-split',
        name: 'Component Split',
        summary: 'Precise spell, high crit',
        power: 1.78,
        kind: 'spell',
        critBonus: 0.08,
      },
    },
  ],
  ultimate: {
    id: 'design-system-lock',
    name: 'Design System Lock',
    summary: 'Huge interface spell',
    power: 3.15,
    kind: 'spell',
  },
};
