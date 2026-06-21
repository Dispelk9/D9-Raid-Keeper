import type { EquipmentItem } from '../types';

export const EQUIPMENT_POOL: EquipmentItem[] = [
  {
    id: 'usb-debug-stick',
    name: 'USB Debug Stick',
    slot: 'Weapon',
    rarity: 'Common',
    stat: 'atk',
    bonus: 6,
  },
  {
    id: 'mechanical-keyboard',
    name: 'Mechanical Keyboard',
    slot: 'Weapon',
    rarity: 'Rare',
    stat: 'atk',
    bonus: 10,
  },
  {
    id: 'company-macbook',
    name: 'Company MacBook',
    slot: 'Weapon',
    rarity: 'Epic',
    stat: 'atk',
    bonus: 15,
  },
  {
    id: 'standing-desk',
    name: 'Standing Desk',
    slot: 'Armor',
    rarity: 'Rare',
    stat: 'def',
    bonus: 9,
  },
  {
    id: 'noise-canceling-hoodie',
    name: 'Noise-Canceling Hoodie',
    slot: 'Armor',
    rarity: 'Epic',
    stat: 'res',
    bonus: 14,
  },
  {
    id: 'lucky-deploy-pen',
    name: 'Lucky Deploy Pen',
    slot: 'Accessory',
    rarity: 'Rare',
    stat: 'spd',
    bonus: 7,
  },
  {
    id: 'root-access-yubikey',
    name: 'Root Access YubiKey',
    slot: 'Accessory',
    rarity: 'Legendary',
    stat: 'mag',
    bonus: 18,
  },
];

export const pickEquipmentReward = (inventorySize: number) => {
  const poolIndex = Math.floor(Math.random() * EQUIPMENT_POOL.length);
  const item = EQUIPMENT_POOL[poolIndex] ?? EQUIPMENT_POOL[0];

  if (!item) return null;

  return {
    ...item,
    id: `${item.id}-${inventorySize + 1}`,
  };
};
