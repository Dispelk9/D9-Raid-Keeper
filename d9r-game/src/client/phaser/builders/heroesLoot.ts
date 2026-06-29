import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD, RARITY_COLOR } from '../constants';
import { HEROES } from '../../../shared/game/data/heroes';
import type { HeroTemplate } from '../../../shared/game/types';
import { GAME_Y, FALLBACK_HERO_ID } from '../scenes/GameSceneTypes';

export function buildHeroesView(scene: GameScene): void {
  const topY = GAME_Y + PAD;

  // Hero cards grid (2 col × 3 row)
  const cardW = Math.floor((W - PAD * 3) / 2);
  const cardH = 104;
  const gridStartY = topY;

  HEROES.forEach((hero, i) => {
    const col = i % 2,
      row = Math.floor(i / 2);
    const cx = PAD + col * (cardW + PAD);
    const cy = gridStartY + row * (cardH + PAD);
    buildHeroCard(scene, hero, cx, cy, cardW, cardH);
  });
}

export function buildHeroCard(
  scene: GameScene,
  hero: HeroTemplate,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const spriteSize = 64;
  const cx = x + PAD + spriteSize / 2;
  const cy = y + 37;
  const textX = x + PAD * 2 + spriteSize;

  const cardBg = scene.add.graphics();
  cardBg.fillStyle(COLORS.white);
  cardBg.fillRoundedRect(x, y, w, h, 8);
  cardBg.lineStyle(1, COLORS.border, 1);
  cardBg.strokeRoundedRect(x, y, w, h, 8);

  const hitArea = scene.add
    .rectangle(x + w / 2, y + h / 2, w, h, 0, 0)
    .setInteractive({ useHandCursor: true });
  hitArea.on('pointerdown', () => scene.showDetail(hero.id));

  const iconT = scene.add
    .image(cx, cy, scene.getHeroSpriteKey(hero.id))
    .setDisplaySize(spriteSize, spriteSize)
    .setOrigin(0.5);
  scene.setHeroPose(iconT, hero.id, 'idle');

  const nameText = scene.add
    .text(textX, y + 10, hero.name, {
      fontSize: '12px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
      wordWrap: { width: w - spriteSize - PAD * 3 },
    })
    .setOrigin(0, 0);

  const levelText = scene.add
    .text(textX, y + 29, 'Lv 1', {
      fontSize: '10px',
      fontFamily: FONT.sans,
      color: '#71717a',
    })
    .setOrigin(0, 0);

  const rarityText = scene.add
    .text(textX, y + 45, hero.rarity, {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color:
        '#' +
        (RARITY_COLOR[hero.rarity] ?? COLORS.rarityCommon)
          .toString(16)
          .padStart(6, '0'),
    })
    .setOrigin(0, 0);

  // 3 buttons: Party | Upgrade (gold) | Gem
  const totalBtnW = w - PAD * 2;
  const btnW3 = Math.floor(totalBtnW / 3) - 2;
  const btnY = y + h - PAD - 12;
  const btn1X = x + PAD + btnW3 / 2;
  const btn2X = btn1X + btnW3 + 4;
  const btn3X = btn2X + btnW3 + 4;

  const partyBg = scene.add
    .rectangle(btn1X, btnY, btnW3, 22, COLORS.btnSkill)
    .setInteractive({ useHandCursor: true });
  const partyText = scene.add
    .text(btn1X, btnY, 'Party', {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  partyBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    ptr.event.stopPropagation();
    scene.handleToggleParty(hero.id);
  });

  const btnBg = scene.add
    .rectangle(btn2X, btnY, btnW3, 22, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  const btnTxt = scene.add
    .text(btn2X, btnY, '⬆ Gold', {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  btnBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    ptr.event.stopPropagation();
    scene.handleUpgrade(hero.id);
  });

  const gemBg = scene.add
    .rectangle(btn3X, btnY, btnW3, 22, 0x7c3aed)
    .setInteractive({ useHandCursor: true });
  const gemText = scene.add
    .text(btn3X, btnY, '💎 Gem', {
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  gemBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    ptr.event.stopPropagation();
    scene.handleGemUpgrade(hero.id);
  });

  scene.heroesGroup.add([
    cardBg,
    hitArea,
    iconT,
    nameText,
    levelText,
    rarityText,
    partyBg,
    partyText,
    btnBg,
    btnTxt,
    gemBg,
    gemText,
  ]);
  scene.heroCardRefs.push({
    heroId: hero.id,
    levelText,
    rarityText,
    btnBg,
    partyBg,
    partyText,
    gemBg,
    gemText,
  });
}

export function buildDetailSheet(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];

  const sheetH = 348;
  const sheetY = H - sheetH;

  // Dim overlay
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.55)
    .setInteractive();
  overlay.on('pointerdown', () => scene.hideDetail());
  objs.push(overlay);

  // Sheet BG
  const sheetBg = scene.add.graphics();
  sheetBg.fillStyle(COLORS.white);
  sheetBg.fillRoundedRect(0, sheetY, W, sheetH + 20, 16);
  objs.push(sheetBg);

  // Close button
  const closeBtn = scene.add.graphics();
  closeBtn.fillStyle(0xf5f5f5);
  closeBtn.fillCircle(W - PAD * 2 - 14, sheetY + 20, 14);
  objs.push(closeBtn);
  const closeHit = scene.add
    .rectangle(W - PAD * 2 - 14, sheetY + 20, 32, 32, 0, 0)
    .setInteractive({ useHandCursor: true });
  closeHit.on('pointerdown', () => scene.hideDetail());
  objs.push(closeHit);
  objs.push(
    scene.add
      .text(W - PAD * 2 - 14, sheetY + 20, '✕', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(0.5)
  );

  scene.detailHeroIcon = scene.add
    .image(PAD * 2 + 28, sheetY + 28, scene.getHeroSpriteKey(FALLBACK_HERO_ID))
    .setDisplaySize(64, 64)
    .setOrigin(0.5);
  scene.setHeroPose(scene.detailHeroIcon, FALLBACK_HERO_ID, 'idle');
  objs.push(scene.detailHeroIcon);

  // Hero name / role / rarity
  scene.detailHeroName = scene.add
    .text(PAD * 4 + 56, sheetY + 12, '', {
      fontSize: '15px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0, 0);
  objs.push(scene.detailHeroName);

  scene.detailRoleLv = scene.add
    .text(PAD * 4 + 56, sheetY + 30, '', {
      fontSize: '11px',
      fontFamily: FONT.sans,
      color: '#71717a',
    })
    .setOrigin(0, 0);
  objs.push(scene.detailRoleLv);

  scene.detailRarityText = scene.add
    .text(PAD * 4 + 56, sheetY + 46, '', {
      fontSize: '10px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#7c3aed',
    })
    .setOrigin(0, 0);
  objs.push(scene.detailRarityText);

  // Stats grid (3 col × 2 row)
  const statLabels = ['HP', 'ATK', 'DEF', 'MAG', 'RES', 'SPD'];
  const statTileW = (W - PAD * 4) / 3;
  const statTileH = 36;
  const statsY = sheetY + 72;
  const statValueTexts: Phaser.GameObjects.Text[] = [];

  statLabels.forEach((lbl, i) => {
    const col = i % 3,
      row = Math.floor(i / 3);
    const tx = PAD + col * (statTileW + PAD);
    const ty = statsY + row * (statTileH + 4);

    const tileBg = scene.add.graphics();
    tileBg.fillStyle(0xf5f5f4);
    tileBg.fillRoundedRect(tx, ty, statTileW, statTileH, 6);
    objs.push(tileBg);

    objs.push(
      scene.add
        .text(tx + PAD, ty + 5, lbl, {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#374151',
        })
        .setOrigin(0, 0)
    );

    const val = scene.add
      .text(tx + PAD, ty + 17, '—', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#111827',
      })
      .setOrigin(0, 0);
    statValueTexts.push(val);
    objs.push(val);
  });
  scene.detailStatValues = statValueTexts;

  // Skill / Ultimate panels
  const skillY = statsY + statTileH * 2 + 12;
  const halfW = (W - PAD * 3) / 2;

  const skillBg = scene.add.graphics();
  skillBg.fillStyle(0xfff7ed);
  skillBg.fillRoundedRect(PAD, skillY, halfW, 52, 8);
  objs.push(skillBg);
  objs.push(
    scene.add
      .text(PAD + 6, skillY + 7, 'SKILL', {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#c2410c',
      })
      .setOrigin(0, 0)
  );
  scene.detailSkillText = scene.add
    .text(PAD + 6, skillY + 20, '', {
      fontSize: '11px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
      wordWrap: { width: halfW - 12 },
    })
    .setOrigin(0, 0);
  objs.push(scene.detailSkillText);

  const ultBg = scene.add.graphics();
  ultBg.fillStyle(0xeef2ff);
  ultBg.fillRoundedRect(PAD * 2 + halfW, skillY, halfW, 52, 8);
  objs.push(ultBg);
  objs.push(
    scene.add
      .text(PAD * 2 + halfW + 6, skillY + 7, 'ULTIMATE', {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#4338ca',
      })
      .setOrigin(0, 0)
  );
  scene.detailUltText = scene.add
    .text(PAD * 2 + halfW + 6, skillY + 20, '', {
      fontSize: '11px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
      wordWrap: { width: halfW - 12 },
    })
    .setOrigin(0, 0);
  objs.push(scene.detailUltText);

  // Upgrade button
  const upgBtnY = skillY + 62;
  scene.detailUpgradeBg = scene.add
    .rectangle(W / 2, upgBtnY + 20, W - PAD * 2, 40, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  scene.detailUpgradeBg.on('pointerdown', () => {
    if (scene.selectedHeroId) scene.handleUpgrade(scene.selectedHeroId);
    scene.hideDetail();
  });
  objs.push(scene.detailUpgradeBg);

  scene.detailUpgradeText = scene.add
    .text(W / 2, upgBtnY + 20, 'Upgrade', {
      fontSize: '14px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  objs.push(scene.detailUpgradeText);

  scene.detailGroup = scene.add
    .container(0, 0, objs)
    .setDepth(28)
    .setVisible(false);
}

export const EQUIPMENT_ICONS: Record<string, string> = {
  'usb-debug-stick':        '💾',
  'mechanical-keyboard':    '⌨️',
  'company-macbook':        '💻',
  'standing-desk':          '🪑',
  'noise-canceling-hoodie': '🧥',
  'lucky-deploy-pen':       '✒️',
  'root-access-yubikey':    '🔑',
};

export function getEquipmentIcon(itemId: string): string {
  const baseId = itemId.replace(/-\d+$/, '');
  return EQUIPMENT_ICONS[baseId] ?? '📦';
}

export function buildLootView(scene: GameScene): void {
  const topY = GAME_Y + PAD;
  const tileW = (W - PAD * 3) / 2;
  const tileH = 52;

  const statLabels = ['Best Dmg', 'Total Dmg', 'Loot Dmg', 'Items'];
  const statTexts: Phaser.GameObjects.Text[] = [];

  statLabels.forEach((lbl, i) => {
    const col = i % 2,
      row = Math.floor(i / 2);
    const tx = PAD + col * (tileW + PAD);
    const ty = topY + row * (tileH + PAD);

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.white, 0.9);
    bg.fillRoundedRect(tx, ty, tileW, tileH, 7);
    const lblTxt = scene.add
      .text(tx + PAD, ty + 10, lbl.toUpperCase(), {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#71717a',
      })
      .setOrigin(0, 0);
    const val = scene.add
      .text(tx + PAD, ty + 26, '—', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0, 0);
    statTexts.push(val);
    scene.lootGroup.add([bg, lblTxt, val]);
  });
  scene.lootStatTexts = statTexts;

  const itemsStartY = topY + (tileH + PAD) * 2 + PAD;
  scene.lootItemsGroupBaseY = itemsStartY;
  scene.lootItemsGroup = scene.add.container(0, itemsStartY);
  scene.lootGroup.add(scene.lootItemsGroup);

  // Detail overlay — populated dynamically on tile tap, sits above all items
  scene.lootDetailGroup = scene.add.container(0, 0).setDepth(10).setVisible(false);
  scene.lootGroup.add(scene.lootDetailGroup);
}
