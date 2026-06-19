import { STARTER_PARTY, getHeroTemplate } from '../data/heroes';
import { RAID_BOSS_TEMPLATE, getBossAppearance } from '../data/raidBosses';
import {
  getHeroProgress,
  getPartyPower,
  getScaledStats,
} from './progression';
import type {
  BattleAction,
  BattleHero,
  BattleLogEntry,
  BattleState,
  HeroSkill,
  PlayerSave,
  RaidBoss,
} from '../types';

const MAX_LOGS = 7;
const ULTIMATE_CHARGE = 100;

const createLogEntry = (
  message: string,
  tone: BattleLogEntry['tone']
): BattleLogEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  tone,
  message,
});

const addLog = (
  logs: BattleLogEntry[],
  message: string,
  tone: BattleLogEntry['tone']
) => [createLogEntry(message, tone), ...logs].slice(0, MAX_LOGS);

const getDamage = (
  attackerStat: number,
  defenderStat: number,
  power: number,
  floor: number
) => {
  const variance = 0.92 + Math.random() * 0.16;
  const rawDamage = attackerStat * power * variance - defenderStat * 0.38;

  return Math.max(floor, Math.round(rawDamage));
};

const buildBattleHero = (
  save: PlayerSave,
  heroId: string
): BattleHero | null => {
  const template = getHeroTemplate(heroId);

  if (!template) return null;

  const progress = getHeroProgress(save, heroId);
  const stats = getScaledStats(template, progress.level);

  return {
    id: template.id,
    name: template.name,
    title: template.title,
    role: template.role,
    rarity: template.rarity,
    icon: template.icon,
    spriteFrame: template.spriteFrame,
    level: progress.level,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    mag: stats.mag,
    res: stats.res,
    spd: stats.spd,
    charge: 0,
    skillCooldown: 0,
    skill: template.skill,
    ultimate: template.ultimate,
  };
};

const createRaidBoss = (save: PlayerSave): RaidBoss => {
  const powerBonus = Math.max(0, Math.round(getPartyPower(save) * 0.38));
  const raidLevel = Math.max(1, save.raidLevel);
  const levelMultiplier = 1 + (raidLevel - 1) * 0.16;
  const maxHp = Math.round((RAID_BOSS_TEMPLATE.hp + powerBonus) * levelMultiplier);
  const appearance = getBossAppearance(raidLevel);

  return {
    id: `${RAID_BOSS_TEMPLATE.id}-lv${raidLevel}`,
    name: appearance.name,
    title: `${appearance.title} · Lv ${raidLevel}`,
    icon: appearance.icon,
    spriteKey: appearance.spriteKey,
    maxHp,
    hp: maxHp,
    atk: Math.round(RAID_BOSS_TEMPLATE.atk * levelMultiplier),
    def: Math.round(RAID_BOSS_TEMPLATE.def * (1 + (raidLevel - 1) * 0.09)),
    mag: Math.round(RAID_BOSS_TEMPLATE.mag * levelMultiplier),
    res: Math.round(RAID_BOSS_TEMPLATE.res * (1 + (raidLevel - 1) * 0.09)),
    spd: RAID_BOSS_TEMPLATE.spd,
    countdown: RAID_BOSS_TEMPLATE.countdown,
  };
};

export const createBattleState = (save: PlayerSave): BattleState => {
  const partyIds = save.party.length > 0 ? save.party : STARTER_PARTY;
  const heroes = partyIds
    .map((heroId) => buildBattleHero(save, heroId))
    .filter((hero): hero is BattleHero => hero !== null)
    .sort((firstHero, secondHero) => secondHero.spd - firstHero.spd);

  return {
    status: 'active',
    heroes,
    boss: createRaidBoss(save),
    activeHeroIndex: 0,
    round: 1,
    totalDamage: 0,
    logs: [
      createLogEntry('Raid gate opened. Snoo Prime is charging.', 'system'),
    ],
  };
};

const getNextLivingHeroIndex = (
  heroes: BattleHero[],
  activeHeroIndex: number
) => {
  if (heroes.every((hero) => hero.hp <= 0)) return -1;

  for (let offset = 1; offset <= heroes.length; offset += 1) {
    const candidateIndex = (activeHeroIndex + offset) % heroes.length;
    const candidate = heroes[candidateIndex];

    if (candidate && candidate.hp > 0) return candidateIndex;
  }

  return -1;
};

const getLowestAlly = (heroes: BattleHero[]) => {
  const livingHeroes = heroes.filter((hero) => hero.hp > 0);

  return livingHeroes.sort(
    (firstHero, secondHero) =>
      firstHero.hp / firstHero.maxHp - secondHero.hp / secondHero.maxHp
  )[0];
};

const chargeHero = (
  hero: BattleHero,
  amount: number,
  action: BattleAction
): BattleHero => ({
  ...hero,
  charge:
    action === 'ultimate'
      ? 0
      : Math.min(ULTIMATE_CHARGE, hero.charge + amount),
});

const getActionSkill = (hero: BattleHero, action: BattleAction): HeroSkill => {
  if (action === 'ultimate' && hero.charge >= ULTIMATE_CHARGE) {
    return hero.ultimate;
  }

  if (action === 'skill') return hero.skill;

  return {
    id: 'basic-attack',
    name: 'Attack',
    summary: 'Basic attack',
    power: 1,
    kind: 'strike',
  };
};

const resolveHeal = (
  state: BattleState,
  actor: BattleHero,
  skill: HeroSkill,
  action: BattleAction
) => {
  const healAmount = Math.round((actor.mag + actor.res * 0.35) * skill.power);
  const chargedActor = chargeHero(actor, action === 'attack' ? 20 : 32, action);

  if (action === 'ultimate') {
    const heroes = state.heroes.map((hero) => {
      if (hero.hp <= 0) return hero;

      const nextHero = hero.id === actor.id ? chargedActor : hero;

      return {
        ...nextHero,
        hp: Math.min(nextHero.maxHp, nextHero.hp + healAmount),
      };
    });

    return {
      ...state,
      heroes,
      logs: addLog(
        state.logs,
        `${actor.name} used ${skill.name} and restored the party.`,
        'hero'
      ),
    };
  }

  const target = getLowestAlly(state.heroes);

  if (!target) return state;

  const heroes = state.heroes.map((hero) => {
    if (hero.id === actor.id) {
      const updatedActor =
        hero.id === target.id
          ? {
              ...chargedActor,
              hp: Math.min(chargedActor.maxHp, chargedActor.hp + healAmount),
            }
          : chargedActor;

      return updatedActor;
    }

    if (hero.id !== target.id) return hero;

    return {
      ...hero,
      hp: Math.min(hero.maxHp, hero.hp + healAmount),
    };
  });

  return {
    ...state,
    heroes,
    logs: addLog(
      state.logs,
      `${actor.name} used ${skill.name} on ${target.name}.`,
      'hero'
    ),
  };
};

const resolveHeroStrike = (
  state: BattleState,
  actor: BattleHero,
  skill: HeroSkill,
  action: BattleAction
) => {
  const isSpell = skill.kind === 'spell';
  const supportBoost = skill.kind === 'rally' ? actor.res * 0.32 : 0;
  const speedBoost = actor.role === 'Ranger' ? actor.spd * 0.34 : 0;
  const guardBoost = actor.role === 'Tank' ? actor.def * 0.42 : 0;
  const attackStat = isSpell
    ? actor.mag + supportBoost
    : actor.atk + speedBoost + guardBoost + supportBoost;
  const defenseStat = isSpell ? state.boss.res : state.boss.def;
  const damage = getDamage(attackStat, defenseStat, skill.power, 9);
  const nextBossHp = Math.max(0, state.boss.hp - damage);
  const chargedActor = chargeHero(actor, action === 'attack' ? 24 : 34, action);
  const heroes = state.heroes.map((hero) => {
    if (hero.id === actor.id) return chargedActor;

    if (skill.kind === 'rally' && hero.hp > 0) {
      return {
        ...hero,
        charge: Math.min(ULTIMATE_CHARGE, hero.charge + 10),
      };
    }

    return hero;
  });
  const status = nextBossHp <= 0 ? 'won' : state.status;

  return {
    ...state,
    status,
    heroes,
    boss: {
      ...state.boss,
      hp: nextBossHp,
    },
    totalDamage: state.totalDamage + damage,
    logs: addLog(
      state.logs,
      `${actor.name} used ${skill.name} for ${damage} damage.`,
      status === 'won' ? 'reward' : 'hero'
    ),
  };
};

const chooseBossTarget = (heroes: BattleHero[]) => {
  const tank = heroes.find((hero) => hero.role === 'Tank' && hero.hp > 0);

  if (tank) return tank;

  return getLowestAlly(heroes);
};

const resolveBossTurn = (state: BattleState): BattleState => {
  if (state.status !== 'active') return state;

  const specialAttack = state.boss.countdown <= 1;

  if (specialAttack) {
    const damage = Math.max(12, Math.round(state.boss.mag * 0.78));
    const heroes = state.heroes.map((hero) =>
      hero.hp > 0
        ? {
            ...hero,
            hp: Math.max(0, hero.hp - Math.max(8, damage - hero.res * 0.25)),
          }
        : hero
    );
    const status = heroes.every((hero) => hero.hp <= 0) ? 'lost' : 'active';
    const nextIndex = getNextLivingHeroIndex(heroes, state.activeHeroIndex);

    return {
      ...state,
      status,
      heroes,
      boss: {
        ...state.boss,
        countdown: 4,
      },
      activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
      round: nextIndex <= state.activeHeroIndex ? state.round + 1 : state.round,
      logs: addLog(
        state.logs,
        `${state.boss.name} cast Thread Quake across the party.`,
        'boss'
      ),
    };
  }

  const target = chooseBossTarget(state.heroes);

  if (!target) {
    return {
      ...state,
      status: 'lost',
      logs: addLog(state.logs, 'The party fell before the raid boss.', 'boss'),
    };
  }

  const damage = getDamage(state.boss.atk, target.def, 1.08, 8);
  const heroes = state.heroes.map((hero) =>
    hero.id === target.id
      ? {
          ...hero,
          hp: Math.max(0, hero.hp - damage),
        }
      : hero
  );
  const status = heroes.every((hero) => hero.hp <= 0) ? 'lost' : 'active';
  const nextIndex = getNextLivingHeroIndex(heroes, state.activeHeroIndex);

  return {
    ...state,
    status,
    heroes,
    boss: {
      ...state.boss,
      countdown: state.boss.countdown - 1,
    },
    activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
    round: nextIndex <= state.activeHeroIndex ? state.round + 1 : state.round,
    logs: addLog(
      state.logs,
      `${state.boss.name} hit ${target.name} for ${damage}.`,
      'boss'
    ),
  };
};

export const resolveHeroAction = (
  state: BattleState,
  action: BattleAction
): BattleState => {
  if (state.status !== 'active') return state;

  const actor = state.heroes[state.activeHeroIndex];

  if (!actor || actor.hp <= 0) {
    const nextIndex = getNextLivingHeroIndex(state.heroes, state.activeHeroIndex);

    return {
      ...state,
      activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
    };
  }

  // Enforce skill cooldown — fall back to basic attack if on cooldown
  const effectiveAction: BattleAction =
    action === 'skill' && actor.skillCooldown > 0 ? 'attack' : action;
  const newCooldown =
    effectiveAction === 'skill' ? 3 : Math.max(0, actor.skillCooldown - 1);

  const skill = getActionSkill(actor, effectiveAction);
  const afterHero =
    skill.kind === 'heal'
      ? resolveHeal(state, actor, skill, effectiveAction)
      : resolveHeroStrike(state, actor, skill, effectiveAction);

  // Apply cooldown update to the actor in the resulting state
  const afterCooldown = {
    ...afterHero,
    heroes: afterHero.heroes.map((hero) =>
      hero.id === actor.id ? { ...hero, skillCooldown: newCooldown } : hero
    ),
  };

  return resolveBossTurn(afterCooldown);
};

export const getActiveHero = (state: BattleState) =>
  state.heroes[state.activeHeroIndex] ?? null;

export const getBossHpPercent = (boss: RaidBoss) =>
  Math.max(0, Math.round((boss.hp / boss.maxHp) * 100));

export const canUseUltimate = (hero: BattleHero | null) =>
  hero ? hero.charge >= ULTIMATE_CHARGE && hero.hp > 0 : false;

export const canUseSkill = (hero: BattleHero | null) =>
  hero ? hero.skillCooldown === 0 && hero.hp > 0 : false;
