import Phaser from 'phaser';
import { BOSS_SPRITE_MAP, SNOO_BOSS_RIGHT_KEY } from '../../../shared/game/data/raidBosses';
import { COLORS, FONT, H, W } from '../constants';
import { generateAllHeroSprites } from '../heroSpriteGen';
import {
  DAMAGE_EFFECT_FRAME_H,
  DAMAGE_EFFECT_FRAME_W,
  DAMAGE_EFFECT_KEY,
  HUD_KEY,
  SNOO_FRAME_SIZE,
  TITLE_SCREEN_KEY,
} from './BootScene';

// Loads all heavy game assets while displaying the title screen.
// BootScene only loads title_screen.png; this scene handles the rest (~18 MB).
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Show the already-loaded title screen immediately as background
    this.add.image(W / 2, H / 2, TITLE_SCREEN_KEY).setDisplaySize(W, H);

    // Loading bar near the bottom
    const barW = 240;
    const barH = 10;
    const barX = (W - barW) / 2;
    const barY = H * 0.9;

    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.track);
    barBg.fillRoundedRect(barX, barY, barW, barH, 5);

    const barFill = this.add.graphics();

    const label = this.add
      .text(W / 2, barY - 16, 'Loading…', {
        fontSize: '12px',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(COLORS.boss);
      barFill.fillRoundedRect(barX, barY, barW * value, barH, 5);
      const pct = Math.round(value * 100);
      label.setText(`Loading… ${pct}%`);
    });

    this.load.on('complete', () => {
      label.setText('Ready!');
    });

    // ── Battle background & HUD ────────────────────────────────────────────
    this.load.image(
      'battle-bg',
      'assets/backgrounds/Battle-background-hazy-hills-files/PNG/battle-background-sunny-hillsx4.png'
    );
    this.load.image(
      HUD_KEY,
      'assets/backgrounds/Battle-background-hazy-hills-files/PNG/HUD.png'
    );

    // ── Boss sprites ───────────────────────────────────────────────────────
    Object.entries(BOSS_SPRITE_MAP).forEach(([key, path]) => {
      this.load.image(key, path.startsWith('/') ? path.slice(1) : path);
    });

    this.load.spritesheet(
      SNOO_BOSS_RIGHT_KEY,
      'assets/sprites/bosses/Snoo_bosses_right.png',
      { frameWidth: SNOO_FRAME_SIZE, frameHeight: SNOO_FRAME_SIZE }
    );

    // ── Damage effects ────────────────────────────────────────────────────
    this.load.spritesheet(DAMAGE_EFFECT_KEY, 'assets/effects/damage_effect.png', {
      frameWidth: DAMAGE_EFFECT_FRAME_W,
      frameHeight: DAMAGE_EFFECT_FRAME_H,
    });
  }

  create() {
    // Generate all hero sprites procedurally (no image files needed)
    generateAllHeroSprites(this);

    const nearest = Phaser.Textures.FilterMode.NEAREST;
    Object.keys(BOSS_SPRITE_MAP).forEach((key) => {
      this.textures.get(key).setFilter(nearest);
    });
    this.textures.get(SNOO_BOSS_RIGHT_KEY).setFilter(nearest);

    this.applyColorKey(DAMAGE_EFFECT_KEY, 220, {
      frameWidth: DAMAGE_EFFECT_FRAME_W,
      frameHeight: DAMAGE_EFFECT_FRAME_H,
    });

    this.scene.start('Game');
  }

  private applyColorKey(
    key: string,
    threshold: number,
    spriteConfig: { frameWidth: number; frameHeight: number }
  ) {
    const texture = this.textures.get(key);
    const src = texture.source[0];
    if (!src) return;
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(src.image as HTMLImageElement, 0, 0);
    const id = ctx.getImageData(0, 0, src.width, src.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i] ?? 0) > threshold && (d[i + 1] ?? 0) > threshold && (d[i + 2] ?? 0) > threshold) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(id, 0, 0);
    this.textures.remove(key);
    this.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, spriteConfig);
  }
}
