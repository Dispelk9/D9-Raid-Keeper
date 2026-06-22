import type { RaidBossTemplate } from '../../types';

export const directorOfEngineering: RaidBossTemplate = {
  id: 'director-of-engineering',
  name: 'Director of Engineering',
  title: 'Reorg Architect',
  icon: 'DIR',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 4,
  stats: {
    hp: 900,
    atk: 37,
    def: 23,
    mag: 36,
    res: 24,
    spd: 22,
    countdown: 3,
  },
  attackName: 'Org Chart Slash',
  specialSkills: [
    {
      name: 'Forced Reorg',
      icon: 'DIR',
      effectType: 'confuse',
      target: 'party',
      duration: 2,
    },
    {
      name: 'Headcount Shuffle',
      icon: 'DIR',
      effectType: 'blind',
      target: 'single',
      duration: 2,
    },
  ],
};
