import type {
  BattleHero,
  BattleState,
  BattleStatusEffect,
  HeroSkill,
  RaidBoss,
} from '../types';

export const createStatusEffect = (skill: HeroSkill): BattleStatusEffect | null => {
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

export const addStatusEffect = (
  effects: BattleStatusEffect[],
  nextEffect: BattleStatusEffect
) => [nextEffect, ...effects.filter((effect) => effect.id !== nextEffect.id)];

export const tickStatusEffects = (effects: BattleStatusEffect[]) =>
  effects
    .map((effect) => ({
      ...effect,
      duration: effect.duration - 1,
    }))
    .filter((effect) => effect.duration > 0);

export const tickBattleEffects = (state: BattleState): BattleState => ({
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

export const applySkillEffect = (
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
