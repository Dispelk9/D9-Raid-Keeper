import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../constants';

export const SNOO_FRAME_SIZE = 512;
export const HUD_KEY = 'ff-hud';
export const DAMAGE_EFFECT_KEY = 'damage-effect';
export const TITLE_SCREEN_KEY = 'title-screen';
// damage_effect.png is 1536x1024: 6 stored columns x 4 rows.
// Gameplay only uses columns 0-4; the old "999" column is intentionally unused.
export const DAMAGE_EFFECT_FRAME_W = 256;
export const DAMAGE_EFFECT_FRAME_H = 256;

export type HeroSpriteConfig = {
  key: string;
  frameCount: number;
  frameW: number;
  frameH: number;
};

// All hero sprites are generated procedurally at runtime (heroSpriteGen.ts).
// 5 frames × 256×256 per hero — matches COMMON_HERO_POSE_COL.
export const HERO_SPRITE_CONFIG: Record<string, HeroSpriteConfig> = {
  'snoo-vanguard':  { key: 'hero-snoo-vanguard',  frameCount: 5, frameW: 256, frameH: 256 },
  'karma-duelist':  { key: 'hero-karma-duelist',   frameCount: 5, frameW: 256, frameH: 256 },
  'flair-archmage': { key: 'hero-flair-archmage',  frameCount: 5, frameW: 256, frameH: 256 },
  'upvote-ranger':  { key: 'hero-upvote-ranger',   frameCount: 5, frameW: 256, frameH: 256 },
  'award-sage':     { key: 'hero-award-sage',      frameCount: 5, frameW: 256, frameH: 256 },
  'automod-oracle': { key: 'hero-automod-oracle',  frameCount: 5, frameW: 256, frameH: 256 },
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Minimal splash while title_screen.png loads (~2.3 MB)
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

    // Only the title screen image — heavy game assets load in PreloadScene
    this.load.image(TITLE_SCREEN_KEY, 'assets/screens/title_screen.png');
  }

  create() {
    this.scene.start('Preload');
  }
}
