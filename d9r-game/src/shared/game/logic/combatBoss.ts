import type {
  BattleHero,
  BattleState,
  BattleStatusEffect,
  BossSpecialSkill,
  HeroSkill,
  RaidBoss,
} from '../types';
import {
  addLog,
  getMissChance,
  getCritChance,
  getDamage,
} from './combatCalcs';
import { addStatusEffect, tickBattleEffects } from './combatEffects';

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

const BOSS_SELF_BUFF_EFFECTS: Record<string, Partial<BattleStatusEffect>> = {
  rage:      { atkModifier: 1.4 },
  fortify:   { defModifier: 1.35 },
  precision: { accuracyModifier: 0.35 },
  evade:     { evasionModifier: 0.30 },
};

const chooseBossTarget = (heroes: BattleHero[]) => {
  const tank = heroes.find((hero) => hero.role === 'Security' && hero.hp > 0);

  if (tank) return tank;

  const livingHeroes = heroes.filter((hero) => hero.hp > 0);

  return livingHeroes.sort(
    (firstHero, secondHero) =>
      firstHero.hp / firstHero.maxHp - secondHero.hp / secondHero.maxHp
  )[0];
};

const getBossSpecialSkills = (boss: RaidBoss) =>
  boss.specialSkills ?? (boss.specialSkill ? [boss.specialSkill] : []);

const chooseBossSpecialSkill = (state: BattleState): BossSpecialSkill | null => {
  const skills = getBossSpecialSkills(state.boss);
  if (skills.length === 0) return null;

  return skills[(state.round + state.encounterIndex) % skills.length] ?? skills[0]!;
};

const resolveEliteBossSkill = (
  state: BattleState,
  skill: BossSpecialSkill
): BattleState => {
  // Boss self-buff — no hero damage, buff applied to boss statusEffects
  if (skill.target === 'self') {
    const selfEffect: BattleStatusEffect = {
      id: `boss-${skill.effectType}`,
      name: skill.name,
      effectType: skill.effectType,
      duration: skill.duration,
      ...(BOSS_SELF_BUFF_EFFECTS[skill.effectType] ?? {}),
    };
    return {
      ...state,
      boss: {
        ...state.boss,
        countdown: 4,
        statusEffects: addStatusEffect(state.boss.statusEffects, selfEffect),
      },
      logs: addLog(state.logs, `${state.boss.name} used ${skill.name}!`, 'boss', {
        attackName: skill.name,
        effectType: skill.effectType,
      }),
    };
  }

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

  // Base damage: ~60% of boss ATK, reduced by each hero's DEF
  const baseDmg = Math.max(8, Math.round(state.boss.atk * 0.6));
  const targetHeroIds: string[] = [];

  const heroes = state.heroes.map((hero) => {
    if (!targets.some((t) => t?.id === hero.id)) return hero;
    const rawSpecial = Math.max(4, Math.round(baseDmg - hero.def * 0.2));
    const damage = hero.isDefending ? Math.round(rawSpecial / 2) : rawSpecial;
    targetHeroIds.push(hero.id);
    return {
      ...hero,
      hp: Math.max(0, hero.hp - damage),
      statusEffects: addStatusEffect(hero.statusEffects, statusEffect),
    };
  });

  const targetLabel =
    skill.target === 'party' ? 'the whole party' : (targets[0]?.name ?? 'a hero');
  const logMsg = `${state.boss.name} used ${skill.name} on ${targetLabel}!`;
  const status = heroes.every((h) => h.hp <= 0) ? 'lost' : 'active';

  return {
    ...state,
    status,
    heroes,
    boss: { ...state.boss, countdown: 4 },
    logs: addLog(state.logs, logMsg, 'boss', {
      attackName: skill.name,
      effectType: skill.effectType,
      targetHeroIds,
    }),
  };
};

// Single boss attack — does NOT advance hero index or tick status effects
const resolveSingleBossAttack = (state: BattleState): BattleState => {
  if (state.status !== 'active') return state;

  if (state.boss.countdown <= 1) {
    const skill = chooseBossSpecialSkill(state);

    if (skill) {
      return resolveEliteBossSkill(state, skill);
    }

    const damage = Math.max(12, Math.round(state.boss.mag * 0.78));
    let misses = 0;
    let crits = 0;
    const targetHeroIds: string[] = [];
    const heroes = state.heroes.map((hero) => {
      if (hero.hp <= 0) return hero;
      const missed = Math.random() < getMissChance(state.boss, hero, BOSS_SPECIAL_SKILL);
      if (missed) { misses += 1; return hero; }
      const critical = Math.random() < getCritChance(state.boss, BOSS_SPECIAL_SKILL);
      if (critical) crits += 1;
      const rawAoe = Math.round(Math.max(8, damage - hero.res * 0.25) * (critical ? 1.45 : 1));
      const finalDamage = hero.isDefending ? Math.round(rawAoe / 2) : rawAoe;
      targetHeroIds.push(hero.id);
      return { ...hero, hp: Math.max(0, hero.hp - finalDamage) };
    });
    const status = heroes.every((h) => h.hp <= 0) ? 'lost' : 'active';
    const suffix =
      misses > 0 || crits > 0
        ? ` (${misses} miss${misses === 1 ? '' : 'es'}${crits > 0 ? `, ${crits} crit` : ''})`
        : '';
    return {
      ...state,
      status,
      heroes,
      boss: { ...state.boss, countdown: 4 },
      logs: addLog(
        state.logs,
        `${state.boss.name} cast Thread Quake${suffix}.`,
        'boss',
        {
          attackName: 'Thread Quake',
          targetHeroIds,
        }
      ),
    };
  }

  const target = chooseBossTarget(state.heroes);
  if (!target) {
    return { ...state, status: 'lost', logs: addLog(state.logs, 'The party fell.', 'boss') };
  }

  const bossAtkMult = state.boss.statusEffects
    .filter((e) => e.effectType === 'rage')
    .reduce((m, e) => m * (e.atkModifier ?? 1), 1);
  const missed = Math.random() < getMissChance(state.boss, target, BOSS_ATTACK_SKILL);
  const critical = !missed && Math.random() < getCritChance(state.boss, BOSS_ATTACK_SKILL);
  const baseDamage = missed ? 0 : getDamage(state.boss.atk * bossAtkMult, target.def, BOSS_ATTACK_SKILL.power, 8);
  const rawDamage = critical ? Math.round(baseDamage * 1.45) : baseDamage;
  const damage = (!missed && target.isDefending) ? Math.round(rawDamage / 2) : rawDamage;
  const heroes = state.heroes.map((hero) =>
    hero.id === target.id && !missed ? { ...hero, hp: Math.max(0, hero.hp - damage) } : hero
  );
  const status = heroes.every((h) => h.hp <= 0) ? 'lost' : 'active';
  const attackName = state.boss.attackName ?? 'Attack';
  const logMessage = missed
    ? `${state.boss.name}'s ${attackName} missed ${target.name}.`
    : `${state.boss.name}'s ${attackName} hit ${target.name} for ${damage}${critical ? ' CRIT' : ''}.`;

  return {
    ...state,
    status,
    heroes,
    boss: { ...state.boss, countdown: state.boss.countdown - 1 },
    logs: addLog(state.logs, logMessage, 'boss', {
      attackName,
      targetHeroIds: [target.id],
    }),
  };
};

// Run one boss (by index) through its attack sequence; syncs back to bossList
const resolveBossFromList = (state: BattleState, bossIdx: number): BattleState => {
  const bossInList = state.bossList![bossIdx];
  if (!bossInList || bossInList.hp <= 0) return state;

  const roll = Math.random();
  const numAttacks = roll < 0.40 ? 3 : roll < 0.80 ? 4 : 5;
  const subState: BattleState = { ...state, boss: bossInList };
  let current = subState;
  for (let i = 0; i < numAttacks && current.status === 'active'; i++) {
    current = resolveSingleBossAttack(current);
  }

  const newList = state.bossList!.map((b, i) => i === bossIdx ? current.boss : b);
  const activeIdx = state.activeBossIndex ?? 0;
  return {
    ...current,
    boss: newList[activeIdx] ?? current.boss,
    bossList: newList,
    activeBossIndex: activeIdx,
  };
};

// Boss phase: 3–5 attacks (weighted), then tick effects once per round.
// In multi-boss mode all alive bosses attack, giving ×N total attacks.
export const resolveBossTurnPhase = (state: BattleState): BattleState => {
  if (state.status !== 'active') return state;

  const clearDefend = (s: BattleState): BattleState => ({
    ...s,
    heroes: s.heroes.map((h) => h.isDefending ? { ...h, isDefending: false } : h),
  });

  if (state.bossList && state.bossList.length > 1) {
    let current = state;
    for (let i = 0; i < state.bossList.length; i++) {
      if (current.status !== 'active') break;
      current = resolveBossFromList(current, i);
    }
    return clearDefend(tickBattleEffects(current));
  }

  const roll = Math.random();
  const numAttacks = roll < 0.40 ? 3 : roll < 0.80 ? 4 : 5;
  let current = state;
  for (let i = 0; i < numAttacks && current.status === 'active'; i++) {
    current = resolveSingleBossAttack(current);
  }
  return clearDefend(tickBattleEffects(current));
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

// Advance to the next living hero; if the round ended, trigger the boss phase
export const advanceHeroAndMaybeBoss = (state: BattleState): BattleState => {
  if (state.status !== 'active') return state;
  const nextIndex = getNextLivingHeroIndex(state.heroes, state.activeHeroIndex);
  if (nextIndex < 0) return { ...state, status: 'lost' };
  const isRoundEnd = nextIndex <= state.activeHeroIndex;
  const advanced: BattleState = {
    ...state,
    activeHeroIndex: nextIndex,
    round: isRoundEnd ? state.round + 1 : state.round,
  };
  return isRoundEnd ? resolveBossTurnPhase(advanced) : advanced;
};
