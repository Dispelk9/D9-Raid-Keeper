import type { RaidBossTemplate } from '../../types';

export const techLead: RaidBossTemplate = {
  id: 'tech-lead',
  name: 'Tech Lead',
  title: 'Architecture Gatekeeper',
  icon: 'TL',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 2,
  stats: {
    hp: 650,
    atk: 29,
    def: 17,
    mag: 29,
    res: 18,
    spd: 20,
    countdown: 4,
  },
  attackName: 'Architecture Jab',
  specialSkills: [
    {
      name: 'Review Freeze',
      icon: 'TL',
      effectType: 'silence',
      target: 'party',
      duration: 2,
    },
    {
      name: 'Architecture Detour',
      icon: 'TL',
      effectType: 'confuse',
      target: 'single',
      duration: 2,
    },
    {
      name: 'Architecture Barrier',
      icon: 'TL',
      effectType: 'fortify',
      target: 'self',
      duration: 3,
    },
  ],
};
