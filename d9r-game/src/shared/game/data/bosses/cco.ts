import type { RaidBossTemplate } from '../../types';

export const cco: RaidBossTemplate = {
  id: 'cco',
  name: 'Chief Cost Cutter',
  title: 'Layoff Algorithm',
  icon: 'CCO',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 5,
  stats: {
    hp: 1080,
    atk: 42,
    def: 27,
    mag: 42,
    res: 27,
    spd: 24,
    countdown: 3,
  },
  attackName: 'Cost Cutter',
  specialSkills: [
    {
      name: 'Budget Guillotine',
      icon: 'CCO',
      effectType: 'berserk',
      target: 'single',
      duration: 2,
    },
    {
      name: 'Cost Freeze',
      icon: 'CCO',
      effectType: 'silence',
      target: 'party',
      duration: 2,
    },
  ],
};
