import type {
  BattleAction,
  BattleHero,
  BattleState,
  HeroSkill,
  RaidBoss,
} from '../types';
import { addLog, MAX_LOGS as _MAX_LOGS, ULTIMATE_CHARGE } from './combatCalcs';
import { getMissChance, getCritChance, getDamage } from './combatCalcs';
import { applySkillEffect } from './combatEffects';
import { advanceHeroAndMaybeBoss } from './combatBoss';
import { createBattleState as _createBattleState } from './battleSetup';

// Re-export public API so existing importers continue to work
export { MAX_LOGS } from './combatCalcs';
export { createBattleState } from './battleSetup';

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

const getActionSkill = (
  hero: BattleHero,
  action: BattleAction,
  selectedSkill?: HeroSkill
): HeroSkill => {
  if (action === 'ultimate' && hero.charge >= ULTIMATE_CHARGE) {
    return hero.ultimate;
  }

  if (action === 'skill') {
    return (
      hero.skillOptions.find((skill) => skill.id === selectedSkill?.id) ??
      hero.skill
    );
  }

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
  const speedBoost = actor.role === 'QA' ? actor.spd * 0.34 : 0;
  const guardBoost = actor.role === 'Security' ? actor.def * 0.42 : 0;
  const berserkMult = actor.statusEffects
    .filter((e) => e.effectType === 'berserk')
    .reduce((m, e) => m * (e.atkModifier ?? 1), 1);
  const attackStat =
    (isSpell
      ? actor.mag + supportBoost
      : actor.atk + speedBoost + guardBoost + supportBoost) * berserkMult;
  const bossDefMult = state.boss.statusEffects
    .filter((e) => e.effectType === 'fortify')
    .reduce((m, e) => m * (e.defModifier ?? 1), 1);
  const defenseStat = (isSpell ? state.boss.res : state.boss.def) * bossDefMult;
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
  const { heroes, boss: updatedBoss } = applySkillEffect(
    skill,
    actor,
    chargedHeroes,
    {
      ...state.boss,
      hp: nextBossHp,
    },
    !missed
  );

  // Sync updated boss back to bossList (multi-boss mode)
  let boss = updatedBoss;
  let outBossList = state.bossList;
  let outActiveIdx = state.activeBossIndex;
  let status = state.status;

  if (state.bossList && state.activeBossIndex !== undefined) {
    const newList = state.bossList.map((b, i) => i === state.activeBossIndex ? updatedBoss : b);
    if (newList.every(b => b.hp <= 0)) {
      status = 'won';
      outBossList = newList;
    } else if (updatedBoss.hp <= 0) {
      // Advance to next alive boss
      const nextIdx = newList.findIndex((b, i) => i !== state.activeBossIndex && b.hp > 0);
      outActiveIdx = nextIdx >= 0 ? nextIdx : state.activeBossIndex;
      boss = newList[outActiveIdx!] ?? updatedBoss;
      outBossList = newList;
    } else {
      outBossList = newList;
    }
  } else {
    status = nextBossHp <= 0 ? 'won' : state.status;
  }

  const logMessage = missed
    ? `${actor.name}'s ${skill.name} missed.`
    : `${actor.name} used ${skill.name} for ${damage}${critical ? ' CRIT' : ''}.`;

  return {
    ...state,
    status,
    heroes,
    boss,
    ...(outBossList ? { bossList: outBossList, activeBossIndex: outActiveIdx } : {}),
    totalDamage: state.totalDamage + damage,
    logs: addLog(state.logs, logMessage, status === 'won' ? 'reward' : 'hero'),
  };
};

export const resolveHeroAction = (
  state: BattleState,
  action: BattleAction,
  selectedSkill?: HeroSkill
): BattleState => {
  if (state.status !== 'active') return state;

  const actor = state.heroes[state.activeHeroIndex];

  if (!actor || actor.hp <= 0) {
    return advanceHeroAndMaybeBoss(state);
  }

  // Debuff: Daze — skip this hero's turn
  if (actor.statusEffects.some((e) => e.effectType === 'daze')) {
    return advanceHeroAndMaybeBoss({
      ...state,
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

  const effectiveAction: BattleAction = forcedToAttack
    ? 'attack'
    : action === 'skill' && actor.skillCooldown > 0
      ? 'attack'
      : action;
  const newCooldown =
    effectiveAction === 'skill' ? 3 : Math.max(0, actor.skillCooldown - 1);

  const skill = getActionSkill(actor, effectiveAction, selectedSkill);
  const stateWithLog = { ...state, logs: preLog };
  const afterHero =
    skill.kind === 'heal'
      ? resolveHeal(stateWithLog, actor, skill, effectiveAction)
      : resolveHeroStrike(stateWithLog, actor, skill, effectiveAction);

  const afterCooldown = {
    ...afterHero,
    heroes: afterHero.heroes.map((hero) =>
      hero.id === actor.id ? { ...hero, skillCooldown: newCooldown } : hero
    ),
  };

  if (afterCooldown.status !== 'active') return afterCooldown;

  return advanceHeroAndMaybeBoss(afterCooldown);
};

export const getActiveHero = (state: BattleState) =>
  state.heroes[state.activeHeroIndex] ?? null;

export const getBossHpPercent = (boss: RaidBoss) =>
  Math.max(0, Math.round((boss.hp / boss.maxHp) * 100));

export const canUseUltimate = (hero: BattleHero | null) =>
  hero ? hero.charge >= ULTIMATE_CHARGE && hero.hp > 0 : false;

export const canUseSkill = (hero: BattleHero | null) =>
  hero ? hero.skillCooldown === 0 && hero.hp > 0 : false;
