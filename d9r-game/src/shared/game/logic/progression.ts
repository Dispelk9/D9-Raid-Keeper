import { pickEquipmentReward } from '../data/equipment';
import { HEROES, STARTER_PARTY, getHeroTemplate } from '../data/heroes';
import type {
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

export const createInitialPlayerSave = (username: string): PlayerSave => ({
  version: 1,
  username,
  gold: 320,
  gems: 120,
  energy: 100,
  raidTokens: 0,
  heroes: HEROES.map((hero, index) => ({
    heroId: hero.id,
    level: index < 5 ? 4 : 1,
    exp: 0,
  })),
  party: STARTER_PARTY,
  inventory: [],
  raidLevel: 1,
  totalRaidDamage: 0,
  bestRaidDamage: 0,
  dailyClaimedAt: null,
  updatedAt: new Date().toISOString(),
});

export const getHeroProgress = (
  save: PlayerSave,
  heroId: string
): HeroProgress => {
  const progress = save.heroes.find((hero) => hero.heroId === heroId);

  if (progress) return progress;

  return {
    heroId,
    level: 1,
    exp: 0,
  };
};

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

export const getUpgradeCost = (level: number) => 75 + level * 45;

export const getLevelExpRequirement = (level: number) => 80 + level * 30;

export const canUpgradeHero = (save: PlayerSave, heroId: string) => {
  const progress = getHeroProgress(save, heroId);

  return progress.level < LEVEL_CAP && save.gold >= getUpgradeCost(progress.level);
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
  inventorySize: number
): RewardBundle => {
  const equipment = victory ? pickEquipmentReward(inventorySize) : null;

  return {
    gold: Math.max(35, Math.round(totalDamage * 0.26)) + (victory ? 160 : 0),
    gems: victory ? 12 : 3,
    energy: victory ? 8 : 3,
    raidTokens: Math.max(1, Math.floor(totalDamage / 140)) + (victory ? 5 : 0),
    exp: Math.max(16, Math.round(totalDamage * 0.08)) + (victory ? 44 : 0),
    equipment: equipment ? [equipment] : [],
  };
};

export const applyBattleRewards = (
  save: PlayerSave,
  rewards: RewardBundle,
  totalDamage: number
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

  return {
    ...save,
    gold: save.gold + rewards.gold,
    gems: save.gems + rewards.gems,
    energy: Math.min(100, save.energy + rewards.energy),
    raidTokens: save.raidTokens + rewards.raidTokens,
    heroes: updatedHeroes,
    inventory: [...save.inventory, ...rewards.equipment],
    raidLevel: save.raidLevel + 1,
    totalRaidDamage: save.totalRaidDamage + totalDamage,
    bestRaidDamage: Math.max(save.bestRaidDamage, totalDamage),
    updatedAt: new Date().toISOString(),
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

    return total + stats.hp * 0.08 + stats.atk + stats.def + stats.mag + stats.res;
  }, 0);
