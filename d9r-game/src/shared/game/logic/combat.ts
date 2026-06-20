import {
  STARTER_PARTY,
  getHeroSkillForLevel,
  getHeroTemplate,
} from '../data/heroes';
import {
  RAID_BOSS_TEMPLATE,
  getBossAppearance,
  isEliteBoss,
  getEliteSkill,
} from '../data/raidBosses';
import { getHeroProgress, getPartyPower, getScaledStats } from './progression';
import type {
  BattleAction,
  BattleHero,
  BattleLogEntry,
  BattleStatusEffect,
  BattleState,
  HeroSkill,
  PlayerSave,
  RaidBoss,
} from '../types';

export const MAX_LOGS = 7;
const ULTIMATE_CHARGE = 100;
const BASE_MISS_CHANCE = 0.07;
const MIN_MISS_CHANCE = 0.03;
const MAX_MISS_CHANCE = 0.35;
const MIN_CRIT_CHANCE = 0.04;
const MAX_CRIT_CHANCE = 0.3;

type BattleCombatant = Pick<BattleHero | RaidBoss, 'spd' | 'statusEffects'>;

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
  const rawDamage = attackerStat * power * variance - defenderStat * 0.22;

  return Math.max(floor, Math.round(rawDamage));
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getEffectTotal = (
  combatant: BattleCombatant,
  key: 'accuracyModifier' | 'evasionModifier'
) =>
  combatant.statusEffects.reduce(
    (total, effect) => total + (effect[key] ?? 0),
    0
  );

const getMissChance = (
  attacker: BattleCombatant,
  defender: BattleCombatant,
  skill: HeroSkill
) => {
  const speedGapPenalty = (defender.spd - attacker.spd) * 0.003;
  const accuracy =
    getEffectTotal(attacker, 'accuracyModifier') + (skill.accuracyBonus ?? 0);
  const evasion = getEffectTotal(defender, 'evasionModifier');
  const confusePenalty = attacker.statusEffects.some(
    (e) => e.effectType === 'confuse'
  )
    ? 0.32
    : 0;

  return clamp(
    BASE_MISS_CHANCE + speedGapPenalty - accuracy + evasion + confusePenalty,
    MIN_MISS_CHANCE,
    MAX_MISS_CHANCE
  );
};

const getCritChance = (attacker: BattleCombatant, skill: HeroSkill) =>
  clamp(
    MIN_CRIT_CHANCE + attacker.spd * 0.0028 + (skill.critBonus ?? 0),
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE
  );

const createStatusEffect = (skill: HeroSkill): BattleStatusEffect | null => {
  if (!skill.effect) return null;

  const statusEffect: BattleStatusEffect = {
    id: skill.id,
    name: skill.name,
    duration: skill.effect.duration,
  };

  if (typeof skill.effect.accuracyModifier === 'number') {
    statusEffect.accuracyModifier = skill.effect.accuracyModifier;
  }

  if (typeof skill.effect.evasionModifier === 'number') {
    statusEffect.evasionModifier = skill.effect.evasionModifier;
  }

  return statusEffect;
};

const addStatusEffect = (
  effects: BattleStatusEffect[],
  nextEffect: BattleStatusEffect
) => [nextEffect, ...effects.filter((effect) => effect.id !== nextEffect.id)];

const tickStatusEffects = (effects: BattleStatusEffect[]) =>
  effects
    .map((effect) => ({
      ...effect,
      duration: effect.duration - 1,
    }))
    .filter((effect) => effect.duration > 0);

const tickBattleEffects = (state: BattleState): BattleState => ({
  ...state,
  heroes: state.heroes.map((hero) => ({
    ...hero,
    statusEffects: tickStatusEffects(hero.statusEffects),
  })),
  boss: {
    ...state.boss,
    statusEffects: tickStatusEffects(state.boss.statusEffects),
  },
});

const applySkillEffect = (
  skill: HeroSkill,
  actor: BattleHero,
  heroes: BattleHero[],
  boss: RaidBoss,
  targetEffectLanded: boolean
) => {
  const statusEffect = createStatusEffect(skill);
  if (!statusEffect || !skill.effect) {
    return {
      heroes,
      boss,
    };
  }

  if (skill.effect.target === 'boss') {
    return {
      heroes,
      boss: targetEffectLanded
        ? {
            ...boss,
            statusEffects: addStatusEffect(boss.statusEffects, statusEffect),
          }
        : boss,
    };
  }

  const shouldApplyToHero = (hero: BattleHero) =>
    hero.hp > 0 && (skill.effect?.target === 'party' || hero.id === actor.id);

  return {
    boss,
    heroes: heroes.map((hero) =>
      shouldApplyToHero(hero)
        ? {
            ...hero,
            statusEffects: addStatusEffect(hero.statusEffects, statusEffect),
          }
        : hero
    ),
  };
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
    skill: getHeroSkillForLevel(template, progress.level),
    ultimate: template.ultimate,
    statusEffects: [],
  };
};

const createRaidBoss = (save: PlayerSave): RaidBoss => {
  const powerBonus = Math.max(0, Math.round(getPartyPower(save) * 0.38));
  const raidLevel = Math.max(1, save.raidLevel);
  const levelMultiplier = 1 + (raidLevel - 1) * 0.1;
  const elite = isEliteBoss(raidLevel);
  const eliteMultiplier = elite ? 1.3 : 1;
  const maxHp = Math.round(
    (RAID_BOSS_TEMPLATE.hp + powerBonus) * levelMultiplier * eliteMultiplier
  );
  const appearance = getBossAppearance(raidLevel);

  return {
    id: `${RAID_BOSS_TEMPLATE.id}-lv${raidLevel}`,
    name: appearance.name,
    title: `${appearance.title} · Lv ${raidLevel}`,
    icon: appearance.icon,
    spriteKey: appearance.spriteKey,
    maxHp,
    hp: maxHp,
    atk: Math.round(RAID_BOSS_TEMPLATE.atk * levelMultiplier * eliteMultiplier),
    def: Math.round(RAID_BOSS_TEMPLATE.def * (1 + (raidLevel - 1) * 0.06)),
    mag: Math.round(RAID_BOSS_TEMPLATE.mag * levelMultiplier * eliteMultiplier),
    res: Math.round(RAID_BOSS_TEMPLATE.res * (1 + (raidLevel - 1) * 0.06)),
    spd: RAID_BOSS_TEMPLATE.spd,
    countdown: RAID_BOSS_TEMPLATE.countdown,
    statusEffects: [],
    isElite: elite,
    specialSkill: elite ? getEliteSkill(raidLevel) : undefined,
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
    action === 'ultimate' ? 0 : Math.min(ULTIMATE_CHARGE, hero.charge + amount),
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
    const healedHeroes = state.heroes.map((hero) => {
      if (hero.hp <= 0) return hero;

      const nextHero = hero.id === actor.id ? chargedActor : hero;

      return {
        ...nextHero,
        hp: Math.min(nextHero.maxHp, nextHero.hp + healAmount),
      };
    });
    const { heroes, boss } = applySkillEffect(
      skill,
      actor,
      healedHeroes,
      state.boss,
      true
    );

    return {
      ...state,
      heroes,
      boss,
      logs: addLog(
        state.logs,
        `${actor.name} used ${skill.name} and restored the party.`,
        'hero'
      ),
    };
  }

  const target = getLowestAlly(state.heroes);

  if (!target) return state;

  const healedHeroes = state.heroes.map((hero) => {
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
  const { heroes, boss } = applySkillEffect(
    skill,
    actor,
    healedHeroes,
    state.boss,
    true
  );

  return {
    ...state,
    heroes,
    boss,
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
  const berserkMult = actor.statusEffects
    .filter((e) => e.effectType === 'berserk')
    .reduce((m, e) => m * (e.atkModifier ?? 1), 1);
  const attackStat =
    (isSpell
      ? actor.mag + supportBoost
      : actor.atk + speedBoost + guardBoost + supportBoost) * berserkMult;
  const defenseStat = isSpell ? state.boss.res : state.boss.def;
  const missed = Math.random() < getMissChance(actor, state.boss, skill);
  const critical = !missed && Math.random() < getCritChance(actor, skill);
  const baseDamage = missed
    ? 0
    : getDamage(attackStat, defenseStat, skill.power, 9);
  const damage = critical ? Math.round(baseDamage * 1.55) : baseDamage;
  const nextBossHp = Math.max(0, state.boss.hp - damage);
  const chargedActor = chargeHero(actor, action === 'attack' ? 24 : 34, action);
  const chargedHeroes = state.heroes.map((hero) => {
    if (hero.id === actor.id) return chargedActor;

    if (skill.kind === 'rally' && hero.hp > 0) {
      return {
        ...hero,
        charge: Math.min(ULTIMATE_CHARGE, hero.charge + 10),
      };
    }

    return hero;
  });
  const { heroes, boss } = applySkillEffect(
    skill,
    actor,
    chargedHeroes,
    {
      ...state.boss,
      hp: nextBossHp,
    },
    !missed
  );
  const status = nextBossHp <= 0 ? 'won' : state.status;
  const logMessage = missed
    ? `${actor.name}'s ${skill.name} missed.`
    : `${actor.name} used ${skill.name} for ${damage}${critical ? ' CRIT' : ''}.`;

  return {
    ...state,
    status,
    heroes,
    boss,
    totalDamage: state.totalDamage + damage,
    logs: addLog(state.logs, logMessage, status === 'won' ? 'reward' : 'hero'),
  };
};

const BOSS_ATTACK_SKILL: HeroSkill = {
  id: 'boss-attack',
  name: 'Attack',
  summary: 'Boss attack',
  power: 1.08,
  kind: 'strike',
};

const BOSS_SPECIAL_SKILL: HeroSkill = {
  id: 'thread-quake',
  name: 'Thread Quake',
  summary: 'Party-wide boss spell',
  power: 1,
  kind: 'spell',
};

const chooseBossTarget = (heroes: BattleHero[]) => {
  const tank = heroes.find((hero) => hero.role === 'Tank' && hero.hp > 0);

  if (tank) return tank;

  return getLowestAlly(heroes);
};

const resolveEliteBossSkill = (state: BattleState): BattleState => {
  const skill = state.boss.specialSkill!;
  const living = state.heroes.filter((h) => h.hp > 0);
  if (living.length === 0) return { ...state, status: 'lost' };

  const targets =
    skill.target === 'party'
      ? living
      : [living[Math.floor(Math.random() * living.length)]].filter(Boolean);

  const statusEffect = {
    id: `boss-${skill.effectType}`,
    name: skill.name,
    effectType: skill.effectType,
    duration: skill.duration,
    ...(skill.effectType === 'blind' ? { accuracyModifier: -0.28 } : {}),
    ...(skill.effectType === 'berserk' ? { atkModifier: 1.5 } : {}),
  };

  const heroes = state.heroes.map((hero) => {
    if (!targets.some((t) => t?.id === hero.id)) return hero;
    return {
      ...hero,
      statusEffects: addStatusEffect(hero.statusEffects, statusEffect),
    };
  });

  const targetLabel =
    skill.target === 'party'
      ? 'the whole party'
      : (targets[0]?.name ?? 'a hero');
  const logMsg = `${state.boss.name} used ${skill.icon} ${skill.name} on ${targetLabel}!`;

  const status = heroes.every((h) => h.hp <= 0) ? 'lost' : 'active';
  const nextIndex = getNextLivingHeroIndex(heroes, state.activeHeroIndex);

  return tickBattleEffects({
    ...state,
    status,
    heroes,
    boss: { ...state.boss, countdown: 4 },
    activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
    round: nextIndex <= state.activeHeroIndex ? state.round + 1 : state.round,
    logs: addLog(state.logs, logMsg, 'boss'),
  });
};

const resolveBossTurn = (state: BattleState): BattleState => {
  if (state.status !== 'active') return state;

  const specialAttack = state.boss.countdown <= 1;

  if (specialAttack) {
    if (state.boss.isElite && state.boss.specialSkill) {
      return resolveEliteBossSkill(state);
    }

    const damage = Math.max(12, Math.round(state.boss.mag * 0.78));
    let misses = 0;
    let crits = 0;
    const heroes = state.heroes.map((hero) => {
      if (hero.hp <= 0) return hero;

      const missed =
        Math.random() < getMissChance(state.boss, hero, BOSS_SPECIAL_SKILL);

      if (missed) {
        misses += 1;
        return hero;
      }

      const critical =
        Math.random() < getCritChance(state.boss, BOSS_SPECIAL_SKILL);
      if (critical) crits += 1;

      const finalDamage = Math.round(
        Math.max(8, damage - hero.res * 0.25) * (critical ? 1.45 : 1)
      );

      return {
        ...hero,
        hp: Math.max(0, hero.hp - finalDamage),
      };
    });
    const status = heroes.every((hero) => hero.hp <= 0) ? 'lost' : 'active';
    const nextIndex = getNextLivingHeroIndex(heroes, state.activeHeroIndex);
    const suffix =
      misses > 0 || crits > 0
        ? ` (${misses} miss${misses === 1 ? '' : 'es'}${crits > 0 ? `, ${crits} crit` : ''})`
        : '';

    return tickBattleEffects({
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
        `${state.boss.name} cast Thread Quake${suffix}.`,
        'boss'
      ),
    });
  }

  const target = chooseBossTarget(state.heroes);

  if (!target) {
    return {
      ...state,
      status: 'lost',
      logs: addLog(state.logs, 'The party fell before the raid boss.', 'boss'),
    };
  }

  const missed =
    Math.random() < getMissChance(state.boss, target, BOSS_ATTACK_SKILL);
  const critical =
    !missed && Math.random() < getCritChance(state.boss, BOSS_ATTACK_SKILL);
  const baseDamage = missed
    ? 0
    : getDamage(state.boss.atk, target.def, BOSS_ATTACK_SKILL.power, 8);
  const damage = critical ? Math.round(baseDamage * 1.45) : baseDamage;
  const heroes = state.heroes.map((hero) =>
    hero.id === target.id && !missed
      ? {
          ...hero,
          hp: Math.max(0, hero.hp - damage),
        }
      : hero
  );
  const status = heroes.every((hero) => hero.hp <= 0) ? 'lost' : 'active';
  const nextIndex = getNextLivingHeroIndex(heroes, state.activeHeroIndex);
  const logMessage = missed
    ? `${state.boss.name} missed ${target.name}.`
    : `${state.boss.name} hit ${target.name} for ${damage}${critical ? ' CRIT' : ''}.`;

  return tickBattleEffects({
    ...state,
    status,
    heroes,
    boss: {
      ...state.boss,
      countdown: state.boss.countdown - 1,
    },
    activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
    round: nextIndex <= state.activeHeroIndex ? state.round + 1 : state.round,
    logs: addLog(state.logs, logMessage, 'boss'),
  });
};

export const resolveHeroAction = (
  state: BattleState,
  action: BattleAction
): BattleState => {
  if (state.status !== 'active') return state;

  const actor = state.heroes[state.activeHeroIndex];

  if (!actor || actor.hp <= 0) {
    const nextIndex = getNextLivingHeroIndex(
      state.heroes,
      state.activeHeroIndex
    );

    return {
      ...state,
      activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
    };
  }

  // Debuff: Daze — skip this hero's turn entirely
  if (actor.statusEffects.some((e) => e.effectType === 'daze')) {
    const nextIndex = getNextLivingHeroIndex(state.heroes, state.activeHeroIndex);
    return resolveBossTurn({
      ...state,
      activeHeroIndex: nextIndex < 0 ? state.activeHeroIndex : nextIndex,
      round: nextIndex <= state.activeHeroIndex ? state.round + 1 : state.round,
      logs: addLog(state.logs, `${actor.name} is dazed and loses their turn!`, 'system'),
    });
  }

  // Debuff: Silence / Berserk — force basic attack
  const isSilenced = actor.statusEffects.some((e) => e.effectType === 'silence');
  const isBerserked = actor.statusEffects.some((e) => e.effectType === 'berserk');
  const forcedToAttack =
    (isSilenced || isBerserked) && (action === 'skill' || action === 'ultimate');

  let preLog = state.logs;
  if (forcedToAttack) {
    const reason = isBerserked ? 'berserk' : 'silenced';
    preLog = addLog(preLog, `${actor.name} is ${reason}! Falls back to basic attack.`, 'system');
  }

  // Enforce skill cooldown — fall back to basic attack if on cooldown
  const effectiveAction: BattleAction = forcedToAttack
    ? 'attack'
    : action === 'skill' && actor.skillCooldown > 0
      ? 'attack'
      : action;
  const newCooldown =
    effectiveAction === 'skill' ? 3 : Math.max(0, actor.skillCooldown - 1);

  const skill = getActionSkill(actor, effectiveAction);
  const stateWithLog = { ...state, logs: preLog };
  const afterHero =
    skill.kind === 'heal'
      ? resolveHeal(stateWithLog, actor, skill, effectiveAction)
      : resolveHeroStrike(stateWithLog, actor, skill, effectiveAction);

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
