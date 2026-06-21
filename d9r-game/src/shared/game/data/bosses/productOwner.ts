import type { RaidBossTemplate } from '../../types';

export const productOwner: RaidBossTemplate = {
  id: 'product-owner',
  name: 'Product Owner',
  title: 'Scope Creep Herald',
  icon: 'PO',
  spriteKey: 'snoo-bosses-right',
  spriteFrame: 0,
  stats: {
    hp: 480,
    atk: 22,
    def: 12,
    mag: 24,
    res: 13,
    spd: 17,
    countdown: 4,
  },
  specialSkill: {
    name: 'Moving Target',
    icon: 'PO',
    effectType: 'confuse',
    target: 'single',
    duration: 2,
  },
};
