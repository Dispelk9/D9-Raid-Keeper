import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { HUD_KEY } from '../scenes/BootScene';

export function buildResultOverlay(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];

  const overlayBg = scene.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.72);
  objs.push(overlayBg);

  const panelH = 300;
  const panelX = PAD * 3;
  const panelY = H / 2 - panelH / 2;
  const panelW = W - PAD * 6;
  const panelCX = W / 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(COLORS.white);
  panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
  panelBg.lineStyle(1, COLORS.border, 1);
  panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
  objs.push(panelBg);

  scene.resultStatusText = scene.add
    .text(panelCX, panelY + 20, '', {
      fontSize: '10px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#c2410c',
    })
    .setOrigin(0.5, 0);
  objs.push(scene.resultStatusText);

  scene.resultDamageText = scene.add
    .text(panelCX, panelY + 36, '', {
      fontSize: '32px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0.5, 0);
  objs.push(scene.resultDamageText);

  scene.resultRewardsText = scene.add
    .text(panelCX, panelY + 82, '', {
      fontSize: '12px',
      fontFamily: FONT.sans,
      color: '#52525b',
    })
    .setOrigin(0.5, 0);
  objs.push(scene.resultRewardsText);

  // Dynamic loot section (rebuilt each time in refreshResultOverlay)
  scene.resultLootGroup = scene.add.container(0, 0);
  objs.push(scene.resultLootGroup);

  // Next boss preview panel — shifted down 56px to make room for loot
  scene.resultNextBg = scene.add.graphics();
  scene.resultNextBg.fillStyle(0xf5f5f5);
  scene.resultNextBg.fillRoundedRect(
    PAD * 5,
    panelY + 162,
    panelW - PAD * 4,
    40,
    8
  );
  objs.push(scene.resultNextBg);

  scene.resultNextIcon = scene.add
    .text(PAD * 7, panelY + 182, '', {
      fontSize: '22px',
      fontFamily: FONT.emoji,
    })
    .setOrigin(0, 0.5);
  objs.push(scene.resultNextIcon);

  scene.resultNextName = scene.add
    .text(PAD * 12, panelY + 182, '', {
      fontSize: '12px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0, 0.5);
  objs.push(scene.resultNextName);

  // Back to map button
  const nextBtnY = panelY + panelH - 30;
  const nextBtnBg = scene.add.graphics();
  nextBtnBg.fillStyle(COLORS.ink);
  nextBtnBg.fillRoundedRect(PAD * 5, nextBtnY - 18, panelW - PAD * 4, 44, 8);
  objs.push(nextBtnBg);

  const nextBtnHit = scene.add
    .rectangle(panelCX, nextBtnY + 4, panelW - PAD * 4, 44, 0, 0)
    .setInteractive({ useHandCursor: true });
  nextBtnHit.on('pointerdown', () => scene.setView('map'));
  objs.push(nextBtnHit);

  objs.push(
    scene.add
      .text(panelCX, nextBtnY + 4, 'Back to map', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5)
  );

  scene.resultGroup = scene.add
    .container(0, 0, objs)
    .setDepth(18)
    .setVisible(false);
}

export function buildSkillChoiceOverlay(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
    .setInteractive();
  overlay.on('pointerdown', () => scene.hideSkillChoice());
  objs.push(overlay);

  const panelX = PAD * 2;
  const panelY = H - 264;
  const panelW = W - PAD * 4;
  const panelH = 220;
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x111827, 0.92);
  panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
  panelBg.lineStyle(1, 0xf8fafc, 0.35);
  panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
  objs.push(panelBg);

  scene.skillChoiceHeroText = scene.add
    .text(panelX + PAD * 2, panelY + 14, 'Choose Skill', {
      fontSize: '14px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0, 0);
  objs.push(scene.skillChoiceHeroText);

  const close = scene.add
    .text(panelX + panelW - PAD * 2, panelY + 14, 'Close', {
      fontSize: '11px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#cbd5e1',
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true });
  close.on('pointerdown', () => scene.hideSkillChoice());
  objs.push(close);

  scene.skillChoiceRefs = [0, 1].map((index) => {
    const cy = panelY + 70 + index * 72;
    const bg = scene.add
      .image(W / 2, cy, HUD_KEY)
      .setDisplaySize(panelW - PAD * 2, 58)
      .setOrigin(0.5);
    const hit = scene.add
      .rectangle(W / 2, cy, panelW - PAD * 2, 58, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      scene.chooseSkill(index);
    });
    const nameText = scene.add
      .text(panelX + PAD * 3, cy - 18, '', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
        wordWrap: { width: panelW - PAD * 10 },
      })
      .setOrigin(0, 0);
    const summaryText = scene.add
      .text(panelX + PAD * 3, cy, '', {
        fontSize: '10px',
        fontFamily: FONT.sans,
        color: '#bfdbfe',
        wordWrap: { width: panelW - PAD * 8 },
      })
      .setOrigin(0, 0);
    const metaText = scene.add
      .text(panelX + panelW - PAD * 3, cy - 18, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#fbbf24',
      })
      .setOrigin(1, 0);
    objs.push(bg, hit, nameText, summaryText, metaText);

    return {
      hit,
      nameText,
      summaryText,
      metaText,
    };
  });

  scene.skillChoiceGroup = scene.add
    .container(0, 0, objs)
    .setDepth(30)
    .setVisible(false);
}

export function buildNewGameConfirmOverlay(scene: GameScene): void {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.52)
    .setInteractive();
  overlay.on('pointerdown', () => scene.hideNewGameConfirm());
  objs.push(overlay);

  const panelW = W - PAD * 6;
  const panelH = 190;
  const panelX = W / 2 - panelW / 2;
  const panelY = H / 2 - panelH / 2;
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.white, 0.98);
  panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
  panel.lineStyle(1, COLORS.border, 1);
  panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
  objs.push(panel);

  objs.push(
    scene.add
      .text(W / 2, panelY + 22, 'Start New Game?', {
        fontSize: '18px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5, 0)
  );
  objs.push(
    scene.add
      .text(
        W / 2,
        panelY + 58,
        'Your current continue point will be replaced.',
        {
          fontSize: '12px',
          fontFamily: FONT.sans,
          color: '#52525b',
          wordWrap: { width: panelW - PAD * 4 },
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
  );

  const cancelBg = scene.add
    .rectangle(W / 2 - 78, panelY + panelH - 42, 136, 40, 0xe5e7eb)
    .setInteractive({ useHandCursor: true });
  cancelBg.on('pointerdown', () => scene.hideNewGameConfirm());
  const cancelText = scene.add
    .text(W / 2 - 78, panelY + panelH - 42, 'Cancel', {
      fontSize: '13px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0.5);
  const resetBg = scene.add
    .rectangle(W / 2 + 78, panelY + panelH - 42, 136, 40, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  resetBg.on('pointerdown', () => scene.confirmNewGame());
  const resetText = scene.add
    .text(W / 2 + 78, panelY + panelH - 42, 'New Game', {
      fontSize: '13px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  objs.push(cancelBg, cancelText, resetBg, resetText);

  scene.newGameConfirmGroup = scene.add
    .container(0, 0, objs)
    .setDepth(32)
    .setVisible(false);
}
