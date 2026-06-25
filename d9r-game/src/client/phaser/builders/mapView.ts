import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { TITLE_SCREEN_KEY } from '../scenes/BootScene';
import { HERO_SPRITE_CONFIG } from '../scenes/BootScene';
import { RAID_NODES, getBossAppearance, SNOO_BOSS_RIGHT_KEY } from '../../../shared/game/data/raidBosses';
import { GAME_Y, FALLBACK_HERO_ID } from '../scenes/GameSceneTypes';

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

// Runner track constants — exported so refreshMap can recalculate positions
export const RUNNER = {
  OBS_SPACING: 108,  // center-to-center between obstacles in container space
  LEAD_MARGIN: 110,  // x offset of first obstacle in container
  OBS_W: 36,
  OBS_H: 52,
  BOSS_SZ: 58,
  HERO_SZ: 68,
  HERO_SCREEN_X_RATIO: 0.26, // hero is always at ~26% of screen width
} as const;

export function buildMapView(scene: GameScene): void {
  // ── Community Raid panel ─────────────────────────────────────────────────
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
    scene.raidPanelBossText, scene.raidPanelUserText,
    scene.raidPanelBarBg, scene.raidPanelBarFill,
    scene.raidPanelPctText, scene.raidPanelTopText,
  ]);

  // ── Runner layout ────────────────────────────────────────────────────────
  const RUNNER_TOP    = panelY + panelH + PAD;
  const RUNNER_BOTTOM = H - 54;
  const RUNNER_H      = RUNNER_BOTTOM - RUNNER_TOP;
  const groundY       = RUNNER_TOP + Math.round(RUNNER_H * 0.60);

  const { OBS_SPACING, LEAD_MARGIN, OBS_W, OBS_H, BOSS_SZ, HERO_SZ } = RUNNER;

  // ── Static background (sky + ground, outside scrolling container) ────────
  const skyRect = scene.add.rectangle(
    W / 2, RUNNER_TOP + (groundY - RUNNER_TOP) / 2,
    W, groundY - RUNNER_TOP, 0x08101e
  );
  const groundRect = scene.add.rectangle(
    W / 2, (groundY + RUNNER_BOTTOM) / 2 + 1,
    W, RUNNER_BOTTOM - groundY + 2, 0x091409
  );
  const gndGfx = scene.add.graphics();
  gndGfx.lineStyle(2, 0x22c55e, 0.7);
  gndGfx.lineBetween(0, groundY, W, groundY);
  scene.mapGroup.add([skyRect, groundRect, gndGfx]);

  // Office building silhouettes (fixed parallax background)
  const bldgData = [
    { x: 44,  h: 90,  w: 38 }, { x: 124, h: 64,  w: 26 },
    { x: 208, h: 112, w: 52 }, { x: 302, h: 78,  w: 32 },
    { x: 378, h: 100, w: 44 }, { x: 448, h: 58,  w: 24 },
  ];
  bldgData.forEach(({ x, h, w }) => {
    const b = scene.add.rectangle(x, groundY - h / 2, w, h, 0x0e1a2a);
    scene.mapGroup.add(b);
    for (let wy = 6; wy < h - 4; wy += 10) {
      for (let wx = 4; wx < w - 2; wx += 8) {
        if (((x * 3 + wx * 7 + wy * 11) % 5) > 1) {
          const win = scene.add.rectangle(
            x - w / 2 + wx + 2, groundY - h + wy + 3, 4, 5, 0x1d3a5e, 0.7
          );
          scene.mapGroup.add(win);
        }
      }
    }
  });

  // ── Scrollable runner container (clipped to runner area) ─────────────────
  const maskGfx = scene.make.graphics({}, false);
  maskGfx.fillRect(0, RUNNER_TOP, W, RUNNER_H);
  const runnerContainer = scene.add.container(0, 0);
  runnerContainer.setMask(maskGfx.createGeometryMask());
  scene.mapRunnerContainer = runnerContainer;
  scene.mapGroup.add(runnerContainer);

  // Dashed road line (scrolls with container)
  const totalTrackW = LEAD_MARGIN * 2 + (RAID_NODES.length - 1) * OBS_SPACING;
  const dashGfx = scene.add.graphics();
  dashGfx.lineStyle(1, 0x22c55e, 0.16);
  for (let dx = 0; dx < totalTrackW; dx += 22) {
    dashGfx.lineBetween(dx, groundY - 2, dx + 12, groundY - 2);
  }
  runnerContainer.add(dashGfx);

  // ── Arrow navigation buttons (bottom-center, below runner) ─────────────
  const BTN_Y = RUNNER_BOTTOM + Math.round((H - RUNNER_BOTTOM) / 2);
  const makeArrow = (x: number, label: string, cb: () => void) => {
    const bg = scene.add
      .rectangle(x, BTN_Y, 64, 38, 0x0f172a, 0.95)
      .setInteractive({ useHandCursor: true });
    const txt = scene.add
      .text(x, BTN_Y, label, {
        fontSize: '28px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#f1f5f9',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', cb);
    scene.mapGroup.add([bg, txt]);
    return { bg, txt };
  };
  const leftArrow  = makeArrow(W / 2 - 56, '‹', () => scene.moveMapSelection(-1));
  const rightArrow = makeArrow(W / 2 + 56, '›', () => scene.moveMapSelection(1));
  scene.mapArrowLeftBg   = leftArrow.bg;
  scene.mapArrowLeftText = leftArrow.txt;
  scene.mapArrowRightBg   = rightArrow.bg;
  scene.mapArrowRightText = rightArrow.txt;

  // ── Hero sprite (created here, added to container AFTER nodes for correct z-order)
  const firstHeroId = scene.profile?.party[0] ?? FALLBACK_HERO_ID;
  const heroConfig  = HERO_SPRITE_CONFIG[firstHeroId] ?? HERO_SPRITE_CONFIG[FALLBACK_HERO_ID]!;
  const heroImg = scene.add
    .image(0, groundY - HERO_SZ / 2, heroConfig.key)
    .setDisplaySize(HERO_SZ, HERO_SZ)
    .setOrigin(0.5, 0.5);
  scene.setHeroPose(heroImg, firstHeroId, 'idle');
  scene.mapRunnerHeroImg = heroImg;

  // ── Boss obstacles ────────────────────────────────────────────────────────
  RAID_NODES.forEach((node, idx) => {
    const cx      = LEAD_MARGIN + idx * OBS_SPACING;  // center x in container
    const blockCY = groundY - OBS_H / 2;
    const isHidden = node.isHiddenFloor ?? false;

    // Obstacle block
    const bg = scene.add.rectangle(cx, blockCY, OBS_W, OBS_H, 0x1e293b).setOrigin(0.5);

    // Ring drawn around block (updated in refreshMap)
    const ring = scene.add.graphics();

    // Boss sprite above the block
    const bossTopY = groundY - OBS_H - BOSS_SZ / 2;
    const bossApp  = getBossAppearance(node.level);
    const bossImg  = scene.add
      .image(cx, bossTopY, SNOO_BOSS_RIGHT_KEY)
      .setDisplaySize(BOSS_SZ, BOSS_SZ)
      .setOrigin(0.5);
    if (typeof bossApp.spriteFrame === 'number') bossImg.setFrame(bossApp.spriteFrame);
    (scene as any)[`_bossMini_${node.level}`] = bossImg;

    // Status icon (✓ / ▶ / 🔒)
    const labelY = bossTopY - BOSS_SZ / 2 - 10;
    const label  = scene.add
      .text(cx, labelY, isHidden ? '?' : '🔒', {
        fontSize: '15px', fontFamily: FONT.emoji,
      })
      .setOrigin(0.5);

    // Boss name (short, above status icon)
    const subLabel = scene.add
      .text(cx, labelY - 14, isHidden ? '???' : node.name, {
        fontSize: '9px', fontFamily: FONT.sans, color: '#7dd3fc',
        wordWrap: { width: OBS_SPACING - 8 }, align: 'center',
      })
      .setOrigin(0.5, 1);

    // Floor number + title below the ground line
    const floorNumT = scene.add
      .text(cx, groundY + 6, isHidden ? '?' : `F${node.level}`, {
        fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#94a3b8',
      })
      .setOrigin(0.5, 0);
    const floorTitleT = scene.add
      .text(cx, groundY + 22, isHidden ? '' : node.title, {
        fontSize: '9px', fontFamily: FONT.sans, color: '#64748b',
        wordWrap: { width: OBS_SPACING - 8 }, align: 'center',
      })
      .setOrigin(0.5, 0);

    // Invisible hit area covering block + boss sprite
    const hitH = OBS_H + BOSS_SZ + 28;
    const hit  = scene.add
      .rectangle(cx, groundY - OBS_H / 2 - BOSS_SZ / 2, OBS_W + 20, hitH, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (scene.view !== 'map' || !scene.profile) return;
      const ok = isHidden
        ? scene.profile.raidLevel > 6
        : node.level <= scene.profile.raidLevel;
      if (ok) scene.openPartySelect(node.level);
    });

    runnerContainer.add([bg, ring, bossImg, label, subLabel, floorNumT, floorTitleT, hit]);

    scene.mapNodeRefs.push({
      level: node.level,
      name:  node.name,
      bg,
      ring,
      label,
      subLabel,
      hit,
      floorX: cx - OBS_W / 2,
      floorY: groundY - OBS_H,
      floorW: OBS_W,
      floorH: OBS_H,
    });
  });

  // Hero added last so it renders on top of all obstacle blocks and boss sprites
  runnerContainer.add(heroImg);

  // Save runner constants used by refreshMap
  (scene as any)._runnerGroundY = groundY;

}
