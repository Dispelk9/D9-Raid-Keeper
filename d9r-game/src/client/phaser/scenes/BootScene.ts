import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../constants';

export const SNOO_FRAME_SIZE = 512;
export const HUD_KEY = 'ff-hud';
export const TITLE_SCREEN_KEY = 'title-screen';
export const TITLE_SCREEN_PATH = 'assets/screens/title_screen_fast.webp';

export const EFFECT_KEYS = {
  slash: 'effect-slash',
  strikeSkill: 'effect-strike-skill',
  fire: 'effect-fire',
  light: 'effect-light',
  water: 'effect-water',
  cosmic: 'effect-cosmic',
  limit: 'effect-limit',
  bossStrike: 'effect-boss-strike',
  bossConfuse: 'effect-boss-confuse',
  bossBlind: 'effect-boss-blind',
  bossBerserk: 'effect-boss-berserk',
  bossSilence: 'effect-boss-silence',
  bossDaze: 'effect-boss-daze',
} as const;

export type EffectKey = (typeof EFFECT_KEYS)[keyof typeof EFFECT_KEYS];

export const EFFECT_ASSETS: Array<{ key: EffectKey; path: string }> = [
  {
    key: EFFECT_KEYS.slash,
    path: 'assets/effects/Attack_Effect/Classic/1/Classic_04.png',
  },
  {
    key: EFFECT_KEYS.strikeSkill,
    path: 'assets/effects/Attack_Effect/Classic/3/Classic_15.png',
  },
  {
    key: EFFECT_KEYS.fire,
    path: 'assets/effects/Fireball_Effect_2/Fireball_Effect_13.png',
  },
  {
    key: EFFECT_KEYS.light,
    path: 'assets/effects/LightEffects/LightEffect_13.png',
  },
  {
    key: EFFECT_KEYS.water,
    path: 'assets/effects/Water_Effect/03/Water__03.png',
  },
  {
    key: EFFECT_KEYS.cosmic,
    path: 'assets/effects/CosmicTimeMagicEffect/3/Cosmic_13.png',
  },
  {
    key: EFFECT_KEYS.limit,
    path: 'assets/effects/CosmicTimeMagicEffect/5/Cosmic_23.png',
  },
  {
    key: EFFECT_KEYS.bossStrike,
    path: 'assets/effects/LightEffects/LightEffect_20.png',
  },
  {
    key: EFFECT_KEYS.bossConfuse,
    path: 'assets/effects/CosmicTimeMagicEffect/4/Cosmic_18.png',
  },
  {
    key: EFFECT_KEYS.bossBlind,
    path: 'assets/effects/LightEffects/LightEffect_08.png',
  },
  {
    key: EFFECT_KEYS.bossBerserk,
    path: 'assets/effects/Fireball_Effect_2/Fireball_Effect_18.png',
  },
  {
    key: EFFECT_KEYS.bossSilence,
    path: 'assets/effects/Water_Effect/04/Water__04.png',
  },
  {
    key: EFFECT_KEYS.bossDaze,
    path: 'assets/effects/Attack_Effect/Classic/4/Classic_21.png',
  },
];

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
    // Minimal splash while the lightweight title preview loads.
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

    // Only the small title preview; heavy game assets load in PreloadScene.
    this.load.image(TITLE_SCREEN_KEY, TITLE_SCREEN_PATH);
  }

  create() {
    this.scene.start('Preload');
  }
}
