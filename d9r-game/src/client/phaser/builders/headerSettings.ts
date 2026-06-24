import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, HEADER_H, W, PAD } from '../constants';
import { DAILY_REWARD, canClaimDailyReward } from '../../../shared/game/logic/progression';
import type { View } from '../scenes/GameSceneTypes';
import { fmt } from '../scenes/GameSceneTypes';

export function buildHeader(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];

  objs.push(
    scene.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, COLORS.headerBg)
  );
  objs.push(scene.add.rectangle(W / 2, HEADER_H - 1, W, 1, COLORS.border));

  // gear icon — left
  const gear = scene.add
    .text(PAD + 16, HEADER_H / 2, '⚙️', {
      fontSize: '26px',
      fontFamily: FONT.emoji,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => scene.toggleSettingsPanel());
  objs.push(gear);

  // RAID level badge — far right
  const badgeBg = scene.add.graphics();
  badgeBg.fillStyle(COLORS.ink);
  badgeBg.fillRoundedRect(W - 52, (HEADER_H - 34) / 2, 44, 34, 6);
  objs.push(badgeBg);

  objs.push(
    scene.add
    .text(W - 30, HEADER_H / 2 - 8, 'RAID', {
      fontSize: '8px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5)
  );

  scene.raidLvText = scene.add
    .text(W - 30, HEADER_H / 2 + 8, '1', {
      fontSize: '15px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  objs.push(scene.raidLvText);

  scene.headerGroup = scene.add.container(0, 0, objs).setDepth(8);
}

export function buildSettingsPanel(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];

  // Full-screen dim overlay
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
    .setInteractive();
  overlay.on('pointerdown', () => scene.toggleSettingsPanel());
  objs.push(overlay);

  const panelX = PAD * 2;
  const panelY = HEADER_H + PAD;
  const panelW = W - PAD * 4;
  const panelH = 370;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(COLORS.white);
  panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
  panelBg.lineStyle(1, COLORS.border, 1);
  panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
  objs.push(panelBg);

  // Title
  objs.push(
    scene.add
      .text(panelX + PAD * 2, panelY + 14, 'D9 Raid Keeper', {
        fontSize: '18px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0, 0)
  );

  // Currency tiles row
  const currLabels = ['Gold', 'Gems', 'Energy', 'Tokens'];
  const tileW = (panelW - PAD * 5) / 4;
  const tilesY = panelY + 50;
  const currTexts: Phaser.GameObjects.Text[] = [];

  currLabels.forEach((lbl, i) => {
    const tx = panelX + PAD + i * (tileW + PAD);

    const bg = scene.add.graphics();
    bg.fillStyle(0xf5f5f5);
    bg.fillRoundedRect(tx, tilesY, tileW, 54, 6);
    objs.push(bg);

    objs.push(
      scene.add
        .text(tx + tileW / 2, tilesY + 11, lbl.toUpperCase(), {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#71717a',
        })
        .setOrigin(0.5, 0)
    );

    const val = scene.add
      .text(tx + tileW / 2, tilesY + 27, '0', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5, 0);
    objs.push(val);
    currTexts.push(val);

    // Energy tile: add refill countdown inside the tile
    if (lbl === 'Energy') {
      scene.settingsEnergyTimerText = scene.add
        .text(tx + tileW / 2, tilesY + 43, '', {
          fontSize: '8px',
          fontFamily: FONT.sans,
          color: '#f97316',
        })
        .setOrigin(0.5, 0);
      objs.push(scene.settingsEnergyTimerText);
    }
  });
  scene.settingsCurrTexts = currTexts;

  // Section divider label
  objs.push(
    scene.add
      .text(panelX + PAD * 2, tilesY + 62, 'NAVIGATE', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#a1a1aa',
      })
      .setOrigin(0, 0)
  );

  // Nav buttons
  const navY = tilesY + 78;
  const navH = 48;
  const navBtnW = (panelW - PAD * 4) / 3;
  const views: View[] = ['map', 'heroes', 'loot'];
  const navIcons = ['🗺️', '🧙', '🎁'];
  const navBtns: Phaser.GameObjects.Rectangle[] = [];

  views.forEach((v, i) => {
    const bx = panelX + PAD + i * (navBtnW + PAD);

    const btn = scene.add
      .rectangle(bx + navBtnW / 2, navY + navH / 2, navBtnW, navH, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      scene.settingsPanelOpen = false;
      scene.settingsGroup.setVisible(false);
      scene.setView(v);
    });
    objs.push(btn);
    navBtns.push(btn);

    objs.push(
      scene.add
        .text(bx + navBtnW / 2, navY + navH / 2 - 8, navIcons[i] ?? '', {
          fontSize: '18px',
          fontFamily: FONT.emoji,
        })
        .setOrigin(0.5)
    );
    objs.push(
      scene.add
        .text(
          bx + navBtnW / 2,
          navY + navH / 2 + 11,
          v.charAt(0).toUpperCase() + v.slice(1),
          {
            fontSize: '11px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#ffffff',
          }
        )
        .setOrigin(0.5)
    );
  });
  scene.settingsNavBtns = navBtns;

  // Action buttons row
  const actLblY = navY + navH + PAD * 2;
  objs.push(
    scene.add
      .text(panelX + PAD * 2, actLblY, 'ACTIONS', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#a1a1aa',
      })
      .setOrigin(0, 0)
  );

  const actionBtnY = actLblY + 18;
  const actionBtnH = 42;
  const actionBtnW = panelW - PAD * 2; // full width

  scene.dailyActBg = scene.add.graphics();
  scene.dailyActBg.fillStyle(COLORS.btnGreen);
  scene.dailyActBg.fillRoundedRect(
    panelX + PAD,
    actionBtnY,
    actionBtnW,
    actionBtnH,
    6
  );
  objs.push(scene.dailyActBg);
  scene.dailyActHit = scene.add
    .rectangle(
      panelX + PAD + actionBtnW / 2,
      actionBtnY + actionBtnH / 2,
      actionBtnW,
      actionBtnH,
      0,
      0
    )
    .setInteractive({ useHandCursor: true });
  scene.dailyActHit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    ptr.event.stopPropagation();
    scene.handleDailyClaim();
  });
  objs.push(scene.dailyActHit);
  scene.dailyActText = scene.add
    .text(panelX + PAD + actionBtnW / 2, actionBtnY + 13, 'Daily Reward', {
      fontSize: '12px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  scene.dailyActSubText = scene.add
    .text(
      panelX + PAD + actionBtnW / 2,
      actionBtnY + 29,
      `+${DAILY_REWARD.gold}🪙 +${DAILY_REWARD.gems}💎 +${DAILY_REWARD.energy}⚡`,
      {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.emoji,
        color: '#dcfce7',
      }
    )
    .setOrigin(0.5);
  objs.push(scene.dailyActText, scene.dailyActSubText);

  objs.push(
    scene.add
      .text(
        panelX + panelW / 2,
        actionBtnY + actionBtnH + PAD * 2,
        'tap outside to close',
        {
          fontSize: '11px',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        }
      )
      .setOrigin(0.5, 0)
  );

  scene.settingsGroup = scene.add
    .container(0, 0, objs)
    .setDepth(28)
    .setVisible(false);
}

export function toggleSettingsPanel(scene: GameScene): void {
  scene.settingsPanelOpen = !scene.settingsPanelOpen;
  scene.settingsGroup.setVisible(scene.settingsPanelOpen);

  if (scene.settingsPanelOpen && scene.profile) {
    const vals = [
      scene.profile.gold,
      scene.profile.gems,
      scene.profile.energy,
      scene.profile.raidTokens,
    ];
    vals.forEach((v, i) => scene.settingsCurrTexts[i]?.setText(fmt(v)));
    scene.settingsEnergyTimerText?.setText(scene.getEnergyTimerText());
    scene.refreshDailyAction();

    const views: View[] = ['raid', 'heroes', 'loot'];
    views.forEach((v, i) => {
      scene.settingsNavBtns[i]?.setFillStyle(
        v === scene.view ? COLORS.btnSkill : COLORS.ink
      );
    });
  }
}

export function refreshDailyAction(scene: GameScene): void {
  if (!scene.profile) return;

  const available = canClaimDailyReward(scene.profile);
  scene.dailyActBg.setAlpha(available ? 1 : 0.42);
  scene.dailyActText.setText(available ? 'Daily Reward' : 'Claimed Today');
  scene.dailyActSubText.setText(
    available
      ? `+${DAILY_REWARD.gold}🪙 +${DAILY_REWARD.gems}💎 +${DAILY_REWARD.energy}⚡`
      : 'Resets tomorrow'
  );
  if (available) {
    scene.dailyActHit.setInteractive({ useHandCursor: true });
  } else {
    scene.dailyActHit.disableInteractive();
  }
}
