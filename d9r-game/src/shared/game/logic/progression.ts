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

export const createInitialPlayerSave = (username: string): PlayerSave => ({
  version: 1,
  username,
  gold: 320,
  gems: 120,
  energy: 100,
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
  updatedAt: new Date().toISOString(),
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

export const getLootDamageBonus = (save: PlayerSave) =>
  save.inventory.reduce((total, item) => total + item.bonus, 0);

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
    energy: victory ? 8 : Math.max(2, Math.round(2 + clearRatio * 5)),
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
    message: `${item.name} upgraded to +${nextLevel} (DMG +${item.bonus + 10})`,
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
    const lootDamageBonus = getLootDamageBonus(save);

    return (
      total +
      stats.hp * 0.08 +
      stats.atk +
      lootDamageBonus +
      stats.def +
      stats.mag +
      lootDamageBonus +
      stats.res
    );
  }, 0);
