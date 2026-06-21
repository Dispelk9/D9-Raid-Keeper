import type { RaidBossTemplate } from '../../types';

export const engineeringManager: RaidBossTemplate = {
  id: 'engineering-manager',
  name: 'Engineering Manager',
  title: 'Performance Review Baron',
  icon: 'EM',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 3,
  stats: {
    hp: 760,
    atk: 33,
    def: 20,
    mag: 32,
    res: 21,
    spd: 20,
    countdown: 3,
  },
  specialSkill: {
    name: 'Calibration Meeting',
    icon: 'EM',
    effectType: 'blind',
    target: 'party',
    duration: 2,
  },
};
