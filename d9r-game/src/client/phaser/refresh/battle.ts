import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT } from '../constants';
import { canUseSkill, canUseUltimate, getActiveHero } from '../../../shared/game/logic/combat';
import type { BattleLogEntry } from '../../../shared/game/types';
import { fmt, clamp, HERO_AREA_X } from '../scenes/GameSceneTypes';

export function refreshBoss(scene: GameScene): void {
  if (!scene.battle) return;
  const { boss } = scene.battle;
  const elite = boss.isElite ?? false;

  scene.bossTitleText
    .setText(
      `${elite ? '⚡ ELITE · ' : ''}${boss.title.toUpperCase()}`
    )
    .setColor(elite ? '#d97706' : '#b91c1c');

  scene.bossNameText.setText(boss.name);
  scene.bossHpText.setText(`${fmt(boss.hp)}/${fmt(boss.maxHp)}`);
  scene.bossHpFill.scaleX = clamp(boss.hp / boss.maxHp);
  scene.bossAura.setFillStyle(elite ? 0xfbbf24 : COLORS.boss, 0.22);

  // Reset position and alpha that animateBossDefeat() permanently alters
  scene.bossImage.setPosition(scene.bossCX, scene.bossCY).setAlpha(1);
  scene.bossAura.setPosition(scene.bossCX, scene.bossCY).setAlpha(1);

  if (scene.textures.exists(boss.spriteKey)) {
    const requestedFrame = boss.spriteFrame ?? 0;
    const frame = scene.textures.getFrame(boss.spriteKey, requestedFrame)
      ? requestedFrame
      : 0;
    scene.bossImage
      .setTexture(boss.spriteKey, frame)
      .setDisplaySize(112, 112)
      .setVisible(true);
  } else {
    scene.bossImage.setVisible(false);
  }
}

export function refreshHeroSlots(scene: GameScene): void {
  if (!scene.battle) return;
  const { heroes, activeHeroIndex } = scene.battle;

  // Stop existing blink tween before rebuilding slot states
  if (scene.activeTween) {
    scene.activeTween.stop();
    scene.activeTween = null;
  }

  scene.heroSlots.forEach((slot) => {
    slot.objects.forEach((object) => object.setVisible(false));
  });

  heroes.forEach((hero, i) => {
    const slot = scene.heroSlots[i];
    if (!slot) return;
    const dead = hero.hp <= 0;
    const alpha = dead ? 0.4 : 1;
    scene.setHeroPose(slot.icon, hero.id, dead ? 'ko' : 'idle');
    slot.objects.forEach((object) => object.setVisible(true));
    slot.icon.setAlpha(alpha);
    slot.hpText
      .setAlpha(alpha)
      .setText(`HP ${Math.round(hero.hp)}/${hero.maxHp}`);
    slot.lbText.setAlpha(alpha).setText(`${Math.round(hero.charge)}% LB`);
  });

  scene.activeHighlight.clear();
  const activeSlot = scene.heroSlots[activeHeroIndex];
  if (activeSlot && scene.battle.status === 'active') {
    scene.activeHighlight.fillStyle(0xf97316, 1);
    scene.activeHighlight.fillRect(
      activeSlot.sx - 3,
      activeSlot.sy + activeSlot.sh / 2 - 16,
      4,
      32
    );

    // Blink the active hero's icon to show it's their turn
    const activeHero = heroes[activeHeroIndex];
    if (activeHero && activeHero.hp > 0) {
      scene.activeTween = scene.tweens.add({
        targets: activeSlot.icon,
        alpha: { from: 1, to: 0.2 },
        duration: 520,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }
}

export function refreshButtons(scene: GameScene): void {
  if (!scene.battle) return;
  const active = scene.battle.status === 'active' && !scene.bossTurnAnimating;
  const activeHero = getActiveHero(scene.battle);
  const skillReady = active && canUseSkill(activeHero);
  const ultReady = active && canUseUltimate(activeHero);

  if (active) {
    scene.attackBtnBg.setInteractive();
  } else {
    scene.attackBtnBg.disableInteractive();
  }
  scene.attackBtnText.setAlpha(active ? 1 : 0.42);

  if (skillReady) {
    scene.skillBtnBg.setInteractive({ useHandCursor: true });
  } else {
    scene.skillBtnBg.disableInteractive();
  }
  const cooldown = activeHero?.skillCooldown ?? 0;
  scene.skillBtnText.setText(
    cooldown > 0 ? `CD:${cooldown}` : 'Skill'
  );
  scene.skillBtnText.setAlpha(skillReady ? 1 : 0.42);

  if (ultReady) {
    scene.ultBtnBg.setInteractive({ useHandCursor: true });
  } else {
    scene.ultBtnBg.disableInteractive();
  }
  scene.ultBtnText.setText(ultReady ? '⚡ Limit' : 'Limit');
  scene.ultBtnText.setAlpha(ultReady ? 1 : 0.42);
}

export function refreshBattleLog(scene: GameScene): void {
  if (!scene.battle) return;
  const logs = scene.battle.logs;
  const activeHero = getActiveHero(scene.battle);
  const living = scene.battle.heroes.filter((h) => h.hp > 0).length;

  scene.battleLogHeader.setText(
    `BATTLE LOG  ·  ${activeHero?.name ?? '—'}  ·  ${living}/${scene.battle.heroes.length} alive  ·  R${scene.battle.round}`
  );

  const TONE_COLOR: Record<BattleLogEntry['tone'], string> = {
    hero: '#15803d',
    boss: '#dc2626',
    reward: '#d97706',
    system: '#6b7280',
  };

  scene.battleLogLines.forEach((lt, i) => {
    const entry = logs[i];
    if (!entry) {
      lt.setText('');
      return;
    }
    lt.setText(entry.message);
    lt.setColor(TONE_COLOR[entry.tone]);
    lt.setAlpha(i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12));
  });
}
