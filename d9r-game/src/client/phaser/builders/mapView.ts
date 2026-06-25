import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { TITLE_SCREEN_KEY } from '../scenes/BootScene';
import { RAID_NODES } from '../../../shared/game/data/raidBosses';
import { GAME_Y } from '../scenes/GameSceneTypes';

export function buildTitleView(scene: GameScene): void {
  const bg = scene.add
    .image(W / 2, H / 2, TITLE_SCREEN_KEY)
    .setDisplaySize(W, H)
    .setOrigin(0.5);

  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.08);

  const makeButton = (y: number, label: string, onClick: () => void) => {
    const bgRect = scene.add
      .rectangle(W / 2, y, 238, 46, COLORS.ink, 0.88)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(W / 2, y, label, {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    bgRect.on('pointerdown', onClick);
    scene.titleGroup.add([bgRect, text]);
  };

  scene.titleGroup.add([bg, shade]);
  makeButton(520, 'New Game', () => scene.showNewGameConfirm());
  makeButton(574, 'Continue', () => scene.handleContinue());
  makeButton(628, 'Help', () => scene.setView('help'));
}

export function buildMapView(scene: GameScene): void {
  // ── Community Raid panel ───────────────────────────────────────────────
  const panelY = GAME_Y;
  const panelH = 62;
  const barY   = panelY + 36;
  const barW   = W - PAD * 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x1e1b4b, 0.95);
  panelBg.fillRoundedRect(PAD, panelY, W - PAD * 2, panelH, 8);

  scene.raidPanelBossText = scene.add
    .text(PAD + 10, panelY + 6, '🔥 Loading community raid…', {
      fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#f9a8d4',
    });

  scene.raidPanelUserText = scene.add
    .text(W - PAD - 10, panelY + 6, '', {
      fontSize: '10px', fontFamily: FONT.sans, color: '#a78bfa',
    })
    .setOrigin(1, 0);

  scene.raidPanelBarBg = scene.add
    .rectangle(PAD + barW / 2, barY + 4, barW, 8, 0x374151)
    .setOrigin(0.5, 0.5);

  scene.raidPanelBarFill = scene.add
    .rectangle(PAD, barY + 4, barW, 8, 0xef4444)
    .setOrigin(0, 0.5);

  scene.raidPanelPctText = scene.add
    .text(PAD + 10, barY + 10, '', {
      fontSize: '8px', fontFamily: FONT.sans, color: '#9ca3af',
    });

  scene.raidPanelTopText = scene.add
    .text(W - PAD - 10, barY + 10, '', {
      fontSize: '8px', fontFamily: FONT.sans, color: '#fde68a',
    })
    .setOrigin(1, 0);

  scene.mapGroup.add([
    panelBg,
    scene.raidPanelBossText,
    scene.raidPanelUserText,
    scene.raidPanelBarBg,
    scene.raidPanelBarFill,
    scene.raidPanelPctText,
    scene.raidPanelTopText,
  ]);

  // ── Carousel layout constants ──────────────────────────────────────────
  const CAROUSEL_TOP    = panelY + panelH + PAD;
  const CAROUSEL_BOTTOM = H - 54;
  const CAROUSEL_H      = CAROUSEL_BOTTOM - CAROUSEL_TOP;
  const CARD_W          = W - PAD * 6;      // ~382px — comfortable margin
  const CARD_H          = CAROUSEL_H - 16;  // ~540px — tall card
  const CARD_SPACING    = 20;
  const CAROUSEL_CX     = W / 2;
  const CARD_CY         = CAROUSEL_TOP + CAROUSEL_H / 2;

  scene.mapCarouselCardW       = CARD_W;
  scene.mapCarouselCardSpacing = CARD_SPACING;

  // Mask — clips cards outside the carousel viewport
  const maskGfx = scene.make.graphics({}, false);
  maskGfx.fillRect(0, CAROUSEL_TOP, W, CAROUSEL_H);

  // Horizontal container holding all cards; we scroll it left/right
  const carouselContainer = scene.add.container(0, 0);
  carouselContainer.setMask(maskGfx.createGeometryMask());
  scene.mapCarouselContainer = carouselContainer;

  // ── Build one card per floor ───────────────────────────────────────────
  RAID_NODES.forEach((node, idx) => {
    // World-x of the card center when carousel is at x=0
    const cardCX = CAROUSEL_CX + idx * (CARD_W + CARD_SPACING);
    const cardX  = cardCX - CARD_W / 2;   // top-left
    const cardY  = CARD_CY - CARD_H / 2;

    const isHidden = node.isHiddenFloor ?? false;

    // ── Card background & ring ──────────────────────────────────────────
    const bg = scene.add.rectangle(cardCX, CARD_CY, CARD_W, CARD_H, 0x1e293b);
    bg.setOrigin(0.5);

    const ring = scene.add.graphics();

    // ── Floor badge (top-left) ──────────────────────────────────────────
    const badgeBg = scene.add.graphics();
    badgeBg.fillStyle(0x0f172a, 0.9);
    badgeBg.fillRoundedRect(cardX + 14, cardY + 14, 44, 44, 8);

    const floorNumText = scene.add
      .text(cardX + 36, cardY + 36, isHidden ? '?' : String(node.level), {
        fontSize: isHidden ? '22px' : '20px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#64748b',
      })
      .setOrigin(0.5);

    // ── Status badge (top-right) ────────────────────────────────────────
    const statusText = scene.add
      .text(cardX + CARD_W - 14, cardY + 14, '🔒', {
        fontSize: '18px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(1, 0);

    // ── Divider line ────────────────────────────────────────────────────
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x334155, 0.6);
    divider.lineBetween(cardX + 14, cardY + 70, cardX + CARD_W - 14, cardY + 70);

    // ── Boss name ───────────────────────────────────────────────────────
    const bossNameText = scene.add
      .text(cardCX, cardY + 100,
        isHidden ? '???' : node.name, {
        fontSize: '22px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#e2e8f0',
        wordWrap: { width: CARD_W - 32 },
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // ── Floor title ─────────────────────────────────────────────────────
    const floorTitleText = scene.add
      .text(cardCX, cardY + 138,
        isHidden ? 'All bosses — final stand' : node.title, {
        fontSize: '12px',
        fontFamily: FONT.sans,
        color: '#64748b',
        wordWrap: { width: CARD_W - 32 },
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // ── Summary text ────────────────────────────────────────────────────
    const summaryText = scene.add
      .text(cardCX, cardY + 170,
        isHidden ? '???' : node.summary, {
        fontSize: '11px',
        fontFamily: FONT.sans,
        color: '#475569',
        wordWrap: { width: CARD_W - 40 },
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    // ── "Select" action button ─────────────────────────────────────────
    const selectBtnY = cardY + CARD_H - 52;
    const selectBtnBg = scene.add
      .rectangle(cardCX, selectBtnY, CARD_W - 40, 40, COLORS.ink)
      .setInteractive({ useHandCursor: true });

    const selectBtnText = scene.add
      .text(cardCX, selectBtnY, `Floor ${node.level} — Deploy`, {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    selectBtnBg.on('pointerdown', () => scene.openPartySelect(node.level));

    // ── Hit area (whole card for swiping) ───────────────────────────────
    const hit = scene.add
      .rectangle(cardCX, CARD_CY, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    carouselContainer.add([
      bg, ring, badgeBg, floorNumText,
      statusText, divider,
      bossNameText, floorTitleText, summaryText,
      selectBtnBg, selectBtnText,
      hit,
    ]);

    scene.mapNodeRefs.push({
      level: node.level,
      name: node.name,
      bg,
      ring,
      label: statusText,    // top-right status icon
      subLabel: bossNameText, // boss name
      hit,
      floorX: cardX,
      floorY: cardY,
      floorW: CARD_W,
      floorH: CARD_H,
    });

    // Store extra refs for refreshMap
    (scene as any)[`_cardSelectBtnBg_${node.level}`]   = selectBtnBg;
    (scene as any)[`_cardSelectBtnTxt_${node.level}`]  = selectBtnText;
    (scene as any)[`_cardFloorNum_${node.level}`]      = floorNumText;
    (scene as any)[`_cardFloorTitle_${node.level}`]    = floorTitleText;
    (scene as any)[`_cardSummary_${node.level}`]       = summaryText;
  });

  scene.mapGroup.add(carouselContainer);

  // ── Swipe / drag interaction ───────────────────────────────────────────
  scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    if (scene.view !== 'map') return;
    scene.mapCarouselIsDragging = true;
    scene.mapCarouselDragStartX = ptr.x;
    scene.mapCarouselDragStartContainerX = carouselContainer.x;
  });

  scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
    if (!scene.mapCarouselIsDragging || scene.view !== 'map') return;
    const dx = ptr.x - scene.mapCarouselDragStartX;
    const maxRight = 0;
    const maxLeft  = -(RAID_NODES.length - 1) * (CARD_W + CARD_SPACING);
    carouselContainer.x = Phaser.Math.Clamp(
      scene.mapCarouselDragStartContainerX + dx,
      maxLeft,
      maxRight
    );
  });

  scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
    if (!scene.mapCarouselIsDragging || scene.view !== 'map') return;
    scene.mapCarouselIsDragging = false;
    const dx = ptr.x - scene.mapCarouselDragStartX;
    let newIdx = scene.mapCarouselIndex;
    if (dx < -40)       newIdx = Math.min(RAID_NODES.length - 1, newIdx + 1);
    else if (dx > 40)   newIdx = Math.max(0, newIdx - 1);
    snapCarouselTo(scene, carouselContainer, newIdx, CARD_W, CARD_SPACING);
  });

  // ── Navigation dots ────────────────────────────────────────────────────
  const dotsY = CAROUSEL_BOTTOM - 6;
  const DOT_R = 3;
  const DOT_GAP = 10;
  const totalDots = RAID_NODES.length;
  const dotsStartX = W / 2 - ((totalDots - 1) * DOT_GAP) / 2;

  const dots: Phaser.GameObjects.Arc[] = [];
  RAID_NODES.forEach((_, i) => {
    const dot = scene.add
      .arc(dotsStartX + i * DOT_GAP, dotsY, DOT_R, 0, 360, false, 0x475569, 1)
      .setInteractive({ useHandCursor: true });
    dot.on('pointerdown', () => {
      snapCarouselTo(scene, carouselContainer, i, CARD_W, CARD_SPACING);
    });
    dots.push(dot);
    scene.mapGroup.add(dot);
  });
  (scene as any)._carouselDots = dots;

  // ── Bottom navigation buttons ──────────────────────────────────────────
  const heroesBtn = scene.add
    .rectangle(PAD + 48, H - 34, 88, 38, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  heroesBtn.on('pointerdown', () => scene.setView('heroes'));
  const heroesText = scene.add
    .text(PAD + 48, H - 34, 'Heroes', {
      fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
    })
    .setOrigin(0.5);
  const lootBtn = scene.add
    .rectangle(W - PAD - 48, H - 34, 88, 38, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  lootBtn.on('pointerdown', () => scene.setView('loot'));
  const lootText = scene.add
    .text(W - PAD - 48, H - 34, 'Loot', {
      fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
    })
    .setOrigin(0.5);
  scene.mapGroup.add([heroesBtn, heroesText, lootBtn, lootText]);
}

export function snapCarouselTo(
  scene: GameScene,
  container: Phaser.GameObjects.Container,
  index: number,
  cardW: number,
  spacing: number
): void {
  const clamped = Phaser.Math.Clamp(index, 0, RAID_NODES.length - 1);
  scene.mapCarouselIndex = clamped;
  const targetX = -clamped * (cardW + spacing);

  // Update navigation dots
  const dots: Phaser.GameObjects.Arc[] = (scene as any)._carouselDots ?? [];
  dots.forEach((dot, i) => {
    dot.setFillStyle(i === clamped ? 0xf97316 : 0x475569, 1);
    dot.setRadius(i === clamped ? 4 : 3);
  });

  scene.tweens.add({
    targets: container,
    x: targetX,
    duration: 280,
    ease: 'Cubic.Out',
  });
}
