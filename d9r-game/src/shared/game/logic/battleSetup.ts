import {
  STARTER_PARTY,
  getHeroSkillChoicesForLevel,
  getHeroSkillForLevel,
  getHeroTemplate,
} from '../data/heroes';
import {
  getBossAppearance,
  getBossTemplate,
  getRaidNode,
  MINI_BOSS_SECRETARY_KEY,
  MINI_BOSS_SECURITY_KEY,
} from '../data/raidBosses';
import {
  getHeroProgress,
  getLootDamageBonus,
  getPartyPower,
  getScaledStats,
} from './progression';
import type {
  BattleHero,
  BattleState,
  PlayerSave,
  RaidBoss,
} from '../types';
import { createLogEntry, ULTIMATE_CHARGE } from './combatCalcs';

export type CreateBattleStateOptions = {
  raidLevel?: number;
  bossId?: string;
  encounterIndex?: number;
  encounterCount?: number;
};

const buildBattleHero = (
  save: PlayerSave,
  heroId: string
): BattleHero | null => {
  const template = getHeroTemplate(heroId);

  if (!template) return null;

  const progress = getHeroProgress(save, heroId);
  const stats = getScaledStats(template, progress.level);
  const lootDamageBonus = getLootDamageBonus(save);
  const skillOptions = getHeroSkillChoicesForLevel(template, progress.level);

  return {
    id: template.id,
    name: template.name,
    title: template.title,
    role: template.role,
    rarity: progress.rarity ?? template.rarity,
    icon: template.icon,
    spriteFrame: template.spriteFrame,
    level: progress.level,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk + lootDamageBonus,
    def: stats.def,
    mag: stats.mag + lootDamageBonus,
    res: stats.res,
    spd: stats.spd,
    charge: 0,
    skillCooldown: 0,
    skill: skillOptions[0] ?? getHeroSkillForLevel(template, progress.level),
    skillOptions,
    ultimate: template.ultimate,
    statusEffects: [],
  };
};

const createRaidBoss = (
  save: PlayerSave,
  options: CreateBattleStateOptions = {}
): RaidBoss => {
  const powerBonus = Math.max(0, Math.round(getPartyPower(save) * 0.38));
  const raidLevel = Math.max(1, options.raidLevel ?? save.raidLevel);
  const encounterIndex = Math.max(1, options.encounterIndex ?? 1);
  const encounterCount = Math.max(1, options.encounterCount ?? 1);
  const node = getRaidNode(raidLevel);
  const bossTemplate = getBossTemplate(options.bossId ?? node.bossId);
  const specialSkills =
    bossTemplate.specialSkills ??
    (bossTemplate.specialSkill ? [bossTemplate.specialSkill] : []);
  const levelMultiplier = 1 + (raidLevel - 1) * 0.16 + (encounterIndex - 1) * 0.08;
  const finalEncounterMultiplier = encounterIndex >= encounterCount ? 1.18 : 1;
  const maxHp = Math.round(
    (bossTemplate.stats.hp + powerBonus) *
      levelMultiplier *
      finalEncounterMultiplier
  );
  const appearance = getBossAppearance(raidLevel, bossTemplate.id);
  const encounterLabel =
    encounterCount > 1 ? ` · ${encounterIndex}/${encounterCount}` : '';

  // Non-final encounters use a mini-boss sprite instead of the floor boss Snoo
  const isMiniBoss = encounterIndex < encounterCount;
  const miniBossKey = raidLevel <= 3 ? MINI_BOSS_SECRETARY_KEY : MINI_BOSS_SECURITY_KEY;
  const miniBossName = raidLevel <= 3 ? 'Secretary' : 'Security';
  const miniBossTitle = raidLevel <= 3 ? 'Office Gatekeeper' : 'Security Chief';

  return {
    id: `${bossTemplate.id}-lv${raidLevel}-${encounterIndex}`,
    name: isMiniBoss ? miniBossName : appearance.name,
    title: `${isMiniBoss ? miniBossTitle : appearance.title} · Lv ${raidLevel}${encounterLabel}`,
    icon: appearance.icon,
    spriteKey: isMiniBoss ? miniBossKey : appearance.spriteKey,
    ...(isMiniBoss
      ? { spriteFrame: 0 }
      : typeof appearance.spriteFrame === 'number'
        ? { spriteFrame: appearance.spriteFrame }
        : {}),
    maxHp,
    hp: maxHp,
    atk: Math.round(bossTemplate.stats.atk * levelMultiplier),
    def: Math.round(bossTemplate.stats.def * (1 + (raidLevel - 1) * 0.08)),
    mag: Math.round(bossTemplate.stats.mag * levelMultiplier),
    res: Math.round(bossTemplate.stats.res * (1 + (raidLevel - 1) * 0.08)),
    spd: bossTemplate.stats.spd,
    countdown: bossTemplate.stats.countdown,
    statusEffects: [],
    isElite: encounterIndex >= encounterCount || raidLevel >= 4,
    attackName: bossTemplate.attackName ?? 'Attack',
    ...(specialSkills.length > 0
      ? {
          specialSkill: specialSkills[0]!,
          specialSkills,
        }
      : {}),
  };
};

export const createBattleState = (
  save: PlayerSave,
  options: CreateBattleStateOptions = {}
): BattleState => {
  const partyIds = save.party.length > 0 ? save.party : STARTER_PARTY;
  const heroes = partyIds
    .map((heroId) => buildBattleHero(save, heroId))
    .filter((hero): hero is BattleHero => hero !== null)
    .sort((firstHero, secondHero) => secondHero.spd - firstHero.spd);

  return {
    status: 'active',
    heroes,
    boss: createRaidBoss(save, options),
    activeHeroIndex: 0,
    round: 1,
    totalDamage: 0,
    logs: [
      createLogEntry(
        `Raid node ${options.raidLevel ?? save.raidLevel} opened. Keep the team off the layoff list.`,
        'system'
      ),
    ],
    raidLevel: Math.max(1, options.raidLevel ?? save.raidLevel),
    encounterIndex: Math.max(1, options.encounterIndex ?? 1),
    encounterCount: Math.max(1, options.encounterCount ?? 1),
  };
};
