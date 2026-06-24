import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { TITLE_SCREEN_KEY } from '../scenes/BootScene';
import { RAID_NODES, getRaidNode } from '../../../shared/game/data/raidBosses';
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
  const title = scene.add
    .text(W / 2, GAME_Y + 4, 'Corporate Tower', {
      fontSize: '20px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0.5, 0);
  const subtitle = scene.add
    .text(W / 2, GAME_Y + 28, 'Clear each floor room to reach the CEO.', {
      fontSize: '11px',
      fontFamily: FONT.sans,
      color: '#52525b',
    })
    .setOrigin(0.5, 0);

  // ── Community Raid panel ───────────────────────────────────────────────
  const panelY  = GAME_Y + 46;
  const panelH  = 68;
  const barY    = panelY + 36;
  const barW    = W - PAD * 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x1e1b4b, 0.9);
  panelBg.fillRoundedRect(PAD, panelY, W - PAD * 2, panelH, 8);

  scene.raidPanelBossText = scene.add
    .text(PAD + 10, panelY + 8, '🔥 Loading community raid…', {
      fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#f9a8d4',
    });

  scene.raidPanelUserText = scene.add
    .text(W - PAD - 10, panelY + 8, '', {
      fontSize: '10px', fontFamily: FONT.sans, color: '#a78bfa',
    })
    .setOrigin(1, 0);

  scene.raidPanelBarBg = scene.add
    .rectangle(PAD + barW / 2, barY + 5, barW, 10, 0x374151)
    .setOrigin(0.5, 0.5);

  scene.raidPanelBarFill = scene.add
    .rectangle(PAD, barY + 5, barW, 10, 0xef4444)
    .setOrigin(0, 0.5);

  scene.raidPanelPctText = scene.add
    .text(PAD + 10, barY + 13, '', {
      fontSize: '9px', fontFamily: FONT.sans, color: '#9ca3af',
    });

  scene.raidPanelTopText = scene.add
    .text(W - PAD - 10, barY + 13, '', {
      fontSize: '9px', fontFamily: FONT.sans, color: '#fde68a',
    })
    .setOrigin(1, 0);

  scene.mapGroup.add([
    title,
    subtitle,
    panelBg,
    scene.raidPanelBossText,
    scene.raidPanelUserText,
    scene.raidPanelBarBg,
    scene.raidPanelBarFill,
    scene.raidPanelPctText,
    scene.raidPanelTopText,
  ]);

  // ── Scrollable floor rooms ─────────────────────────────────────────────
  const SCROLL_TOP = panelY + panelH + PAD;   // ≈184
  const SCROLL_BOTTOM = H - 54;               // ≈706
  const SCROLL_H = SCROLL_BOTTOM - SCROLL_TOP;

  // Each floor room is spaced 100 px apart.
  const NODE_SPACING = 100;

  // Nodes sit in world-space coords (container at y=0 initially).
  // Floor 1 (index 0) placed near SCROLL_BOTTOM, Floor 6 (index 5) near top.
  const nodePoints = RAID_NODES.map((node, index) => ({
    level: node.level,
    x: W / 2 + (index % 2 === 0 ? -54 : 54),
    // World y with container.y=0: floor 1 near bottom of visible area
    y: SCROLL_BOTTOM - 40 - index * NODE_SPACING,
  }));

  // Scroll bounds: scrolling down (container.y grows) reveals top floors.
  // Clamp so the topmost floor doesn't go off the top of scroll area.
  const topFloorY = nodePoints[nodePoints.length - 1]?.y ?? 0;
  scene.mapScrollMin = 0;
  scene.mapScrollMax = Math.max(0, SCROLL_TOP + 50 - topFloorY);

  // Container for scrollable nodes
  const nodesContainer = scene.add.container(0, 0);

  // Mask — fixed in world space, clips nodes that leave the scroll area
  const maskGfx = scene.make.graphics({}, false);
  maskGfx.fillRect(0, SCROLL_TOP, W, SCROLL_H);
  nodesContainer.setMask(maskGfx.createGeometryMask());

  // Path lines between floor rooms
  const path = scene.add.graphics();
  path.lineStyle(5, 0x94a3b8, 0.42);
  nodePoints.forEach((point, index) => {
    const next = nodePoints[index + 1];
    if (!next) return;
    path.lineBetween(point.x, point.y, next.x, next.y);
  });
  nodesContainer.add(path);

  // Build each floor room node
  nodePoints.forEach((point) => {
    const node = getRaidNode(point.level);
    const ring = scene.add.graphics();
    const bg = scene.add
      .circle(point.x, point.y, 34, COLORS.white)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(point.x, point.y - 8, String(point.level), {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5);
    const subLabel = scene.add
      .text(point.x, point.y + 13, node.name, {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#52525b',
        wordWrap: { width: 90 },
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // Use pointerup so drag scrolling doesn't accidentally open party select
    bg.on('pointerup', () => {
      if (scene.mapDraggedPx < 10) {
        scene.openPartySelect(point.level);
      }
    });

    nodesContainer.add([ring, bg, label, subLabel]);
    scene.mapNodeRefs.push({
      level: point.level,
      name: node.name,
      bg,
      ring,
      label,
      subLabel,
      hit: bg,
    });
  });

  scene.mapGroup.add(nodesContainer);

  // Scroll interaction via scene-level pointer events
  scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    if (scene.view !== 'map') return;
    scene.mapIsDragging = true;
    scene.mapDraggedPx = 0;
    scene.mapDragStartPtrY = ptr.y;
    scene.mapDragStartContainerY = nodesContainer.y;
  });

  scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
    if (!scene.mapIsDragging || scene.view !== 'map') return;
    const dy = ptr.y - scene.mapDragStartPtrY;
    scene.mapDraggedPx = Math.abs(dy);
    if (scene.mapDraggedPx > 4) {
      nodesContainer.setY(
        Phaser.Math.Clamp(
          scene.mapDragStartContainerY + dy,
          scene.mapScrollMin,
          scene.mapScrollMax
        )
      );
    }
  });

  scene.input.on('pointerup', () => {
    scene.mapIsDragging = false;
  });

  // Bottom navigation buttons (static, outside scroll container)
  const heroesBtn = scene.add
    .rectangle(PAD + 48, H - 34, 88, 38, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  heroesBtn.on('pointerdown', () => scene.setView('heroes'));
  const heroesText = scene.add
    .text(PAD + 48, H - 34, 'Heroes', {
      fontSize: '12px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  const lootBtn = scene.add
    .rectangle(W - PAD - 48, H - 34, 88, 38, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  lootBtn.on('pointerdown', () => scene.setView('loot'));
  const lootText = scene.add
    .text(W - PAD - 48, H - 34, 'Loot', {
      fontSize: '12px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  scene.mapGroup.add([heroesBtn, heroesText, lootBtn, lootText]);
}
