import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, W, PAD } from '../constants';
import { HUD_KEY } from '../scenes/BootScene';
import { SNOO_BOSS_RIGHT_KEY } from '../../../shared/game/data/raidBosses';
import { MAX_LOGS, canUseUltimate, getActiveHero } from '../../../shared/game/logic/combat';
import {
  STAGE_X, STAGE_Y, STAGE_W, STAGE_H, INFO_BAR_H, ACTION_H, BANNER_ZONE_H,
  BOSS_AREA_W, HERO_AREA_X, HERO_AREA_W, HERO_SLOT_H, HERO_SPRITE_SIZE,
  HERO_BAR_X_OFF, HERO_FRAME_DISPLAY_W, HERO_FRAME_DISPLAY_H, FALLBACK_HERO_ID, STATS_BAR_Y
} from '../scenes/GameSceneTypes';

// offices.png: 3-col × 2-row grid, each cell 512×512
// frame 1 (top-middle) = CCO/CEO (user-confirmed)
// frame 4 (bottom-middle) = PM yellow office
const OFFICE_FRAME: Record<number, number> = {
  1: 3, // Product Owner → bottom-left
  2: 4, // Project Manager → bottom-middle (yellow)
  3: 5, // Tech Lead → bottom-right
  4: 0, // Engineering Manager → top-left
  5: 2, // Director of Engineering → top-right
  6: 1, // CCO → top-middle (confirmed by user)
};

export function buildRaidView(scene: GameScene): void {
  buildBattleField(scene);
  buildBossInfoBar(scene);
  buildBossSprite(scene);
  buildSideBossSprites(scene);
  buildHeroSlotsUI(scene);
  buildActionButtons(scene);
  buildActiveHighlight(scene);
  buildBattleLog(scene);
}

export function buildBattleField(scene: GameScene): void {
  scene.stageBg = scene.add
    .image(STAGE_X + STAGE_W / 2, STAGE_Y + STAGE_H / 2, 'offices', 0)
    .setDisplaySize(STAGE_W, STAGE_H)
    .setOrigin(0.5);

  scene.raidGroup.add(scene.stageBg);
}

export function updateStageBg(scene: GameScene, raidLevel: number): void {
  const frame = OFFICE_FRAME[raidLevel] ?? 0;
  if (scene.textures.exists('offices')) {
    scene.stageBg.setTexture('offices', frame);
  }
}

export function buildBossInfoBar(scene: GameScene): void {
  const bx = STAGE_X + PAD;
  const by = STAGE_Y + PAD;
  const bw = STAGE_W - PAD * 2;

  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 0.94);
  bg.fillRoundedRect(bx, by, bw, INFO_BAR_H, 6);

  scene.bossTitleText = scene.add
    .text(bx + PAD, by + 8, '', {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#b91c1c',
    })
    .setOrigin(0, 0);

  scene.bossNameText = scene.add
    .text(bx + PAD, by + 20, '', {
      fontSize: '13px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0, 0);

  scene.bossHpText = scene.add
    .text(bx + bw - PAD, by + 14, '', {
      fontSize: '10px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#52525b',
    })
    .setOrigin(1, 0.5);

  const hpY = by + INFO_BAR_H - 11;
  const hpTrack = scene.add
    .rectangle(bx + bw / 2, hpY, bw, 7, COLORS.track)
    .setOrigin(0.5);
  scene.bossHpFill = scene.add
    .rectangle(bx, hpY, bw, 7, COLORS.boss)
    .setOrigin(0, 0.5);

  scene.raidGroup.add([
    bg,
    scene.bossTitleText,
    scene.bossNameText,
    scene.bossHpText,
    hpTrack,
    scene.bossHpFill,
  ]);
}

export function buildBossSprite(scene: GameScene): void {
  const contentY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H + PAD;
  const contentH = STAGE_H - INFO_BAR_H - BANNER_ZONE_H - PAD - ACTION_H - PAD * 2;
  const bossCX = STAGE_X + Math.floor(BOSS_AREA_W / 2);
  const bossCY = contentY + Math.floor(contentH / 2);
  const bossR = 56;
  scene.bossCX = bossCX;
  scene.bossCY = bossCY;

  scene.bossAura = scene.add.arc(
    bossCX,
    bossCY,
    bossR + 20,
    0,
    360,
    false,
    COLORS.boss,
    0.25
  );
  scene.tweens.add({
    targets: scene.bossAura,
    scaleX: 1.12,
    scaleY: 1.12,
    alpha: 0.1,
    duration: 950,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  // Boss image — texture is set in refreshBoss(); hidden until first refresh
  scene.bossImage = scene.add
    .image(bossCX, bossCY, SNOO_BOSS_RIGHT_KEY)
    .setDisplaySize(bossR * 2, bossR * 2)
    .setOrigin(0.5)
    .setVisible(false);

  scene.raidGroup.add([scene.bossAura, scene.bossImage]);
}

export function buildSideBossSprites(scene: GameScene): void {
  // Vertical multi-boss slots — one per hidden-floor boss (up to 3).
  // Each slot: image | name | HP bar | tap-to-target area.
  const contentY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H + PAD;
  const contentH = STAGE_H - INFO_BAR_H - BANNER_ZONE_H - PAD - ACTION_H - PAD * 2;
  const slotH = Math.floor(contentH / 3);
  const bx = STAGE_X;
  const bw = BOSS_AREA_W;

  scene.sideBossImages = []; // kept empty; slot images tracked via multiBossRefs
  scene.multiBossRefs = [];

  for (let i = 0; i < 3; i++) {
    const slotCY = contentY + i * slotH + Math.floor(slotH / 2);
    const imgSize = 52;
    const imgX = bx + 8 + imgSize / 2;

    const ring = scene.add.graphics();

    const img = scene.add
      .image(imgX, slotCY, SNOO_BOSS_RIGHT_KEY, 0)
      .setDisplaySize(imgSize, imgSize)
      .setOrigin(0.5)
      .setVisible(false);

    const textX = imgX + imgSize / 2 + 6;
    const textW = bw - imgSize - 20;

    const nameText = scene.add
      .text(textX, slotCY - 14, '', {
        fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
        wordWrap: { width: textW },
      })
      .setOrigin(0, 0.5);

    const hpTrack = scene.add
      .rectangle(textX + textW / 2, slotCY, textW, 6, COLORS.track)
      .setOrigin(0.5);
    const hpFill = scene.add
      .rectangle(textX, slotCY, textW, 6, COLORS.boss)
      .setOrigin(0, 0.5);
    const hpText = scene.add
      .text(textX, slotCY + 8, '', {
        fontSize: '8px', fontFamily: FONT.sans, color: '#52525b',
      })
      .setOrigin(0, 0);

    const hitArea = scene.add
      .rectangle(bx + bw / 2, slotCY, bw, slotH - 4, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    const bossIndex = i;
    hitArea.on('pointerdown', () => scene.handleBossTarget(bossIndex));

    scene.raidGroup.add([ring, img, nameText, hpTrack, hpFill, hpText, hitArea]);
    scene.multiBossRefs.push({ image: img, hpFill, hpText, nameText, hitArea, ring });
  }
}

export function buildHeroSlotsUI(scene: GameScene): void {
  const contentY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H + PAD;
  const slotW = HERO_AREA_W - PAD;
  const textX = HERO_AREA_X + HERO_BAR_X_OFF;
  const stroke = { stroke: '#000000', strokeThickness: 3 };

  for (let i = 0; i < 5; i++) {
    const sx = HERO_AREA_X;
    const sy = contentY + i * (HERO_SLOT_H + 5);
    const cx = sx + HERO_SPRITE_SIZE / 2 - 2;
    const cy = sy + HERO_SLOT_H / 2;

    const icon = scene.add
      .image(cx, cy, scene.getHeroSpriteKey(FALLBACK_HERO_ID))
      .setDisplaySize(HERO_FRAME_DISPLAY_W, HERO_FRAME_DISPLAY_H)
      .setOrigin(0.5);
    scene.setHeroPose(icon, FALLBACK_HERO_ID, 'idle');

    const hpText = scene.add
      .text(textX, cy - 8, '—', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
        ...stroke,
      })
      .setOrigin(0, 0.5);

    const lbText = scene.add
      .text(textX, cy + 12, '—%', {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#fbbf24',
        ...stroke,
      })
      .setOrigin(0, 0.5);

    scene.raidGroup.add([icon, hpText, lbText]);
    scene.heroSlots.push({
      icon,
      hpText,
      lbText,
      objects: [icon, hpText, lbText],
      iconCX: cx,
      iconCY: cy,
      sx,
      sy,
      sw: slotW,
      sh: HERO_SLOT_H,
    });
  }
}

export function buildActionButtons(scene: GameScene): void {
  const btnY = STAGE_Y + STAGE_H - PAD - ACTION_H / 2;
  const btnW = Math.floor((STAGE_W - PAD * 4) / 3);
  const gap = Math.floor((STAGE_W - PAD * 2 - btnW * 3) / 2);
  const startX = STAGE_X + PAD + btnW / 2;

  const hud = scene.add
    .image(STAGE_X + STAGE_W / 2, btnY, HUD_KEY)
    .setDisplaySize(STAGE_W - PAD * 2, ACTION_H)
    .setOrigin(0.5);
  scene.raidGroup.add(hud);

  const makeBtn = (cx: number, label: string) => {
    const bg = scene.add
      .rectangle(cx, btnY, btnW, ACTION_H - 18, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    const txt = scene.add
      .text(cx, btnY, label, {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    scene.raidGroup.add([bg, txt]);
    return [bg, txt] as const;
  };

  [scene.attackBtnBg, scene.attackBtnText] = makeBtn(startX, 'Attack');
  scene.attackBtnBg.on('pointerdown', () => scene.handleAction('attack'));

  [scene.skillBtnBg, scene.skillBtnText] = makeBtn(
    startX + btnW + gap,
    'Skill'
  );
  scene.skillBtnBg.on('pointerdown', () => scene.openSkillChoice());

  [scene.ultBtnBg, scene.ultBtnText] = makeBtn(
    startX + (btnW + gap) * 2,
    '⚡ Limit'
  );
  scene.ultBtnBg.on('pointerdown', () => {
    if (!scene.battle || scene.battle.status !== 'active') return;
    const activeHero = getActiveHero(scene.battle);
    if (!activeHero || !canUseUltimate(activeHero)) return;
    const ultName = activeHero.ultimate?.name ?? '⚡ Limit Break';
    scene.showHeroSkillBanner(ultName, () => scene.handleAction('ultimate'));
  });
}

export function buildActiveHighlight(scene: GameScene): void {
  scene.activeHighlight = scene.add.graphics();
  scene.raidGroup.add(scene.activeHighlight);
}

export function buildBattleLog(scene: GameScene): void {
  const lbY = STATS_BAR_Y;
  const lbW = STAGE_W;
  const headerH = 22;
  const lineH = 22;
  const lbH = headerH + MAX_LOGS * lineH + PAD;

  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.statsBg);
  bg.fillRoundedRect(STAGE_X, lbY, lbW, lbH, 8);
  bg.lineStyle(1, COLORS.border, 1);
  bg.strokeRoundedRect(STAGE_X, lbY, lbW, lbH, 8);

  scene.battleLogHeader = scene.add
    .text(STAGE_X + PAD, lbY + 5, 'BATTLE LOG', {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#a1a1aa',
    })
    .setOrigin(0, 0);

  const lines: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < MAX_LOGS; i++) {
    const lt = scene.add
      .text(STAGE_X + PAD, lbY + headerH + i * lineH, '', {
        fontSize: '12px',
        fontFamily: FONT.sans,
        color: '#3f3f46',
        wordWrap: { width: lbW - PAD * 2 },
      })
      .setOrigin(0, 0);
    lines.push(lt);
  }
  scene.battleLogLines = lines;

  scene.raidGroup.add([bg, scene.battleLogHeader, ...lines]);
}
