import { HEADER_H, PAD, W } from '../constants';
import type { HeroPose, BattleLogEntry } from '../../../shared/game/types';

// Re-export BattleLogEntry for consumers
export type { BattleLogEntry };

// ── View type ─────────────────────────────────────────────────────────────
export type View = 'title' | 'map' | 'party' | 'raid' | 'heroes' | 'loot' | 'help';

// ── Interfaces ────────────────────────────────────────────────────────────

export type HeroSlotRef = {
  icon: Phaser.GameObjects.Image;
  hpText: Phaser.GameObjects.Text;
  lbText: Phaser.GameObjects.Text;
  objects: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Text>;
  iconCX: number;
  iconCY: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export type HeroCardRef = {
  heroId: string;
  levelText: Phaser.GameObjects.Text;
  rarityText: Phaser.GameObjects.Text;
  btnBg: Phaser.GameObjects.Rectangle;
  partyBg: Phaser.GameObjects.Rectangle;
  partyText: Phaser.GameObjects.Text;
  gemBg: Phaser.GameObjects.Rectangle;
  gemText: Phaser.GameObjects.Text;
};

export type MapNodeRef = {
  level: number;
  name: string;
  bg: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Arc;
};

export type PartyHeroRef = {
  heroId: string;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
};

export type RaidRun = {
  nodeLevel: number;
  battleIndex: number;
  battleCount: number;
  totalDamage: number;
  party: string[];
};

export type SkillChoiceRef = {
  hit: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  summaryText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
};

export type BossAttackCue = Pick<
  BattleLogEntry,
  'attackName' | 'effectType' | 'targetHeroIds'
>;

// ── Layout constants ──────────────────────────────────────────────────────
export const GAME_Y = HEADER_H + PAD; // 60
export const STAGE_X = PAD; // 8
export const STAGE_Y = GAME_Y; // 60
export const STAGE_W = W - PAD * 2; // 414
export const STAGE_H = 540;
export const INFO_BAR_H = 52;
export const ACTION_H = 64;
// Gap between the boss-HP bar and the first hero slot — skill banners appear here
export const BANNER_ZONE_H = 48;
export const BOSS_AREA_W = Math.floor(STAGE_W * 0.52);
export const HERO_AREA_X = STAGE_X + BOSS_AREA_W + PAD;
export const HERO_AREA_W = STAGE_W - BOSS_AREA_W - PAD;
export const CONTENT_H = STAGE_H - INFO_BAR_H - BANNER_ZONE_H - PAD - ACTION_H - PAD * 2;
export const HERO_SLOT_H = Math.floor((CONTENT_H - 4 * 5) / 5);
export const HERO_SPRITE_SIZE = 72;
export const HERO_BAR_X_OFF = HERO_SPRITE_SIZE - 2;
export const STATS_BAR_Y = STAGE_Y + STAGE_H + PAD;
export const HERO_FRAME_DISPLAY_W = 70;
export const HERO_FRAME_DISPLAY_H = 70;
export const FALLBACK_HERO_ID = 'snoo-vanguard';
export const ENERGY_COST = 10;

export const COMMON_HERO_POSE_COL: Record<HeroPose, number> = {
  idle: 0,
  walk1: 0,
  walk2: 0,
  attack: 1,
  cast: 2,
  hit: 0,
  ko: 3,
  victory: 4,
};

export const DEVOPS_HERO_POSE_COL: Record<HeroPose, number> = {
  ...COMMON_HERO_POSE_COL,
  hit: 3,
  ko: 4,
  victory: 5,
};

// ── Helper functions ──────────────────────────────────────────────────────
export const fmt = (n: number) => Math.round(n).toLocaleString();
export const fmtCompact = (n: number) =>
  Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.round(n));
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
