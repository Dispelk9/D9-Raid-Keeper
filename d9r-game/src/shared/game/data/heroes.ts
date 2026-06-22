import type { HeroRarity, HeroSkill, HeroSkillUnlock, HeroTemplate } from '../types';
import { backendDeveloper } from './heroes/backendDeveloper';
import { dataEngineer } from './heroes/dataEngineer';
import { devopsEngineer } from './heroes/devopsEngineer';
import { frontendDeveloper } from './heroes/frontendDeveloper';
import { qaTester } from './heroes/qaTester';
import { securityEngineer } from './heroes/securityEngineer';

export const HEROES: HeroTemplate[] = [
  frontendDeveloper,
  backendDeveloper,
  devopsEngineer,
  qaTester,
  securityEngineer,
  dataEngineer,
];

// All 6 heroes are unlocked from the start — no roll/recruit mechanic.
export const STARTER_PARTY = [
  frontendDeveloper.id,
  backendDeveloper.id,
  devopsEngineer.id,
  qaTester.id,
  securityEngineer.id,
];

const RARITY_ORDER: HeroRarity[] = [
  'Common',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
];

export const getHeroTemplate = (heroId: string) =>
  HEROES.find((hero) => hero.id === heroId);

export const getHeroSkillUnlocks = (hero: HeroTemplate): HeroSkillUnlock[] => [
  {
    level: 1,
    skill: hero.skill,
  },
  ...(hero.skillUnlocks ?? []),
];

export const getHeroSkillForLevel = (
  hero: HeroTemplate,
  level: number
): HeroSkill =>
  getHeroSkillUnlocks(hero)
    .filter((unlock) => level >= unlock.level)
    .sort((first, second) => second.level - first.level)[0]?.skill ??
  hero.skill;

export const getHeroSkillChoicesForLevel = (
  hero: HeroTemplate,
  level: number
): HeroSkill[] => {
  const primary = getHeroSkillForLevel(hero, level);

  return [primary, hero.secondarySkill].filter(
    (skill, index, skills) =>
      skills.findIndex((candidate) => candidate.id === skill.id) === index
  );
};

export const getNextHeroSkillUnlock = (hero: HeroTemplate, level: number) =>
  getHeroSkillUnlocks(hero)
    .filter((unlock) => unlock.level > level)
    .sort((first, second) => first.level - second.level)[0] ?? null;

export const getNextRarity = (rarity: HeroRarity) => {
  const index = RARITY_ORDER.indexOf(rarity);

  return RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, index + 1)] ?? rarity;
};

export const isMaxRarity = (rarity: HeroRarity) =>
  RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf('Legendary');
