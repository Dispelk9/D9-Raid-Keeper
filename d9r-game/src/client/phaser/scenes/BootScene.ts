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

// ── Sequential frame animation assets ────────────────────────────────────
// Helper: inclusive range array
const _r = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const _pad = (n: number) => String(n).padStart(2, '0');

const _a1 = (n: number) => `seq-a1-${_pad(n)}`;
const _a2 = (n: number) => `seq-a2-${_pad(n)}`;
const _a3 = (n: number) => `seq-a3-${_pad(n)}`;
const _cos = (n: number) => `seq-cos-${_pad(n)}`;
const _fb = (n: number) => `seq-fb-${_pad(n)}`;
const _lt = (n: number) => `seq-lt-${_pad(n)}`;
const _wt = (folder: string, n: number) => `seq-wt-${folder}-${_pad(n)}`;

export const SEQ_ASSETS: Array<{ key: string; path: string }> = [
  // Alternative 1 (all 30 frames across 5 sub-folders)
  ..._r(1, 30).map(n => ({
    key: _a1(n),
    path: `assets/effects/Attack_Effect/Alternative 1/${Math.ceil(n / 6)}/Alternative_1_${_pad(n)}.png`,
  })),
  // Alternative 2 (first 6 frames, sub-folder 1 — for automod hero)
  ..._r(1, 6).map(n => ({
    key: _a2(n),
    path: `assets/effects/Attack_Effect/Alternative 2/1/Alternative_2_${_pad(n)}.png`,
  })),
  // Alternative 3 (first 18 frames, 3 sub-folders — for boss strikes)
  ..._r(1, 18).map(n => ({
    key: _a3(n),
    path: `assets/effects/Attack_Effect/Alternative 3/${Math.ceil(n / 6)}/Alternative_3_${_pad(n)}.png`,
  })),
  // CosmicTimeMagicEffect (25 frames across 5 sub-folders)
  ..._r(1, 25).map(n => ({
    key: _cos(n),
    path: `assets/effects/CosmicTimeMagicEffect/${Math.ceil(n / 5)}/Cosmic_${_pad(n)}.png`,
  })),
  // Fireball_Effect_2 (24 flat PNGs)
  ..._r(1, 24).map(n => ({
    key: _fb(n),
    path: `assets/effects/Fireball_Effect_2/Fireball_Effect_${_pad(n)}.png`,
  })),
  // LightEffects (25 flat PNGs)
  ..._r(1, 25).map(n => ({
    key: _lt(n),
    path: `assets/effects/LightEffects/LightEffect_${_pad(n)}.png`,
  })),
  // Water_Effect (5 sub-folders × 5 frames)
  ...['01', '02', '03', '04', '05'].flatMap(f =>
    _r(1, 5).map(n => ({ key: _wt(f, n), path: `assets/effects/Water_Effect/${f}/Water__${_pad(n)}.png` }))
  ),
];

// Named sequences — each value is an ordered list of texture keys to display as a flip-book animation
export const EFFECT_SEQUENCES: Record<string, string[]> = {
  // Hero basic attack sequences (unique per hero)
  'hero-atk-frontend-developer': _r(1, 6).map(_a1),
  'hero-atk-backend-developer':  _r(7, 12).map(_a1),
  'hero-atk-devops-engineer':    _r(13, 18).map(_a1),
  'hero-atk-qa-tester':          _r(19, 24).map(_a1),
  'hero-atk-security-engineer':  _r(25, 30).map(_a1),
  'hero-atk-data-engineer':      _r(1, 6).map(_a2),
  // Hero skill effects — Cosmic (5 variants × 5 frames each)
  'skill-cosmic1': _r(1, 5).map(_cos),
  'skill-cosmic2': _r(6, 10).map(_cos),
  'skill-cosmic3': _r(11, 15).map(_cos),
  'skill-cosmic4': _r(16, 20).map(_cos),
  'skill-cosmic5': _r(21, 25).map(_cos),
  // Hero skill effects — full sequences
  'skill-fire':  _r(1, 24).map(_fb),
  'skill-light': _r(1, 25).map(_lt),
  'skill-water': ['01', '02', '03', '04', '05'].flatMap(f => _r(1, 5).map(n => _wt(f, n))),
  // Boss strike sequences (3 unique patterns cycling through attacks)
  'boss-strike1': _r(1, 6).map(_a3),
  'boss-strike2': _r(7, 12).map(_a3),
  'boss-strike3': _r(13, 18).map(_a3),
};

export type HeroSpriteConfig = {
  key: string;
  frameW: number; // canvas width in px — used for scale maths in heroesLoot
};

// Each hero has a standalone 512×512 PNG (character ~440 px tall, centred).
export const HERO_SPRITE_CONFIG: Record<string, HeroSpriteConfig> = {
  'frontend-developer': { key: 'hero-frontend-developer', frameW: 512 },
  'backend-developer':  { key: 'hero-backend-developer',  frameW: 512 },
  'devops-engineer':    { key: 'hero-devops-engineer',     frameW: 512 },
  'qa-tester':          { key: 'hero-qa-tester',           frameW: 512 },
  'security-engineer':  { key: 'hero-security-engineer',   frameW: 512 },
  'data-engineer':      { key: 'hero-data-engineer',       frameW: 512 },
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
