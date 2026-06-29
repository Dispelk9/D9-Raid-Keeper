import Phaser from 'phaser';
import { BOSS_SPRITE_MAP } from '../../../shared/game/data/raidBosses';
import { COLORS, FONT, H, W } from '../constants';
import {
  EFFECT_ASSETS,
  SEQ_ASSETS,
  HERO_SPRITE_CONFIG,
  HUD_KEY,
  TITLE_SCREEN_KEY,
} from './BootScene';

// Loads all heavy game assets while displaying the title screen.
// BootScene only loads the small title preview; this scene handles the rest.
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

    // ── Battle backgrounds (offices spritesheet: 3 col × 2 row, 512×512 each)
    this.load.spritesheet('offices', 'assets/backgrounds/offices/offices.png', {
      frameWidth: 512,
      frameHeight: 512,
    });

    // ── Battle background & HUD (fallback hill scene) ─────────────────────
    this.load.image(
      'battle-bg',
      'assets/backgrounds/Battle-background-hazy-hills-files/PNG/battle-background-sunny-hillsx4.png'
    );
    this.load.image(
      HUD_KEY,
      'assets/backgrounds/Battle-background-hazy-hills-files/PNG/HUD.png'
    );

    // ── Hero sprites (individual 512×512 PNGs, one per hero) ────────────
    const HERO_FILES: Record<string, string> = {
      'hero-frontend-developer':
        'assets/sprites/heroes/boy_frontend_developer.png',
      'hero-backend-developer':
        'assets/sprites/heroes/girl_backend_developer.png',
      'hero-devops-engineer': 'assets/sprites/heroes/girl_devops_engineer.png',
      'hero-qa-tester': 'assets/sprites/heroes/boy_qa_tester.png',
      'hero-security-engineer':
        'assets/sprites/heroes/girl_security_engineer.png',
      'hero-data-engineer': 'assets/sprites/heroes/man_data_engineer.png',
    };
    Object.entries(HERO_FILES).forEach(([key, path]) =>
      this.load.image(key, path)
    );

    // ── Boss & mini-boss sprites (individual PNGs) ────────────────────────
    Object.entries(BOSS_SPRITE_MAP).forEach(([key, path]) => {
      this.load.image(key, path);
    });

    // ── Battle effects ────────────────────────────────────────────────────
    EFFECT_ASSETS.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
    SEQ_ASSETS.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
  }

  create() {
    const nearest = Phaser.Textures.FilterMode.NEAREST;
    Object.values(HERO_SPRITE_CONFIG).forEach(({ key }) => {
      this.textures.get(key).setFilter(nearest);
    });
    Object.keys(BOSS_SPRITE_MAP).forEach((key) => {
      this.textures.get(key).setFilter(nearest);
    });

    this.scene.start('Game');
  }
}
