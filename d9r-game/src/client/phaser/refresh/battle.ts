import type { GameScene } from '../scenes/GameScene';
import { COLORS } from '../constants';
import { canUseSkill, canUseUltimate } from '../../../shared/game/logic/combat';
import type {
  BattleLogEntry,
  BossSpecialEffectType,
} from '../../../shared/game/types';
import {
  fmt,
  clamp,
  HERO_CELL_W,
  HERO_SPRITE_SIZE,
} from '../scenes/GameSceneTypes';

export function refreshBoss(scene: GameScene): void {
  if (!scene.battle) return;
  const { boss, bossList, activeBossIndex } = scene.battle;
  const elite = boss.isElite ?? false;
  const isMultiBoss = (bossList?.length ?? 0) > 1;

  scene.bossTitleText
    .setText(`${elite ? '⚡ ELITE · ' : ''}${boss.title.toUpperCase()}`)
    .setColor(elite ? '#d97706' : '#b91c1c');

  scene.bossNameText.setText(boss.name);
  scene.bossHpText.setText(`${fmt(boss.hp)}/${fmt(boss.maxHp)}`);
  scene.bossHpFill.scaleX = clamp(boss.hp / boss.maxHp);
  scene.bossAura.setFillStyle(elite ? 0xfbbf24 : COLORS.boss, 0.22);

  if (isMultiBoss && bossList) {
    scene.bossImage.setVisible(false);
    scene.bossAura.setAlpha(0);

    bossList.forEach((b, i) => {
      const ref = scene.multiBossRefs[i];
      if (!ref) return;
      const isDead = b.hp <= 0;
      const isSelected = i === (activeBossIndex ?? 0);

      if (scene.textures.exists(b.spriteKey)) {
        ref.image
          .setTexture(b.spriteKey)
          .setDisplaySize(80, 120)
          .setVisible(true)
          .setAlpha(isDead ? 0.3 : 1);
      }

      ref.ring.clear();
      if (isSelected && !isDead) {
        ref.ring.lineStyle(2, 0xfbbf24, 1);
        const imgBounds = ref.image.getBounds();
        ref.ring.strokeRect(
          imgBounds.x - 3,
          imgBounds.y - 3,
          imgBounds.width + 6,
          imgBounds.height + 6
        );
      }

      ref.nameText.setVisible(true).setText(isDead ? `${b.name} ✗` : b.name);

      if (!isDead) {
        ref.hitArea.setInteractive({ useHandCursor: true }).setVisible(true);
      } else {
        ref.hitArea.disableInteractive().setVisible(false);
      }
    });
  } else {
    scene.multiBossRefs.forEach((ref) => {
      ref.image.setVisible(false);
      ref.nameText.setVisible(false);
      ref.ring.clear();
      ref.hitArea.disableInteractive().setVisible(false);
    });
    scene.sideBossImages.forEach((img) => img.setVisible(false));

    scene.bossImage.setPosition(scene.bossCX, scene.bossCY).setAlpha(1);
    scene.bossAura.setPosition(scene.bossCX, scene.bossCY).setAlpha(1);

    if (scene.textures.exists(boss.spriteKey)) {
      scene.bossImage
        .setTexture(boss.spriteKey)
        .setDisplaySize(120, 180)
        .setVisible(true);
    } else {
      scene.bossImage.setVisible(false);
    }
  }
}

export function refreshHeroSlots(scene: GameScene): void {
  if (!scene.battle) return;
  const { heroes } = scene.battle;

  if (scene.activeTween) {
    scene.activeTween.stop();
    scene.activeTween = null;
  }

  heroes.forEach((hero, i) => {
    const slot = scene.heroSlots[i];
    if (!slot) return;
    const dead = hero.hp <= 0;
    const acted = scene.heroActedThisRound[i] ?? false;
    const alpha = dead ? 0.35 : 1;

    scene.setHeroPose(slot.icon, hero.id, dead ? 'ko' : 'idle');
    slot.icon.setAlpha(alpha);

    slot.hpText.setAlpha(alpha).setText(`${Math.round(hero.hp)}/${hero.maxHp}`);
    slot.lbText.setAlpha(alpha).setText(`${Math.round(hero.charge)}%`);

    // HP / LB bar fill — stored directly on the slot
    const barW = HERO_CELL_W - 4 - HERO_SPRITE_SIZE - 6 - 6;
    slot.hpBarFill.setDisplaySize(
      Math.max(1, Math.round(clamp(hero.hp / hero.maxHp) * barW)),
      5
    );
    slot.lbBarFill.setDisplaySize(
      Math.max(1, Math.round(clamp(hero.charge / 100) * barW)),
      5
    );

    // Acted dim
    slot.actedDim.setVisible(acted && !dead);

    // Shield overlay — visible while hero is in defending stance
    slot.shieldIcon.setVisible(!dead && (hero.isDefending ?? false));
  });

  // Clear active highlight (no more single active hero in this UI)
  scene.activeHighlight.clear();
}

export function refreshButtons(scene: GameScene): void {
  if (!scene.battle) return;
  const active = scene.battle.status === 'active' && !scene.bossTurnAnimating;

  scene.heroSlots.forEach((slot, i) => {
    const hero = scene.battle?.heroes[i];
    if (!hero) return;
    const dead = hero.hp <= 0;
    const acted = scene.heroActedThisRound[i] ?? false;
    const canAct = active && !dead && !acted;

    // Cell hit area (attack on click)
    if (canAct) {
      slot.cellHit.setInteractive({ useHandCursor: true });
    } else {
      slot.cellHit.disableInteractive();
    }

    // SKL
    const skillReady = canAct && canUseSkill(hero);
    if (skillReady) {
      slot.sklBg
        .setInteractive({ useHandCursor: true })
        .setFillStyle(COLORS.btnSkill);
    } else {
      slot.sklBg.disableInteractive().setFillStyle(COLORS.btnDisabled);
    }
    const cooldown = hero.skillCooldown ?? 0;
    slot.sklText
      .setText(cooldown > 0 ? `CD${cooldown}` : 'SKL')
      .setAlpha(skillReady ? 1 : 0.4);

    // LMT — FF7-style blink when ready
    const ultReady = canAct && canUseUltimate(hero);
    const lmtTweenKey = `_lmtBlinkTween_${i}`;
    if (ultReady) {
      slot.lmtBg.setInteractive({ useHandCursor: true });
      slot.lmtText.setText('⚡LMT').setAlpha(1);
      const existing = (scene as any)[lmtTweenKey] as
        | Phaser.Tweens.Tween
        | undefined;
      if (!existing || !existing.isActive()) {
        const proxy = { t: 0 };
        const blink = scene.tweens.add({
          targets: proxy,
          t: 1,
          duration: 480,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
          onUpdate: () => {
            // Cycle gold → purple (FF7 limit break palette)
            const r = Math.round(0xfb + (0x92 - 0xfb) * proxy.t);
            const g = Math.round(0xbf + (0x40 - 0xbf) * proxy.t);
            const b = Math.round(0x24 + (0xdc - 0x24) * proxy.t);
            slot.lmtBg.setFillStyle((r << 16) | (g << 8) | b);
          },
        });
        (scene as any)[lmtTweenKey] = blink;
      }
    } else {
      const existing = (scene as any)[lmtTweenKey] as
        | Phaser.Tweens.Tween
        | undefined;
      if (existing?.isActive()) {
        existing.stop();
      }
      (scene as any)[lmtTweenKey] = undefined;
      slot.lmtBg.disableInteractive().setFillStyle(COLORS.btnDisabled);
      slot.lmtText.setText('LMT').setAlpha(0.4);
    }

    // DEFEND
    if (canAct) {
      slot.defBg
        .setInteractive({ useHandCursor: true })
        .setFillStyle(COLORS.btnDefend);
    } else {
      slot.defBg.disableInteractive().setFillStyle(COLORS.btnDisabled);
    }
    slot.defText.setText('DEF').setAlpha(canAct ? 1 : 0.4);
  });
}

export function refreshBattleLog(scene: GameScene): void {
  if (!scene.battle) return;
  const logs = scene.battle.logs;
  const living = scene.battle.heroes.filter((h) => h.hp > 0).length;
  const actedCount = scene.heroActedThisRound.filter(
    (a, i) => a && (scene.battle?.heroes[i]?.hp ?? 0) > 0
  ).length;

  scene.battleLogHeader.setText(
    `BATTLE LOG  ·  ${actedCount}/${living} acted  ·  R${scene.battle.round}`
  );

  const TONE_COLOR: Record<BattleLogEntry['tone'], string> = {
    hero: '#15803d',
    boss: '#dc2626',
    reward: '#d97706',
    system: '#6b7280',
  };

  const EFFECT_DESC: Record<BossSpecialEffectType, string> = {
    berserk: 'BERSERK — +dmg dealt & received',
    daze: 'DAZE — may miss attacks',
    silence: 'SILENCE — skills disabled',
    confuse: 'CONFUSE — may heal boss',
    blind: 'BLIND — accuracy reduced',
    rage: 'RAGE — boss ATK ×1.4',
    fortify: 'FORTIFY — boss DEF ×1.35',
    precision: 'PRECISION — boss never misses',
    evade: 'EVADE — boss may dodge',
  };

  scene.battleLogLines.forEach((lt, i) => {
    const entry = logs[i];
    if (!entry) {
      lt.setText('');
      return;
    }
    let msg = entry.message;
    if (entry.tone === 'boss' && entry.effectType) {
      const desc = EFFECT_DESC[entry.effectType];
      if (desc) msg += `\n${desc}`;
    }
    lt.setText(msg);
    lt.setColor(TONE_COLOR[entry.tone]);
    lt.setAlpha(i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12));
  });
}
