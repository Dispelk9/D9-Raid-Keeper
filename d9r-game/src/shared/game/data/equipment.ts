import type { EquipmentItem } from '../types';

export const EQUIPMENT_POOL: EquipmentItem[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    slot: 'Weapon',
    rarity: 'Common',
    stat: 'atk',
    bonus: 6,
  },
  {
    id: 'mythril-blade',
    name: 'Mythril Blade',
    slot: 'Weapon',
    rarity: 'Rare',
    stat: 'atk',
    bonus: 10,
  },
  {
    id: 'dragon-spear',
    name: 'Dragon Spear',
    slot: 'Weapon',
    rarity: 'Epic',
    stat: 'atk',
    bonus: 15,
  },
  {
    id: 'knight-plate',
    name: 'Knight Plate',
    slot: 'Armor',
    rarity: 'Rare',
    stat: 'def',
    bonus: 9,
  },
  {
    id: 'ancient-robe',
    name: 'Ancient Robe',
    slot: 'Armor',
    rarity: 'Epic',
    stat: 'res',
    bonus: 14,
  },
  {
    id: 'karma-ring',
    name: 'Karma Ring',
    slot: 'Accessory',
    rarity: 'Rare',
    stat: 'spd',
    bonus: 7,
  },
  {
    id: 'snoo-talisman',
    name: 'Snoo Talisman',
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
