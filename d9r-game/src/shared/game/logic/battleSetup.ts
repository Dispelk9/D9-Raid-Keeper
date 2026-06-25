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
  RAID_BOSSES,
  BOSS_SPRITE_FRAMES,
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
  const lootDamageBonus = getLootDamageBonus(save, heroId);
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

// Hidden floor encounter definitions: [left, right, center/back]
const HIDDEN_FLOOR_ENCOUNTERS: [string, string, string][] = [
  ['product-owner', 'project-manager', 'tech-lead'],
  ['engineering-manager', 'director-of-engineering', 'cco'],
];

const makeSingleBoss = (
  template: (typeof RAID_BOSSES)[number],
  encounterIndex: number,
  encounterCount: number,
  powerBonus: number,
  slotLabel: string,
  bossId: string
): RaidBoss => {
  const specialSkills =
    template.specialSkills ?? (template.specialSkill ? [template.specialSkill] : []);
  const maxHp = Math.round((template.stats.hp + powerBonus / 3) * 1.3);
  return {
    id: `${bossId}-enc${encounterIndex}`,
    name: template.name ?? bossId,
    title: `${slotLabel} · ${encounterIndex}/${encounterCount}`,
    icon: template.icon,
    spriteKey: 'snoo-bosses-right',
    spriteFrame: BOSS_SPRITE_FRAMES[bossId] ?? 0,
    maxHp,
    hp: maxHp,
    atk: Math.round(template.stats.atk * 3),
    def: Math.round(template.stats.def * 1.2),
    mag: Math.round(template.stats.mag * 3),
    res: Math.round(template.stats.res * 1.2),
    spd: template.stats.spd,
    countdown: template.stats.countdown,
    statusEffects: [],
    isElite: true,
    attackName: template.attackName ?? 'Formation Strike',
    ...(specialSkills.length > 0 ? { specialSkill: specialSkills[0]!, specialSkills } : {}),
  };
};

const createRaidBoss = (
  save: PlayerSave,
  options: CreateBattleStateOptions = {}
): { boss: RaidBoss; bossList?: RaidBoss[] } => {
  const powerBonus = Math.max(0, Math.round(getPartyPower(save) * 0.38));
  const raidLevel = Math.max(1, options.raidLevel ?? save.raidLevel);
  const encounterIndex = Math.max(1, options.encounterIndex ?? 1);
  const encounterCount = Math.max(1, options.encounterCount ?? 1);
  const node = getRaidNode(raidLevel);

  // ── Hidden Floor (level 7): true multi-boss — 3 independent bosses ───────
  if (node.isHiddenFloor) {
    const encBossIds = HIDDEN_FLOOR_ENCOUNTERS[encounterIndex - 1] ?? HIDDEN_FLOOR_ENCOUNTERS[1]!;
    const [id0, id1, id2] = encBossIds;
    const t0 = RAID_BOSSES.find(b => b.id === id0) ?? RAID_BOSSES[0]!;
    const t1 = RAID_BOSSES.find(b => b.id === id1) ?? RAID_BOSSES[1]!;
    const t2 = RAID_BOSSES.find(b => b.id === id2) ?? RAID_BOSSES[2]!;
    const titles = encounterIndex === 1
      ? ['Dept. Head', 'Dept. Head', 'Dept. Head']
      : ['C-Suite', 'C-Suite', 'C-Suite'];
    const boss0 = makeSingleBoss(t0, encounterIndex, encounterCount, powerBonus, titles[0]!, id0!);
    const boss1 = makeSingleBoss(t1, encounterIndex, encounterCount, powerBonus, titles[1]!, id1!);
    const boss2 = makeSingleBoss(t2, encounterIndex, encounterCount, powerBonus, titles[2]!, id2!);
    return { boss: boss0, bossList: [boss0, boss1, boss2] };
  }

  // ── Normal boss ───────────────────────────────────────────────────────────
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
    boss: {
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
    },
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

  const { boss, bossList } = createRaidBoss(save, options);

  return {
    status: 'active',
    heroes,
    boss,
    ...(bossList ? { bossList, activeBossIndex: 0 } : {}),
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
