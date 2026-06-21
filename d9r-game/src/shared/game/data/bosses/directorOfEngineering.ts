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
  specialSkill: {
    name: 'Forced Reorg',
    icon: 'DIR',
    effectType: 'confuse',
    target: 'party',
    duration: 2,
  },
};
