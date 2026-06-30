import type { EquipmentItem, HeroRarity, StatBlock } from '../types';

// How many secondary stats each rarity tier adds beyond the primary
const EXTRA_STAT_COUNT: Record<HeroRarity, number> = {
  Common:    0,
  Rare:      1,
  Epic:      2,
  Legendary: 3,
  Mythic:    4,
};

const ALL_STATS: (keyof StatBlock)[] = ['hp', 'atk', 'def', 'mag', 'res', 'spd'];

// Secondary stats are 50% of primary; hp is scaled up since its range is larger
function buildExtraStats(
  primaryStat: keyof StatBlock,
  primaryBonus: number,
  rarity: HeroRarity
): Partial<StatBlock> | undefined {
  const count = EXTRA_STAT_COUNT[rarity];
  if (count === 0) return undefined;

  const pool = ALL_STATS.filter((s) => s !== primaryStat);
  // Fisher-Yates shuffle for variety
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const extras: Partial<StatBlock> = {};
  for (let i = 0; i < count; i++) {
    const s = pool[i];
    if (!s) break;
    extras[s] = s === 'hp'
      ? Math.max(8, Math.round(primaryBonus * 1.5))
      : Math.max(1, Math.round(primaryBonus * 0.5));
  }
  return extras;
}

export const EQUIPMENT_POOL: EquipmentItem[] = [
  // ── Common (1 stat) ───────────────────────────────────────────────────────
  { id: 'usb-debug-stick',   name: 'USB Debug Stick',   slot: 'Weapon',    rarity: 'Common',    stat: 'atk', bonus: 6  },
  { id: 'foam-stress-ball',  name: 'Foam Stress Ball',  slot: 'Accessory', rarity: 'Common',    stat: 'res', bonus: 5  },
  { id: 'desk-plant',        name: 'Desk Plant',        slot: 'Armor',     rarity: 'Common',    stat: 'def', bonus: 5  },

  // ── Rare (2 stats) ────────────────────────────────────────────────────────
  { id: 'mechanical-keyboard', name: 'Mechanical Keyboard',   slot: 'Weapon',    rarity: 'Rare', stat: 'atk', bonus: 10, extraStats: { mag: 5 } },
  { id: 'standing-desk',       name: 'Standing Desk',         slot: 'Armor',     rarity: 'Rare', stat: 'def', bonus: 9,  extraStats: { res: 5 } },
  { id: 'lucky-deploy-pen',    name: 'Lucky Deploy Pen',      slot: 'Accessory', rarity: 'Rare', stat: 'spd', bonus: 7,  extraStats: { atk: 4 } },
  { id: 'dual-monitor-stand',  name: 'Dual Monitor Stand',    slot: 'Armor',     rarity: 'Rare', stat: 'res', bonus: 8,  extraStats: { hp: 14 } },

  // ── Epic (3 stats) ────────────────────────────────────────────────────────
  { id: 'company-macbook',       name: 'Company MacBook',        slot: 'Weapon', rarity: 'Epic', stat: 'atk', bonus: 15, extraStats: { mag: 8, spd: 5 } },
  { id: 'noise-canceling-hoodie', name: 'Noise-Canceling Hoodie', slot: 'Armor', rarity: 'Epic', stat: 'res', bonus: 14, extraStats: { def: 7, hp: 22 } },
  { id: 'ergonomic-chair',       name: 'Ergonomic Chair',        slot: 'Armor', rarity: 'Epic', stat: 'def', bonus: 13, extraStats: { res: 7, hp: 20 } },
  { id: 'custom-keycap-set',     name: 'Custom Keycap Set',      slot: 'Weapon', rarity: 'Epic', stat: 'mag', bonus: 14, extraStats: { atk: 7, spd: 6 } },

  // ── Legendary (4 stats) ───────────────────────────────────────────────────
  { id: 'root-access-yubikey',   name: 'Root Access YubiKey',    slot: 'Accessory', rarity: 'Legendary', stat: 'mag', bonus: 18, extraStats: { atk: 9, spd: 7, def: 6 } },
  { id: 'golden-rubber-duck',    name: 'Golden Rubber Duck',     slot: 'Accessory', rarity: 'Legendary', stat: 'spd', bonus: 16, extraStats: { atk: 8, mag: 8, res: 6 } },
  { id: 'mythic-whiteboard',     name: 'Mythic Whiteboard',      slot: 'Armor',     rarity: 'Legendary', stat: 'def', bonus: 20, extraStats: { res: 9, hp: 30, mag: 7 } },

  // ── Mythic (5 stats — boosts all) ─────────────────────────────────────────
  { id: 'the-production-key',  name: 'The Production Key',  slot: 'Accessory', rarity: 'Mythic', stat: 'mag', bonus: 24, extraStats: { atk: 12, def: 10, res: 10, spd: 9 } },
  { id: 'omniscient-ide',      name: 'Omniscient IDE',      slot: 'Weapon',    rarity: 'Mythic', stat: 'atk', bonus: 24, extraStats: { mag: 12, spd: 10, hp: 36, def: 8 } },
];

export const pickEquipmentReward = (inventorySize: number): EquipmentItem | null => {
  // Rarity weights: Mythic extremely rare
  const weights: Record<HeroRarity, number> = {
    Common: 40, Rare: 30, Epic: 18, Legendary: 9, Mythic: 3,
  };
  const rarities = Object.keys(weights) as HeroRarity[];
  const totalWeight = rarities.reduce((s, r) => s + weights[r], 0);
  let roll = Math.random() * totalWeight;
  const targetRarity = rarities.find((r) => { roll -= weights[r]; return roll <= 0; }) ?? 'Common';

  const candidates = EQUIPMENT_POOL.filter((i) => i.rarity === targetRarity);
  const base = candidates[Math.floor(Math.random() * candidates.length)]
    ?? EQUIPMENT_POOL[0];
  if (!base) return null;

  // Generate fresh extra stats so each drop has varied secondaries
  const extraStats = buildExtraStats(base.stat, base.bonus, targetRarity);

  return {
    ...base,
    id: `${base.id}-${inventorySize + 1}`,
    ...(extraStats ? { extraStats } : {}),
  };
};

