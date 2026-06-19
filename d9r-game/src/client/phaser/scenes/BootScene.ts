import Phaser from 'phaser';
import { BOSS_SPRITE_MAP } from '../../../shared/game/data/raidBosses';
import { COLORS, FONT, H, W } from '../constants';

export const HERO_SHEET_KEY = 'heroes';
export const HERO_FRAME_W   = 20;
export const HERO_FRAME_H   = 33;

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    // ── Progress bar ─────────────────────────────────────────────────────
    const barW = 240;
    const barH = 10;
    const barX = (W - barW) / 2;
    const barY = H * 0.72;

    const barBg = this.add.graphics();
    barBg.fillStyle(0xd4d4d8);
    barBg.fillRoundedRect(barX, barY, barW, barH, 5);

    const barFill = this.add.graphics();

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(COLORS.boss);
      barFill.fillRoundedRect(barX, barY, barW * value, barH, 5);
    });

    // ── Static decorations ────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.pageBg);

    this.add.text(W / 2, H * 0.38, '👹', { fontSize: '64px', fontFamily: FONT.emoji })
      .setOrigin(0.5);

    this.add.text(W / 2, H * 0.54, 'Reddit Raid Keeper', {
      fontSize: '22px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.62, 'Loading sprites…', {
      fontSize: '13px', fontFamily: FONT.sans, color: '#71717a',
    }).setOrigin(0.5);

    // ── Hero spritesheet ──────────────────────────────────────────────────
    // heroes.png: 200×99 usable (30 frames at 20×33), rows 100-131 = badge only
    this.load.spritesheet(HERO_SHEET_KEY, '/assets/sprites/heroes.png', {
      frameWidth:  HERO_FRAME_W,
      frameHeight: HERO_FRAME_H,
    });

    // ── Boss sprites ──────────────────────────────────────────────────────
    Object.entries(BOSS_SPRITE_MAP).forEach(([key, path]) => {
      this.load.image(key, `/${path}`);
    });
  }

  create() {
    this.scene.start('Game');
  }
}
