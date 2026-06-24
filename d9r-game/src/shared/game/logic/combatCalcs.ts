import type {
  BattleHero,
  BattleLogEntry,
  HeroSkill,
  RaidBoss,
} from '../types';

export const MAX_LOGS = 5;
export const ULTIMATE_CHARGE = 100;
const BASE_MISS_CHANCE = 0.07;
const MIN_MISS_CHANCE = 0.03;
const MAX_MISS_CHANCE = 0.35;
const MIN_CRIT_CHANCE = 0.04;
const MAX_CRIT_CHANCE = 0.3;

export type BattleCombatant = Pick<BattleHero | RaidBoss, 'spd' | 'statusEffects'>;

export const createLogEntry = (
  message: string,
  tone: BattleLogEntry['tone'],
  meta: Omit<Partial<BattleLogEntry>, 'id' | 'message' | 'tone'> = {}
): BattleLogEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  tone,
  message,
  ...meta,
});

export const addLog = (
  logs: BattleLogEntry[],
  message: string,
  tone: BattleLogEntry['tone'],
  meta: Omit<Partial<BattleLogEntry>, 'id' | 'message' | 'tone'> = {}
) => [createLogEntry(message, tone, meta), ...logs].slice(0, MAX_LOGS);

export const getDamage = (
  attackerStat: number,
  defenderStat: number,
  power: number,
  floor: number
) => {
  const variance = 0.92 + Math.random() * 0.16;
  const rawDamage = attackerStat * power * variance - defenderStat * 0.22;

  return Math.max(floor, Math.round(rawDamage));
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const getEffectTotal = (
  combatant: BattleCombatant,
  key: 'accuracyModifier' | 'evasionModifier'
) =>
  combatant.statusEffects.reduce(
    (total, effect) => total + (effect[key] ?? 0),
    0
  );

export const getMissChance = (
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

export const getCritChance = (attacker: BattleCombatant, skill: HeroSkill) =>
  clamp(
    MIN_CRIT_CHANCE + attacker.spd * 0.0028 + (skill.critBonus ?? 0),
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE
  );
