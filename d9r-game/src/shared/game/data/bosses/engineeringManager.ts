import type { RaidBossTemplate } from '../../types';

export const engineeringManager: RaidBossTemplate = {
  id: 'engineering-manager',
  name: 'Engineering Manager',
  title: 'Performance Review Baron',
  icon: 'EM',
  spriteKey: 'boss-engineering-manager',
  stats: {
    hp: 760,
    atk: 33,
    def: 20,
    mag: 32,
    res: 21,
    spd: 20,
    countdown: 3,
  },
  attackName: 'Feedback Loop',
  specialSkills: [
    {
      name: 'Calibration Meeting',
      icon: 'EM',
      effectType: 'blind',
      target: 'party',
      duration: 2,
    },
    {
      name: 'PIP Draft',
      icon: 'EM',
      effectType: 'daze',
      target: 'single',
      duration: 1,
    },
    {
      name: 'Stack Rank Fury',
      icon: 'EM',
      effectType: 'rage',
      target: 'self',
      duration: 2,
    },
  ],
};
