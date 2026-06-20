import Phaser from 'phaser';
import { BOSS_SPRITE_MAP } from '../../../shared/game/data/raidBosses';
import { COLORS, FONT, H, W } from '../constants';

export const SNOO_LEFT_SHEET_KEY = 'snoo-heroes-left';
export const SNOO_CENTER_SHEET_KEY = 'snoo-heroes-center';
export const SNOO_FRAME_SIZE = 512;
export const HUD_KEY = 'ff-hud';
export const DAMAGE_EFFECT_KEY = 'damage-effect';
export const DAMAGE_EFFECT_FRAME_W = 384;
export const DAMAGE_EFFECT_FRAME_H = 256;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

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

    this.add
      .text(W / 2, H * 0.38, '👹', { fontSize: '64px', fontFamily: FONT.emoji })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.54, 'D9 Raid Keeper', {
        fontSize: '22px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.62, 'Loading sprites…', {
        fontSize: '13px',
        fontFamily: FONT.sans,
        color: '#71717a',
      })
      .setOrigin(0.5);

    // ── Snoo hero spritesheets (6 frames at 512×512, 3 cols × 2 rows) ────
    this.load.spritesheet(
      SNOO_LEFT_SHEET_KEY,
      '/assets/sprites/Snoo_heroes_left.png',
      {
        frameWidth: SNOO_FRAME_SIZE,
        frameHeight: SNOO_FRAME_SIZE,
      }
    );

    this.load.spritesheet(
      SNOO_CENTER_SHEET_KEY,
      '/assets/sprites/Snoo_heroes_center.png',
      {
        frameWidth: SNOO_FRAME_SIZE,
        frameHeight: SNOO_FRAME_SIZE,
      }
    );

    // ── Battle background ─────────────────────────────────────────────────
    this.load.image(
      'battle-bg',
      '/assets/backgrounds/Battle-background-hazy-hills-files/PNG/battle-background-sunny-hillsx4.png'
    );
    this.load.image(
      HUD_KEY,
      '/assets/backgrounds/Battle-background-hazy-hills-files/PNG/HUD.png'
    );

    // ── Boss sprites ──────────────────────────────────────────────────────
    Object.entries(BOSS_SPRITE_MAP).forEach(([key, path]) => {
      this.load.image(key, `/${path}`);
    });

    // ── Combat damage effects spritesheet (4 cols × 4 rows) ──────────────
    this.load.spritesheet(DAMAGE_EFFECT_KEY, '/assets/effects/Damage_effect.png', {
      frameWidth: DAMAGE_EFFECT_FRAME_W,
      frameHeight: DAMAGE_EFFECT_FRAME_H,
    });
  }

  create() {
    // Apply nearest-neighbour filter to pixel art textures only — keeps text smooth
    const nearest = Phaser.Textures.FilterMode.NEAREST;
    Object.keys(BOSS_SPRITE_MAP).forEach((key) => {
      this.textures.get(key).setFilter(nearest);
    });

    this.scene.start('Game');
  }
}
