// Visual animation helpers for combat — extracted from actions.ts to stay under 500 lines
import type { GameScene } from '../scenes/GameScene';
import { FONT, PAD } from '../constants';
import { EFFECT_KEYS } from '../scenes/BootScene';
import type { EffectKey } from '../scenes/BootScene';
import type { BattleAction, BattleHero, BattleState, BossSpecialEffectType, HeroSkill } from '../../../shared/game/types';
import { STAGE_X, STAGE_Y, STAGE_W, INFO_BAR_H, BANNER_ZONE_H, HERO_SPRITE_SIZE } from '../scenes/GameSceneTypes';
import type { BossAttackCue } from '../scenes/GameSceneTypes';

// Local copies of static maps from GameScene (avoids circular runtime imports)
export const HERO_MAGIC_EFFECT: Record<string, EffectKey> = {
  'snoo-vanguard': EFFECT_KEYS.fire,
  'flair-archmage': EFFECT_KEYS.light,
  'automod-oracle': EFFECT_KEYS.water,
};

export const BOSS_DEBUFF_EFFECT: Record<BossSpecialEffectType, EffectKey> = {
  berserk:   EFFECT_KEYS.bossBerserk,
  daze:      EFFECT_KEYS.bossDaze,
  silence:   EFFECT_KEYS.bossSilence,
  confuse:   EFFECT_KEYS.bossConfuse,
  blind:     EFFECT_KEYS.bossBlind,
  rage:      EFFECT_KEYS.bossBerserk,
  fortify:   EFFECT_KEYS.bossStrike,
  precision: EFFECT_KEYS.light,
  evade:     EFFECT_KEYS.cosmic,
};

export function showBossAttackBanner(scene: GameScene, skillName: string, onAfterFade?: () => void): void {
  const bannerH = 42;
  const bannerW = STAGE_W - PAD * 4;
  const bannerCX = STAGE_X + STAGE_W / 2;
  const bannerCY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H / 2;
  const bg = scene.add
    .rectangle(bannerCX, bannerCY, bannerW, bannerH, 0x7f1d1d, 0.9)
    .setDepth(42)
    .setAlpha(0);
  const text = scene.add
    .text(bannerCX, bannerCY, skillName, {
      fontSize: '14px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#fca5a5',
      wordWrap: { width: bannerW - PAD * 2 },
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(43)
    .setAlpha(0);
  scene.tweens.add({
    targets: [bg, text],
    alpha: 1,
    duration: 180,
    onComplete: () => {
      scene.time.delayedCall(420, () => {
        scene.tweens.add({
          targets: [bg, text],
          alpha: 0,
          duration: 220,
          onComplete: () => {
            bg.destroy();
            text.destroy();
            onAfterFade?.();
          },
        });
      });
    },
  });
}

export function showHeroSkillBanner(scene: GameScene, skillName: string, onComplete: () => void): void {
  const bannerH = 42;
  const bannerW = STAGE_W - PAD * 4;
  const bannerCX = STAGE_X + STAGE_W / 2;
  const bannerCY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H / 2;
  const bg = scene.add
    .rectangle(bannerCX, bannerCY, bannerW, bannerH, 0x1e3a8a, 0.92)
    .setDepth(42)
    .setAlpha(0);
  const text = scene.add
    .text(bannerCX, bannerCY, skillName, {
      fontSize: '14px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#bfdbfe',
      wordWrap: { width: bannerW - PAD * 2 },
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(43)
    .setAlpha(0);
  scene.tweens.add({
    targets: [bg, text],
    alpha: 1,
    duration: 160,
    onComplete: () => {
      scene.time.delayedCall(400, () => {
        onComplete();
        scene.tweens.add({
          targets: [bg, text],
          alpha: 0,
          duration: 200,
          onComplete: () => { bg.destroy(); text.destroy(); },
        });
      });
    },
  });
}

export function animateBossDefeat(scene: GameScene): void {
  scene.tweens.add({
    targets: [scene.bossImage, scene.bossAura],
    alpha: 0,
    y: `+=${60}`,
    duration: 1800,
    ease: 'Sine.In',
    delay: 300,
  });
}

export function spawnEffectSprite(scene: GameScene, effectKey: EffectKey, x: number, y: number, size = 128): void {
  if (!scene.textures.exists(effectKey)) return;

  const img = scene.add
    .image(x, y, effectKey)
    .setDisplaySize(size, size)
    .setOrigin(0.5)
    .setDepth(16)
    .setAlpha(0.92);

  scene.tweens.add({
    targets: img,
    alpha: 0,
    scaleX: 1.6,
    scaleY: 1.6,
    duration: 780,
    ease: 'Cubic.Out',
    onComplete: () => img.destroy(),
  });
}

export function spawnBossStatusEffects(scene: GameScene, cues: BossAttackCue[], battle: BattleState): void {
  cues.forEach((cue, cueIndex) => {
    if (!cue.effectType) return;
    const effectKey = BOSS_DEBUFF_EFFECT[cue.effectType];
    const targetIds = new Set(cue.targetHeroIds ?? []);

    battle.heroes.forEach((hero, heroIndex) => {
      if (hero.hp <= 0 || !targetIds.has(hero.id)) return;
      const slot = scene.heroSlots[heroIndex];
      if (!slot) return;

      scene.time.delayedCall(cueIndex * 120 + heroIndex * 70, () =>
        spawnEffectSprite(scene, effectKey, slot.iconCX, slot.iconCY, 112)
      );
    });
  });
}

export function spawnBossFloat(scene: GameScene, value: number, kind: 'damage' | 'ultimate' | 'miss'): void {
  const label = kind === 'miss' ? 'MISS' : String(value);
  const color = kind === 'ultimate' ? '#fbbf24' : kind === 'miss' ? '#d1d5db' : '#ef4444';
  const floatText = scene.add
    .text(scene.bossCX, scene.bossCY - 58, label, {
      fontSize: kind === 'ultimate' ? '28px' : '24px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color,
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(17);

  scene.tweens.add({
    targets: floatText,
    y: scene.bossCY - 112,
    alpha: 0,
    duration: 1200,
    ease: 'Cubic.Out',
    onComplete: () => floatText.destroy(),
  });
}

export function spawnFloat(
  scene: GameScene,
  slotIndex: number,
  value: number,
  kind: 'damage' | 'heal' | 'ultimate' | 'miss'
): void {
  const slot = scene.heroSlots[slotIndex];
  if (!slot) return;

  const label =
    kind === 'ultimate' ? 'LIMIT' : kind === 'miss' ? 'MISS' : String(value);
  const color =
    kind === 'damage' ? '#ef4444'
    : kind === 'heal' ? '#60a5fa'
    : kind === 'miss' ? '#d1d5db'
    : '#fbbf24';

  const floatText = scene.add
    .text(slot.iconCX, slot.iconCY - HERO_SPRITE_SIZE / 2, label, {
      fontSize: kind === 'ultimate' ? '18px' : '20px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(15);

  scene.tweens.add({
    targets: floatText,
    y: slot.iconCY - HERO_SPRITE_SIZE / 2 - 52,
    alpha: 0,
    duration: 1500,
    ease: 'Cubic.Out',
    onComplete: () => floatText.destroy(),
  });
}

export function animateActiveHeroAction(
  scene: GameScene,
  slotIndex: number,
  heroId: string,
  action: BattleAction
): void {
  const slot = scene.heroSlots[slotIndex];
  if (!slot) return;

  scene.setHeroPose(slot.icon, heroId, action === 'attack' ? 'attack' : 'cast');
  slot.icon.setX(slot.iconCX);
  scene.tweens.add({
    targets: slot.icon,
    x: slot.iconCX - 20,
    duration: 200,
    ease: 'Sine.Out',
    yoyo: true,
    onComplete: () => {
      slot.icon.setX(slot.iconCX);
      scene.setHeroPose(slot.icon, heroId, 'idle');
    },
  });
}

export function animateHeroHit(scene: GameScene, slotIndex: number, heroId: string, ko: boolean): void {
  const slot = scene.heroSlots[slotIndex];
  if (!slot) return;

  scene.setHeroPose(slot.icon, heroId, ko ? 'ko' : 'hit');
  if (!ko) slot.icon.setTint(0xffd1d1);
  scene.tweens.add({
    targets: slot.icon,
    x: { from: slot.iconCX - 4, to: slot.iconCX + 4 },
    duration: 70,
    yoyo: true,
    repeat: 2,
    onComplete: () => {
      slot.icon.setX(slot.iconCX);
      slot.icon.clearTint();
      scene.setHeroPose(slot.icon, heroId, ko ? 'ko' : 'idle');
    },
  });
}

export function getHeroEffectKey(
  hero: BattleHero,
  action: BattleAction,
  selectedSkill?: HeroSkill
): EffectKey {
  if (action === 'ultimate') return EFFECT_KEYS.limit;
  if (action === 'attack') return EFFECT_KEYS.slash;

  const skill = selectedSkill ?? hero.skill;

  if (skill.kind === 'heal') return EFFECT_KEYS.water;
  if (skill.kind === 'rally') return EFFECT_KEYS.light;
  if (skill.kind === 'spell') {
    return HERO_MAGIC_EFFECT[hero.id] ?? EFFECT_KEYS.cosmic;
  }

  return EFFECT_KEYS.strikeSkill;
}

export function getBossImpactEffectKey(cues: BossAttackCue[]): EffectKey {
  const cueWithEffect = [...cues]
    .reverse()
    .find((cue) => cue.effectType);

  return cueWithEffect?.effectType
    ? BOSS_DEBUFF_EFFECT[cueWithEffect.effectType]
    : EFFECT_KEYS.bossStrike;
}
