import type { HeroProgress, PlayerSave } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isHeroProgress = (value: unknown): value is HeroProgress => {
  if (!isRecord(value)) return false;

  return (
    typeof value.heroId === 'string' &&
    typeof value.level === 'number' &&
    typeof value.exp === 'number'
  );
};

export const isPlayerSave = (value: unknown): value is PlayerSave => {
  if (!isRecord(value)) return false;

  return (
    value.version === 1 &&
    typeof value.username === 'string' &&
    typeof value.gold === 'number' &&
    typeof value.gems === 'number' &&
    typeof value.energy === 'number' &&
    typeof value.raidTokens === 'number' &&
    Array.isArray(value.heroes) &&
    value.heroes.every(isHeroProgress) &&
    isStringArray(value.party) &&
    Array.isArray(value.inventory) &&
    typeof value.totalRaidDamage === 'number' &&
    typeof value.bestRaidDamage === 'number' &&
    (typeof value.dailyClaimedAt === 'string' || value.dailyClaimedAt === null) &&
    typeof value.updatedAt === 'string'
  );
};
