import { pickEquipmentReward } from '../data/equipment';
import {
  HEROES,
  STARTER_PARTY,
  getHeroTemplate,
  getNextRarity,
  isMaxRarity,
} from '../data/heroes';
export { HEROES, STARTER_PARTY };
import { RAID_NODES } from '../data/raidBosses';
import type {
  HeroRarity,
  HeroProgress,
  HeroTemplate,
  PlayerSave,
  RewardBundle,
  StatBlock,
} from '../types';

const DAILY_GOLD = 140;
const DAILY_GEMS = 30;
const DAILY_ENERGY = 35;
const LEVEL_CAP = 50;
export const ENERGY_REGEN_MS = 3 * 60 * 1000; // 3 minutes per 1 energy
const MAX_ENERGY = 100;
export const HERO_GEM_UPGRADE_COST = 40;
export const HERO_STAR_MAX = 10;
export const LOOT_TOKEN_UPGRADE_COST = 30;
export const LOOT_BONUS_LEVEL_MAX = 10;
const MAX_RAID_LEVEL = RAID_NODES.length;

export const DAILY_REWARD = {
  gold: DAILY_GOLD,
  gems: DAILY_GEMS,
  energy: DAILY_ENERGY,
} as const;

// Apply accumulated energy regen to a save. Call on load and after spending energy.
export const computeEnergyRegen = (save: PlayerSave, nowMs?: number): PlayerSave => {
  const now = nowMs ?? Date.now();
  if (save.energy >= MAX_ENERGY) return { ...save, energyRefillAt: null };
  const refillTs = save.energyRefillAt
    ? new Date(save.energyRefillAt).getTime()
    : new Date(save.updatedAt).getTime();
  if (now < refillTs) return save;
  const gained = Math.floor((now - refillTs) / ENERGY_REGEN_MS) + 1;
  const newEnergy = Math.min(MAX_ENERGY, save.energy + gained);
  const newRefillAt = newEnergy >= MAX_ENERGY
    ? null
    : new Date(refillTs + gained * ENERGY_REGEN_MS).toISOString();
  return { ...save, energy: newEnergy, energyRefillAt: newRefillAt };
};

export const createInitialPlayerSave = (username: string): PlayerSave => ({
  version: 1,
  username,
  gold: 320,
  gems: 120,
  energy: 100,
  energyRefillAt: null,
  lastCommunityBoostAt: null,
  lastShipItAt: null,
  raidTokens: 0,
  // All heroes unlocked from the start — no roll/recruit needed.
  heroes: HEROES.map((hero) => ({
    heroId: hero.id,
    level: 4,
    exp: 0,
    rarity: hero.rarity,
    starLevel: 0,
  })),
  party: STARTER_PARTY,
  inventory: [],
  raidLevel: 1,
  totalRaidDamage: 0,
  bestRaidDamage: 0,
  dailyClaimedAt: null,
  // Use epoch so a fresh initial save always loses the timestamp comparison
  // against any real local save (see loadKeeperSave in api.ts)
  updatedAt: '2000-01-01T00:00:00.000Z',
});

export const normalizePlayerSave = (save: PlayerSave): PlayerSave => {
  const initialSave = createInitialPlayerSave(save.username);
  const initialHeroes = new Map(
    initialSave.heroes.map((hero) => [hero.heroId, hero])
  );
  const existingHeroes = new Map(save.heroes.map((hero) => [hero.heroId, hero]));
  const heroes = HEROES.map((hero) => {
    const existing = existingHeroes.get(hero.id);
    const initial = initialHeroes.get(hero.id)!;

    if (!existing) return initial;

    return {
      heroId: hero.id,
      level: Math.max(1, Math.min(LEVEL_CAP, Math.floor(existing.level))),
      exp: Math.max(0, Math.floor(existing.exp)),
      rarity: existing.rarity ?? hero.rarity,
      starLevel: Math.max(0, Math.min(HERO_STAR_MAX, existing.starLevel ?? 0)),
    };
  });
  const ownedHeroIds = new Set(heroes.map((hero) => hero.heroId));
  const party = save.party
    .filter((heroId) => ownedHeroIds.has(heroId))
    .slice(0, 5);

  for (const hero of HEROES) {
    if (party.length >= 5) break;
    if (!party.includes(hero.id)) party.push(hero.id);
  }

  return {
    ...save,
    heroes,
    party,
    energyRefillAt: save.energyRefillAt ?? null,
    lastCommunityBoostAt: save.lastCommunityBoostAt ?? null,
    lastShipItAt: save.lastShipItAt ?? null,
    inventory: save.inventory.map((item) => ({
      ...item,
      bonusLevel: item.bonusLevel ?? 0,
    })),
  };
};

export const getHeroProgress = (
  save: PlayerSave,
  heroId: string
): HeroProgress => {
  const progress = save.heroes.find((hero) => hero.heroId === heroId);

  if (progress) return progress;
  const template = getHeroTemplate(heroId);

  return {
    heroId,
    level: 1,
    exp: 0,
    ...(template ? { rarity: template.rarity } : {}),
  };
};

export const getEffectiveHeroRarity = (
  save: PlayerSave,
  template: HeroTemplate
): HeroRarity => getHeroProgress(save, template.id).rarity ?? template.rarity;

export const getScaledStats = (
  template: HeroTemplate,
  level: number
): StatBlock => {
  const growth = 1 + (Math.max(1, level) - 1) * 0.085;

  return {
    hp: Math.round(template.stats.hp * growth + level * 7),
    atk: Math.round(template.stats.atk * growth + level * 1.6),
    def: Math.round(template.stats.def * growth + level * 1.25),
    mag: Math.round(template.stats.mag * growth + level * 1.6),
    res: Math.round(template.stats.res * growth + level * 1.25),
    spd: Math.round(template.stats.spd * (1 + (level - 1) * 0.025)),
  };
};

// Returns the aggregate stat bonuses from equipped loot for one hero,
// respecting each item's primary stat and any extraStats it carries.
export const getLootStatBonuses = (save: PlayerSave, heroId?: string): Partial<StatBlock> => {
  const items = (() => {
    if (!heroId || !save.equippedLoot) return save.inventory;
    const ids = new Set(save.equippedLoot[heroId] ?? []);
    return ids.size === 0 ? [] : save.inventory.filter((i) => ids.has(i.id));
  })();

  const out: Partial<StatBlock> = {};
  for (const item of items) {
    out[item.stat] = (out[item.stat] ?? 0) + item.bonus;
    if (item.extraStats) {
      for (const [s, v] of Object.entries(item.extraStats) as [keyof StatBlock, number][]) {
        out[s] = (out[s] ?? 0) + v;
      }
    }
  }
  return out;
};

// Legacy scalar helper — kept for callers that only care about atk/mag sum.
export const getLootDamageBonus = (save: PlayerSave, heroId?: string): number => {
  const b = getLootStatBonuses(save, heroId);
  return (b.atk ?? 0) + (b.mag ?? 0);
};

export const getEquippedHeroId = (save: PlayerSave, itemId: string): string | null => {
  const equipped = save.equippedLoot ?? {};
  for (const [heroId, itemIds] of Object.entries(equipped)) {
    if (itemIds.includes(itemId)) return heroId;
  }
  return null;
};

const SELL_PRICE: Record<string, number> = {
  Common: 20, Rare: 60, Epic: 150, Legendary: 400, Mythic: 1000,
};

export const sellLoot = (
  save: PlayerSave,
  itemId: string
): { sold: boolean; save: PlayerSave; gold?: number } => {
  const item = save.inventory.find(i => i.id === itemId);
  if (!item) return { sold: false, save };
  const goldGain = SELL_PRICE[item.rarity] ?? 20;
  const newEquipped: Record<string, string[]> = {};
  for (const [hId, ids] of Object.entries(save.equippedLoot ?? {})) {
    const filtered = ids.filter(id => id !== itemId);
    if (filtered.length > 0) newEquipped[hId] = filtered;
  }
  return {
    sold: true,
    gold: goldGain,
    save: {
      ...save,
      inventory: save.inventory.filter(i => i.id !== itemId),
      gold: save.gold + goldGain,
      equippedLoot: newEquipped,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const equipLoot = (
  save: PlayerSave,
  heroId: string,
  itemId: string
): { equipped: boolean; message?: string; save: PlayerSave } => {
  if (!save.inventory.find(i => i.id === itemId)) {
    return { equipped: false, message: 'Item not found', save };
  }
  const equipped: Record<string, string[]> = {};
  for (const [hId, ids] of Object.entries(save.equippedLoot ?? {})) {
    equipped[hId] = ids.filter(id => id !== itemId); // remove from old hero
  }
  const heroSlots = equipped[heroId] ?? [];
  if (heroSlots.length >= 3) {
    return { equipped: false, message: 'Hero already has 3 items equipped', save };
  }
  equipped[heroId] = [...heroSlots, itemId];
  return {
    equipped: true,
    save: { ...save, equippedLoot: equipped, updatedAt: new Date().toISOString() },
  };
};

export const unequipLoot = (save: PlayerSave, itemId: string): PlayerSave => {
  const equipped: Record<string, string[]> = {};
  for (const [heroId, ids] of Object.entries(save.equippedLoot ?? {})) {
    const filtered = ids.filter(id => id !== itemId);
    if (filtered.length > 0) equipped[heroId] = filtered;
  }
  return { ...save, equippedLoot: equipped, updatedAt: new Date().toISOString() };
};

export const getUpgradeCost = (level: number) => 75 + level * 45;

export const getLevelExpRequirement = (level: number) => 80 + level * 30;

export const canUpgradeHero = (save: PlayerSave, heroId: string) => {
  const progress = getHeroProgress(save, heroId);

  return (
    progress.level < LEVEL_CAP && save.gold >= getUpgradeCost(progress.level)
  );
};

export const upgradeHero = (save: PlayerSave, heroId: string) => {
  const progress = getHeroProgress(save, heroId);
  const cost = getUpgradeCost(progress.level);

  if (!canUpgradeHero(save, heroId)) {
    return {
      save,
      upgraded: false,
    };
  }

  const updatedHeroes = save.heroes.map((hero) =>
    hero.heroId === heroId
      ? {
          ...hero,
          level: Math.min(LEVEL_CAP, hero.level + 1),
        }
      : hero
  );

  return {
    save: {
      ...save,
      gold: save.gold - cost,
      heroes: updatedHeroes,
      updatedAt: new Date().toISOString(),
    },
    upgraded: true,
  };
};

export const createBattleRewards = (
  totalDamage: number,
  victory: boolean,
  inventorySize: number,
  battlesCleared = victory ? 1 : 0,
  battleCount = 1
): RewardBundle => {
  const equipment = victory ? pickEquipmentReward(inventorySize) : null;
  const clearRatio = battleCount > 0 ? battlesCleared / battleCount : 0;
  const partialGemReward = Math.max(
    1,
    Math.round(1 + battlesCleared * 6 + clearRatio * 8)
  );

  return {
    gold:
      Math.max(35, Math.round(totalDamage * 0.25)) +
      (victory ? 150 + battlesCleared * 25 : Math.round(50 * clearRatio)),
    gems: victory
      ? 12 + battlesCleared * 4
      : partialGemReward,
    energy: 0,
    raidTokens:
      Math.max(1, Math.floor(totalDamage / 140)) +
      (victory ? 5 + battlesCleared : battlesCleared),
    exp:
      Math.max(16, Math.round(totalDamage * 0.08)) +
      (victory ? 40 + battlesCleared * 8 : battlesCleared * 8),
    equipment: equipment ? [equipment] : [],
  };
};

export const applyBattleRewards = (
  save: PlayerSave,
  rewards: RewardBundle,
  totalDamage: number,
  options: {
    victory: boolean;
    raidLevel?: number;
  } = { victory: true }
): PlayerSave => {
  const partyHeroIds = new Set(save.party);
  const updatedHeroes = save.heroes.map((hero) => {
    if (!partyHeroIds.has(hero.heroId)) return hero;

    const nextExp = hero.exp + rewards.exp;
    const neededExp = getLevelExpRequirement(hero.level);

    if (nextExp < neededExp || hero.level >= LEVEL_CAP) {
      return {
        ...hero,
        exp: nextExp,
      };
    }

    return {
      ...hero,
      level: Math.min(LEVEL_CAP, hero.level + 1),
      exp: nextExp - neededExp,
    };
  });

  const completedNewestNode =
    options.victory &&
    typeof options.raidLevel === 'number' &&
    options.raidLevel >= save.raidLevel;

  return {
    ...save,
    gold: save.gold + rewards.gold,
    gems: save.gems + rewards.gems,
    energy: Math.min(100, save.energy + rewards.energy),
    raidTokens: save.raidTokens + rewards.raidTokens,
    heroes: updatedHeroes,
    inventory: [...save.inventory, ...rewards.equipment],
    raidLevel: completedNewestNode
      ? Math.min(MAX_RAID_LEVEL + 1, options.raidLevel! + 1)
      : save.raidLevel,
    totalRaidDamage: save.totalRaidDamage + totalDamage,
    bestRaidDamage: Math.max(save.bestRaidDamage, totalDamage),
    updatedAt: new Date().toISOString(),
  };
};

export const isHeroFullyUpgraded = (save: PlayerSave, heroId: string): boolean => {
  const progress = save.heroes.find((h) => h.heroId === heroId);
  if (!progress) return false;
  const template = getHeroTemplate(heroId);
  const rarity = progress.rarity ?? template?.rarity ?? 'Common';
  return isMaxRarity(rarity) && (progress.starLevel ?? 0) >= HERO_STAR_MAX;
};

export const canUpgradeHeroWithGem = (save: PlayerSave, heroId: string): boolean => {
  if (save.gems < HERO_GEM_UPGRADE_COST) return false;
  return !isHeroFullyUpgraded(save, heroId);
};

export const upgradeHeroWithGem = (save: PlayerSave, heroId: string) => {
  const template = getHeroTemplate(heroId);
  if (!template) return { save, upgraded: false, message: 'Unknown hero.' };

  if (save.gems < HERO_GEM_UPGRADE_COST) {
    return { save, upgraded: false, message: `Need ${HERO_GEM_UPGRADE_COST} gems.` };
  }

  const progress = save.heroes.find((h) => h.heroId === heroId);
  if (!progress) return { save, upgraded: false, message: 'Hero not found.' };

  const baseSave = {
    ...save,
    gems: save.gems - HERO_GEM_UPGRADE_COST,
    updatedAt: new Date().toISOString(),
  };
  const currentRarity = progress.rarity ?? template.rarity;

  if (!isMaxRarity(currentRarity)) {
    const nextRarity = getNextRarity(currentRarity);
    return {
      save: {
        ...baseSave,
        heroes: save.heroes.map((h) =>
          h.heroId === heroId ? { ...h, rarity: nextRarity } : h
        ),
      },
      upgraded: true,
      message: `${template.name} advanced to ${nextRarity}!`,
    };
  }

  const starLevel = progress.starLevel ?? 0;
  if (starLevel < HERO_STAR_MAX) {
    const nextStar = starLevel + 1;
    return {
      save: {
        ...baseSave,
        heroes: save.heroes.map((h) =>
          h.heroId === heroId ? { ...h, starLevel: nextStar } : h
        ),
      },
      upgraded: true,
      message: `${template.name} reached +${nextStar}!`,
    };
  }

  // Hero is fully maxed — convert gem cost into a raid token instead
  return {
    save: {
      ...baseSave,
      raidTokens: save.raidTokens + 1,
    },
    upgraded: true,
    message: `${template.name} is maxed — gem converted to token.`,
  };
};

export const canUpgradeLootWithToken = (save: PlayerSave, itemId: string): boolean => {
  if (save.raidTokens < LOOT_TOKEN_UPGRADE_COST) return false;
  const item = save.inventory.find((i) => i.id === itemId);
  return !!item && (item.bonusLevel ?? 0) < LOOT_BONUS_LEVEL_MAX;
};

export const upgradeLootWithToken = (save: PlayerSave, itemId: string) => {
  const item = save.inventory.find((i) => i.id === itemId);
  if (!item) return { save, upgraded: false, message: 'Item not found.' };

  if (save.raidTokens < LOOT_TOKEN_UPGRADE_COST) {
    return { save, upgraded: false, message: `Need ${LOOT_TOKEN_UPGRADE_COST} tokens.` };
  }

  const currentLevel = item.bonusLevel ?? 0;
  if (currentLevel >= LOOT_BONUS_LEVEL_MAX) {
    return { save, upgraded: false, message: `${item.name} is already at max upgrade.` };
  }

  const nextLevel = currentLevel + 1;
  return {
    save: {
      ...save,
      raidTokens: save.raidTokens - LOOT_TOKEN_UPGRADE_COST,
      inventory: save.inventory.map((i) =>
        i.id === itemId
          ? { ...i, bonus: i.bonus + 10, bonusLevel: nextLevel }
          : i
      ),
      updatedAt: new Date().toISOString(),
    },
    upgraded: true,
    message: `${item.name} upgraded to +${nextLevel} (${item.stat.toUpperCase()} +${item.bonus + 10})`,
  };
};

const getDayKey = (date: Date) => date.toISOString().slice(0, 10);

export const canClaimDailyReward = (save: PlayerSave, date = new Date()) =>
  save.dailyClaimedAt !== getDayKey(date);

export const claimDailyReward = (save: PlayerSave, date = new Date()) => {
  if (!canClaimDailyReward(save, date)) {
    return {
      save,
      claimed: false,
    };
  }

  return {
    save: {
      ...save,
      gold: save.gold + DAILY_GOLD,
      gems: save.gems + DAILY_GEMS,
      energy: Math.min(100, save.energy + DAILY_ENERGY),
      dailyClaimedAt: getDayKey(date),
      updatedAt: new Date().toISOString(),
    },
    claimed: true,
  };
};

export const getPartyPower = (save: PlayerSave) =>
  save.party.reduce((total, heroId) => {
    const template = getHeroTemplate(heroId);
    if (!template) return total;

    const progress = getHeroProgress(save, heroId);
    const stats = getScaledStats(template, progress.level);
    const lb = getLootStatBonuses(save, heroId);

    return (
      total +
      (stats.hp  + (lb.hp  ?? 0)) * 0.08 +
      (stats.atk + (lb.atk ?? 0)) +
      (stats.def + (lb.def ?? 0)) +
      (stats.mag + (lb.mag ?? 0)) +
      (stats.res + (lb.res ?? 0))
    );
  }, 0);
