import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD } from '../constants';
import { HEROES } from '../../../shared/game/data/heroes';
import { GAME_Y, ENERGY_COST } from '../scenes/GameSceneTypes';

export function buildPartyView(scene: GameScene): void {
  scene.partyTitleText = scene.add
    .text(W / 2, GAME_Y + 2, 'Choose 5 Heroes', {
      fontSize: '18px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    })
    .setOrigin(0.5, 0);

  const cardW = Math.floor((W - PAD * 3) / 2);
  const cardH = 82;
  const startY = GAME_Y + 48;

  HEROES.forEach((hero, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (cardW + PAD);
    const y = startY + row * (cardH + PAD);

    const bg = scene.add
      .rectangle(x + cardW / 2, y + cardH / 2, cardW, cardH, COLORS.white)
      .setInteractive({ useHandCursor: true });
    const sprite = scene.add
      .image(x + 39, y + 40, scene.getHeroSpriteKey(hero.id))
      .setDisplaySize(62, 62)
      .setOrigin(0.5);
    scene.setHeroPose(sprite, hero.id, 'idle');
    const label = scene.add
      .text(x + 76, y + 13, hero.name, {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: cardW - 86 },
      })
      .setOrigin(0, 0);
    const subLabel = scene.add
      .text(x + 76, y + 48, hero.role, {
        fontSize: '10px',
        fontFamily: FONT.sans,
        color: '#71717a',
      })
      .setOrigin(0, 0);
    const check = scene.add
      .text(x + cardW - 16, y + 12, '', {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#16a34a',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', () => scene.toggleSelectedPartyHero(hero.id));
    scene.partyGroup.add([bg, sprite, label, subLabel, check]);
    scene.partyHeroRefs.push({ heroId: hero.id, bg, label, subLabel, check });
  });

  scene.partyStartBg = scene.add
    .rectangle(W / 2, H - 56, W - PAD * 2, 46, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  scene.partyStartBg.on('pointerdown', () => scene.handleStartRaid());
  scene.partyStartText = scene.add
    .text(W / 2, H - 56, 'Start Raid', {
      fontSize: '15px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  scene.partyEnergyTimerText = scene.add
    .text(W / 2, H - 24, '', {
      fontSize: '11px',
      fontFamily: FONT.sans,
      color: '#f97316',
    })
    .setOrigin(0.5)
    .setVisible(false);
  scene.partyGroup.add([
    scene.partyTitleText,
    scene.partyStartBg,
    scene.partyStartText,
    scene.partyEnergyTimerText,
  ]);
}

export function buildHelpView(scene: GameScene): void {
  const overlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x111827, 0.9);
  const title = scene.add
    .text(W / 2, 92, 'D9 Raid Keeper', {
      fontSize: '26px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  const body = scene.add
    .text(
      PAD * 3,
      142,
      [
        'A team of five developer-knights climbs the corporate hierarchy to stop the next layoff wave.',
        '',
        'Clear raid nodes from bottom to top. Each node contains a short chain of battles. If the team falls, gems still pay out based on how many battles were cleared.',
        '',
        `All heroes are unlocked. Use gems to advance rarity; maxed heroes convert extra gem training into tokens.`,
      ].join('\n'),
      {
        fontSize: '14px',
        fontFamily: FONT.sans,
        color: '#e5e7eb',
        wordWrap: { width: W - PAD * 6 },
        lineSpacing: 8,
      }
    )
    .setOrigin(0, 0);
  const backBg = scene.add
    .rectangle(W / 2, H - 88, 220, 44, COLORS.white)
    .setInteractive({ useHandCursor: true });
  const backText = scene.add
    .text(W / 2, H - 88, 'Back', {
      fontSize: '15px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#111827',
    })
    .setOrigin(0.5);
  backBg.on('pointerdown', () => scene.setView('title'));
  scene.helpGroup.add([overlay, title, body, backBg, backText]);
}
