import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { TITLE_SCREEN_KEY } from '../scenes/BootScene';
import { HERO_SPRITE_CONFIG } from '../scenes/BootScene';
import {
  RAID_NODES,
  getBossAppearance,
} from '../../../shared/game/data/raidBosses';
import { GAME_Y, FALLBACK_HERO_ID } from '../scenes/GameSceneTypes';

// Kept for legacy import compatibility — no longer used for map layout
export const RUNNER = {
  OBS_SPACING: 108,
  LEAD_MARGIN: 110,
  OBS_W: 36,
  OBS_H: 52,
  BOSS_SZ: 58,
  HERO_SZ: 68,
  HERO_SCREEN_X_RATIO: 0.26,
} as const;

export const MAP_TILE_SZ = 52; // node platform tile face
export const MAP_HERO_SZ = 34; // hero sprite display size on map

export type MapNodePos = { level: number; cx: number; cy: number };

export function getMapNodePositions(): MapNodePos[] {
  const top = GAME_Y + 62 + PAD; // below community panel
  const avail = H - top - 10;
  return [
    { level: 1, cx: Math.round(W * 0.22), cy: top + Math.round(avail * 0.84) },
    { level: 2, cx: Math.round(W * 0.78), cy: top + Math.round(avail * 0.84) },
    { level: 3, cx: Math.round(W * 0.78), cy: top + Math.round(avail * 0.62) },
    { level: 4, cx: Math.round(W * 0.22), cy: top + Math.round(avail * 0.62) },
    { level: 5, cx: Math.round(W * 0.22), cy: top + Math.round(avail * 0.4) },
    { level: 6, cx: Math.round(W * 0.78), cy: top + Math.round(avail * 0.4) },
    { level: 7, cx: Math.round(W * 0.5), cy: top + Math.round(avail * 0.12) },
  ];
}

// Draw the dotted path between nodes.  Called once on build + again in refreshMap.
export function drawMapPath(
  gfx: Phaser.GameObjects.Graphics,
  positions: MapNodePos[],
  raidLevel: number
): void {
  gfx.clear();
  // Ordered connections that form the winding S-path
  const conns: [number, number][] = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
  ];
  conns.forEach(([from, to]) => {
    const p1 = positions.find((p) => p.level === from)!;
    const p2 = positions.find((p) => p.level === to)!;
    const done = from < raidLevel;
    const active = from <= raidLevel;
    const col = done ? 0x22c55e : active ? 0xfbbf24 : 0x1c2a3a;
    const al = active ? 0.88 : 0.22;
    gfx.fillStyle(col, al);

    if (from === 6) {
      // L-shape: right col → centre → F7
      dotLine(gfx, p1.cx, p1.cy, p2.cx, p1.cy);
      dotLine(gfx, p2.cx, p1.cy, p2.cx, p2.cy);
    } else {
      dotLine(gfx, p1.cx, p1.cy, p2.cx, p2.cy);
    }
  });
}

function dotLine(
  gfx: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const STEP = 10;
  const count = Math.floor(len / STEP);
  for (let i = 1; i < count; i++) {
    const t = i / count;
    gfx.fillRect(
      Math.round(x1 + dx * t) - 2,
      Math.round(y1 + dy * t) - 2,
      4,
      4
    );
  }
}

// ── Title view (unchanged) ────────────────────────────────────────────────────
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

// ── Map view — 8-bit Super Mario isometric style ─────────────────────────────
export function buildMapView(scene: GameScene): void {
  // ── Community Raid panel ─────────────────────────────────────────────────
  const panelY = GAME_Y;
  const panelH = 62;
  const barY = panelY + 36;
  const barW = W - PAD * 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x1e1b4b, 0.95);
  panelBg.fillRoundedRect(PAD, panelY, W - PAD * 2, panelH, 8);

  scene.raidPanelBossText = scene.add.text(
    PAD + 10,
    panelY + 6,
    '🔥 Loading community raid…',
    {
      fontSize: '10px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#f9a8d4',
    }
  );
  scene.raidPanelUserText = scene.add
    .text(W - PAD - 10, panelY + 6, '', {
      fontSize: '10px',
      fontFamily: FONT.sans,
      color: '#a78bfa',
    })
    .setOrigin(1, 0);
  scene.raidPanelBarBg = scene.add
    .rectangle(PAD + barW / 2, barY + 4, barW, 8, 0x374151)
    .setOrigin(0.5, 0.5);
  scene.raidPanelBarFill = scene.add
    .rectangle(PAD, barY + 4, barW, 8, 0xef4444)
    .setOrigin(0, 0.5);
  scene.raidPanelPctText = scene.add.text(PAD + 10, barY + 10, '', {
    fontSize: '8px',
    fontFamily: FONT.sans,
    color: '#9ca3af',
  });
  scene.raidPanelTopText = scene.add
    .text(W - PAD - 10, barY + 10, '', {
      fontSize: '8px',
      fontFamily: FONT.sans,
      color: '#fde68a',
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

  // ── 8-bit Mario map ──────────────────────────────────────────────────────
  const mapTop = panelY + panelH + PAD;
  const mapH = H - mapTop - 6;

  // Dark background
  const mapBg = scene.add.rectangle(
    W / 2,
    mapTop + mapH / 2,
    W,
    mapH,
    0x060a12
  );
  scene.mapGroup.add(mapBg);

  // Subtle pixel grid (very dark, gives tile-floor feel)
  const gridGfx = scene.add.graphics();
  const GRID = 22;
  gridGfx.lineStyle(1, 0x0c1424, 1);
  for (let gx = 0; gx <= W; gx += GRID)
    gridGfx.lineBetween(gx, mapTop, gx, mapTop + mapH);
  for (let gy = mapTop; gy <= mapTop + mapH; gy += GRID)
    gridGfx.lineBetween(0, gy, W, gy);
  scene.mapGroup.add(gridGfx);

  // Scattered pixel "stars" for atmosphere
  const starGfx = scene.add.graphics();
  starGfx.fillStyle(0x1e3a5f, 0.6);
  const STARS = [
    [56, 48],
    [142, 80],
    [290, 32],
    [370, 68],
    [200, 120],
    [44, 200],
    [380, 180],
    [110, 280],
    [330, 250],
    [215, 320],
    [60, 400],
    [360, 360],
    [180, 460],
    [300, 440],
    [90, 520],
  ];
  STARS.forEach(([sx = 0, sy = 0]) => {
    const ry = mapTop + (sy % mapH);
    starGfx.fillRect(sx - 1, ry - 1, 3, 3);
  });
  scene.mapGroup.add(starGfx);

  // Path graphics (redrawn in refreshMap based on unlock state)
  const pathGfx = scene.add.graphics();
  (scene as any)._mapPathGfx = pathGfx;
  scene.mapGroup.add(pathGfx);
  drawMapPath(pathGfx, getMapNodePositions(), 1); // placeholder until first refresh

  // ── Node tiles ────────────────────────────────────────────────────────────
  const T = MAP_TILE_SZ;
  const hs = T / 2;
  const DEPTH = 5; // 3D side panel thickness
  const BOSS_W = 46;
  const BOSS_H = 68; // 2:3 portrait ratio

  const positions = getMapNodePositions();

  RAID_NODES.forEach((node) => {
    const pos = positions.find((p) => p.level === node.level);
    if (!pos) return;
    const { cx, cy } = pos;
    const isHidden = node.isHiddenFloor ?? false;

    // Static 3D depth strips (permanent dark shadow)
    const depthGfx = scene.add.graphics();
    depthGfx.fillStyle(0x000000, 0.55);
    depthGfx.fillRect(cx + hs, cy - hs + DEPTH, DEPTH, T - DEPTH); // right face
    depthGfx.fillRect(cx - hs + DEPTH, cy + hs, T - DEPTH, DEPTH); // bottom face
    scene.mapGroup.add(depthGfx);

    // Main tile face (colour updated by refreshMap)
    const bg = scene.add.rectangle(cx, cy, T, T, 0x1c2a3a).setOrigin(0.5);
    scene.mapGroup.add(bg);

    // Pixel-art inner border (always slightly lighter than bg)
    const innerGfx = scene.add.graphics();
    innerGfx.lineStyle(1, 0x2a3f54, 1);
    innerGfx.strokeRect(cx - hs + 3, cy - hs + 3, T - 6, T - 6);
    scene.mapGroup.add(innerGfx);

    // Floor badge (bottom-right corner of tile, updated by refreshMap)
    const ring = scene.add.graphics();
    scene.mapGroup.add(ring);

    // Boss sprite — sits on top of tile (portrait, bottom-aligned to tile top)
    const bossApp = getBossAppearance(node.level);
    const bossImg = scene.add
      .image(cx, cy - hs, bossApp.spriteKey)
      .setDisplaySize(BOSS_W, BOSS_H)
      .setOrigin(0.5, 1)
      .setAlpha(0.3);
    (scene as any)[`_bossMini_${node.level}`] = bossImg;
    scene.mapGroup.add(bossImg);

    // Status icon (lock/check/play — inside tile centre)
    const label = scene.add
      .text(cx, cy + 3, isHidden ? '?' : '🔒', {
        fontSize: '14px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(0.5);
    scene.mapGroup.add(label);

    // Node name — above boss sprite
    const subLabel = scene.add
      .text(cx, cy - hs - BOSS_H - 2, isHidden ? '???' : node.name, {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#475569',
        wordWrap: { width: 88 },
        align: 'center',
      })
      .setOrigin(0.5, 1);
    scene.mapGroup.add(subLabel);

    // Floor number badge below tile
    const floorTag = scene.add
      .text(cx, cy + hs + DEPTH + 4, isHidden ? 'F?' : `F${node.level}`, {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#334155',
      })
      .setOrigin(0.5, 0);
    scene.mapGroup.add(floorTag);

    // Hit area covers tile + boss sprite + name
    const hitH = T + BOSS_H + 18;
    const hitCY = cy - BOSS_H / 2;
    const hit = scene.add
      .rectangle(cx, hitCY, T + 14, hitH, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (scene.view !== 'map' || !scene.profile) return;
      const accessible = isHidden
        ? scene.profile.raidLevel > 6
        : node.level <= scene.profile.raidLevel;
      if (accessible) scene.openPartySelect(node.level);
    });
    scene.mapGroup.add(hit);

    scene.mapNodeRefs.push({
      level: node.level,
      name: node.name,
      bg,
      ring,
      label,
      subLabel,
      hit,
      floorX: cx - hs,
      floorY: cy - hs,
      floorW: T,
      floorH: T,
    });
  });

  // ── Hero sprite (positioned at current raidLevel node in refreshMap) ──────
  const firstHeroId = scene.profile?.party[0] ?? FALLBACK_HERO_ID;
  const heroConfig =
    HERO_SPRITE_CONFIG[firstHeroId] ?? HERO_SPRITE_CONFIG[FALLBACK_HERO_ID]!;
  const startPos = positions[0]!;
  const heroImg = scene.add
    .image(startPos.cx, startPos.cy - hs - 4, heroConfig.key)
    .setDisplaySize(MAP_HERO_SZ, MAP_HERO_SZ)
    .setOrigin(0.5, 1);
  scene.setHeroPose(heroImg, firstHeroId, 'idle');
  scene.mapRunnerHeroImg = heroImg;
  scene.mapGroup.add(heroImg);
}
