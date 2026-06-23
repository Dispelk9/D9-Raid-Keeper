import type { RaidBossTemplate } from '../../types';

export const projectManager: RaidBossTemplate = {
  id: 'project-manager',
  name: 'Project Manager',
  title: 'Deadline Marshal',
  icon: 'PM',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 1,
  stats: {
    hp: 560,
    atk: 25,
    def: 14,
    mag: 25,
    res: 15,
    spd: 18,
    countdown: 4,
  },
  attackName: 'Status Ping',
  specialSkills: [
    {
      name: 'Sprint Crunch',
      icon: 'PM',
      effectType: 'daze',
      target: 'party',
      duration: 1,
    },
    {
      name: 'Deadline Avalanche',
      icon: 'PM',
      effectType: 'silence',
      target: 'single',
      duration: 2,
    },
    {
      name: 'Bureaucratic Shield',
      icon: 'PM',
      effectType: 'evade',
      target: 'self',
      duration: 2,
    },
  ],
};
