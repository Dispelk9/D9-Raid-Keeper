import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, PAD } from '../constants';
import {
  MAX_LOGS,
  canUseUltimate,
} from '../../../shared/game/logic/combat';
import {
  STAGE_X,
  STAGE_Y,
  STAGE_W,
  STAGE_H,
  INFO_BAR_H,
  BANNER_ZONE_H,
  BOSS_CONTENT_H,
  HERO_GRID_Y,
  HERO_CELL_W,
  HERO_CELL_H,
  HERO_SPRITE_SIZE,
  FALLBACK_HERO_ID,
  STATS_BAR_Y,
} from '../scenes/GameSceneTypes';

// offices.png: 3-col × 2-row grid, each cell 512×512
const OFFICE_FRAME: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 0,
  5: 2,
  6: 1,
};

export function buildRaidView(scene: GameScene): void {
  buildBattleField(scene);
  buildBossInfoBar(scene);
  buildBossSprite(scene);
  buildSideBossSprites(scene);
  buildHeroGrid(scene);
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
  if (scene.textures.exists('offices'))
    scene.stageBg.setTexture('offices', frame);
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
  const contentY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H;
  const bossCX = STAGE_X + Math.floor(STAGE_W / 2);
  const bossCY = contentY + Math.floor(BOSS_CONTENT_H / 2);
  scene.bossCX = bossCX;
  scene.bossCY = bossCY;

  const bossR = 70;
  scene.bossAura = scene.add.arc(
    bossCX,
    bossCY,
    bossR + 24,
    0,
    360,
    false,
    COLORS.boss,
    0.22
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

  scene.bossImage = scene.add
    .image(bossCX, bossCY, 'boss-product-owner')
    .setDisplaySize(120, 180)
    .setOrigin(0.5)
    .setVisible(false);

  scene.raidGroup.add([scene.bossAura, scene.bossImage]);
}

export function buildSideBossSprites(scene: GameScene): void {
  // Multi-boss layout: horizontal row of up to 3 bosses centered in the boss content area
  const contentY = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H;
  const slotW = Math.floor(STAGE_W / 3);
  const slotH = BOSS_CONTENT_H;

  scene.sideBossImages = [];
  scene.multiBossRefs = [];

  for (let i = 0; i < 3; i++) {
    const slotCX = STAGE_X + i * slotW + Math.floor(slotW / 2);
    const slotCY = contentY + Math.floor(slotH / 2);
    const ring = scene.add.graphics();
    const img = scene.add
      .image(slotCX, slotCY - 14, 'boss-product-owner')
      .setDisplaySize(80, 120)
      .setOrigin(0.5)
      .setVisible(false);

    const nameText = scene.add
      .text(slotCX, slotCY + 50, '', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        align: 'center',
        wordWrap: { width: slotW - 8 },
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    const hitArea = scene.add
      .rectangle(slotCX, slotCY, slotW - 4, slotH - 4, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    const bossIndex = i;
    hitArea.on('pointerdown', () => scene.handleBossTarget(bossIndex));

    scene.raidGroup.add([ring, img, nameText, hitArea]);
    scene.multiBossRefs.push({ image: img, nameText, hitArea, ring });
  }
}

// ── 2×2 hero grid ────────────────────────────────────────────────────────────
export function buildHeroGrid(scene: GameScene): void {
  const BTN_H = 26;
  const BTN_ROW_Y = HERO_CELL_H - 4 - BTN_H / 2; // btn center from cell top
  const BTN_W = Math.floor((HERO_CELL_W - PAD * 4) / 3);
  const ICON_R = HERO_SPRITE_SIZE / 2;
  const ICON_CX_OFF = 4 + ICON_R;
  const ICON_CY_OFF = Math.floor((HERO_CELL_H - BTN_H - 8) / 2);
  const TEXT_X_OFF = 4 + HERO_SPRITE_SIZE + 6;
  const BAR_W = HERO_CELL_W - TEXT_X_OFF - 6;
  // Upper non-button area height (used for cell hit area)
  const UPPER_H = HERO_CELL_H - BTN_H - 8;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = STAGE_X + col * HERO_CELL_W;
    const sy = HERO_GRID_Y + row * HERO_CELL_H;

    // Cell background + border
    const cellBg = scene.add.graphics();
    cellBg.fillStyle(0x000000, 0.38);
    cellBg.fillRect(sx, sy, HERO_CELL_W, HERO_CELL_H);
    cellBg.lineStyle(1, COLORS.border, 0.5);
    cellBg.strokeRect(sx, sy, HERO_CELL_W, HERO_CELL_H);

    const iconCX = sx + ICON_CX_OFF;
    const iconCY = sy + ICON_CY_OFF;

    const icon = scene.add
      .image(iconCX, iconCY, scene.getHeroSpriteKey(FALLBACK_HERO_ID))
      .setDisplaySize(HERO_SPRITE_SIZE, HERO_SPRITE_SIZE)
      .setOrigin(0.5);
    scene.setHeroPose(icon, FALLBACK_HERO_ID, 'idle');

    // ── HP bar + text ─────────────────────────────────────────────────
    const hpBarY = sy + 10;
    const hpBarBg = scene.add
      .rectangle(sx + TEXT_X_OFF, hpBarY, BAR_W, 5, COLORS.track)
      .setOrigin(0, 0.5);
    const hpBarFill = scene.add
      .rectangle(sx + TEXT_X_OFF, hpBarY, BAR_W, 5, COLORS.hp)
      .setOrigin(0, 0.5);

    const hpText = scene.add
      .text(sx + TEXT_X_OFF, hpBarY + 7, '—', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);

    // ── LB bar + text ─────────────────────────────────────────────────
    const lbBarY = sy + 32;
    const lbBarBg = scene.add
      .rectangle(sx + TEXT_X_OFF, lbBarY, BAR_W, 5, COLORS.track)
      .setOrigin(0, 0.5);
    const lbBarFill = scene.add
      .rectangle(sx + TEXT_X_OFF, lbBarY, 1, 5, COLORS.charge)
      .setOrigin(0, 0.5);

    const lbText = scene.add
      .text(sx + TEXT_X_OFF, lbBarY + 7, '—%', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);

    // ── Cell-wide hit area for attack (above buttons) ─────────────────
    const heroIdx = i;
    const cellHit = scene.add
      .rectangle(
        sx + HERO_CELL_W / 2,
        sy + UPPER_H / 2,
        HERO_CELL_W,
        UPPER_H,
        0x000000,
        0
      )
      .setInteractive({ useHandCursor: true });
    cellHit.on('pointerdown', () => scene.handleHeroAction(heroIdx, 'attack'));

    // ── Action buttons: SKL, LMT, DEFEND ─────────────────────────────
    const btnCY = sy + BTN_ROW_Y;
    const makeBtn = (bx: number, label: string, color: number) => {
      const bg = scene.add
        .rectangle(bx + BTN_W / 2, btnCY, BTN_W, BTN_H, color)
        .setInteractive({ useHandCursor: true });
      const txt = scene.add
        .text(bx + BTN_W / 2, btnCY, label, {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      scene.raidGroup.add([bg, txt]);
      return [bg, txt] as const;
    };

    const sklX = sx + PAD;
    const lmtX = sklX + BTN_W + PAD;
    const defX = lmtX + BTN_W + PAD;

    const [sklBg, sklText] = makeBtn(sklX, 'SKL', COLORS.btnSkill);
    const [lmtBg, lmtText] = makeBtn(lmtX, 'LMT', COLORS.btnUlt);
    const [defBg, defText] = makeBtn(defX, 'DEF', COLORS.btnDefend);

    sklBg.on('pointerdown', () => scene.openSkillChoice(heroIdx));
    lmtBg.on('pointerdown', () => {
      if (!scene.battle || scene.battle.status !== 'active') return;
      const hero = scene.battle.heroes[heroIdx];
      if (!hero || !canUseUltimate(hero)) return;
      const ultName = hero.ultimate?.name ?? '⚡ Limit Break';
      scene.showHeroSkillBanner(ultName, () =>
        scene.handleHeroAction(heroIdx, 'ultimate')
      );
    });
    defBg.on('pointerdown', () => scene.handleHeroAction(heroIdx, 'defend'));

    // Acted overlay
    const actedDim = scene.add
      .rectangle(
        sx + HERO_CELL_W / 2,
        sy + HERO_CELL_H / 2,
        HERO_CELL_W,
        HERO_CELL_H,
        0x000000,
        0.45
      )
      .setVisible(false);

    // Shield overlay (shown while hero.isDefending)
    const shieldIcon = scene.add
      .text(iconCX + 20, iconCY - 20, '🛡', {
        fontSize: '18px',
        fontFamily: FONT.emoji ?? 'serif',
      })
      .setOrigin(0.5)
      .setDepth(14)
      .setVisible(false);

    scene.raidGroup.add([
      cellBg,
      icon,
      hpBarBg,
      hpBarFill,
      hpText,
      lbBarBg,
      lbBarFill,
      lbText,
      cellHit,
      actedDim,
      shieldIcon,
    ]);

    scene.heroSlots.push({
      icon,
      hpBarFill,
      lbBarFill,
      hpText,
      lbText,
      objects: [
        cellBg,
        icon,
        hpBarBg,
        hpBarFill,
        hpText,
        lbBarBg,
        lbBarFill,
        lbText,
        cellHit,
        sklBg,
        sklText,
        lmtBg,
        lmtText,
        defBg,
        defText,
        actedDim,
        shieldIcon,
      ],
      iconCX,
      iconCY,
      sx,
      sy,
      sw: HERO_CELL_W,
      sh: HERO_CELL_H,
      cellHit,
      defBg,
      defText,
      sklBg,
      sklText,
      lmtBg,
      lmtText,
      actedDim,
      shieldIcon,
    });
  }
}

export function buildActiveHighlight(scene: GameScene): void {
  scene.activeHighlight = scene.add.graphics();
  scene.raidGroup.add(scene.activeHighlight);
}

export function buildBattleLog(scene: GameScene): void {
  const lbY = STATS_BAR_Y;
  const lbW = STAGE_W;
  const headerH = 22;
  const lineH = 30;
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
