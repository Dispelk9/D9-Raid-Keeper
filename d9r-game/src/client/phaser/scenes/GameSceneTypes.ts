import { HEADER_H, PAD, W } from '../constants';
import type { HeroPose, BattleLogEntry } from '../../../shared/game/types';

// Re-export BattleLogEntry for consumers
export type { BattleLogEntry };

// ── View type ─────────────────────────────────────────────────────────────
export type View = 'title' | 'map' | 'party' | 'raid' | 'heroes' | 'loot' | 'help';

// ── Interfaces ────────────────────────────────────────────────────────────

export type HeroSlotRef = {
  icon: Phaser.GameObjects.Image;
  hpBarFill: Phaser.GameObjects.Rectangle;
  lbBarFill: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  lbText: Phaser.GameObjects.Text;
  objects: Array<Phaser.GameObjects.GameObject>;
  iconCX: number;
  iconCY: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  // Cell-level hit area (clicking anywhere above the buttons = attack)
  cellHit: Phaser.GameObjects.Rectangle;
  // Per-hero action buttons: SKL, LMT, DEFEND
  defBg: Phaser.GameObjects.Rectangle;
  defText: Phaser.GameObjects.Text;
  sklBg: Phaser.GameObjects.Rectangle;
  sklText: Phaser.GameObjects.Text;
  lmtBg: Phaser.GameObjects.Rectangle;
  lmtText: Phaser.GameObjects.Text;
  // Dim overlay shown when the hero has already acted this round
  actedDim: Phaser.GameObjects.Rectangle;
  // Shield icon overlay shown while hero.isDefending is true
  shieldIcon: Phaser.GameObjects.Text;
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
  bg: Phaser.GameObjects.Rectangle;
  ring: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
  floorX: number;
  floorY: number;
  floorW: number;
  floorH: number;
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

export type MultiBossRef = {
  image: Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  ring: Phaser.GameObjects.Graphics;
};

export type BossAttackCue = Pick<
  BattleLogEntry,
  'attackName' | 'effectType' | 'targetHeroIds'
>;

// ── Layout constants ──────────────────────────────────────────────────────
export const GAME_Y = HEADER_H + PAD;        // 60
export const STAGE_X = PAD;                  // 8
export const STAGE_Y = GAME_Y;               // 60
export const STAGE_W = W - PAD * 2;          // 414
export const STAGE_H = 540;
export const INFO_BAR_H = 52;
export const BANNER_ZONE_H = 48;

// Boss content area (full-width, below info bar + banner zone)
export const BOSS_CONTENT_H = 204;
// 2×2 hero grid below the boss area
export const HERO_GRID_Y = STAGE_Y + INFO_BAR_H + BANNER_ZONE_H + BOSS_CONTENT_H; // 364
export const HERO_GRID_H = STAGE_H - INFO_BAR_H - BANNER_ZONE_H - BOSS_CONTENT_H; // 236
export const HERO_CELL_W = Math.floor(STAGE_W / 2);                                 // 207
export const HERO_CELL_H = Math.floor(HERO_GRID_H / 2);                             // 118

// Maximum party size
export const MAX_PARTY = 4;

export const HERO_SPRITE_SIZE = 80; // display size in the grid cell
export const STATS_BAR_Y = STAGE_Y + STAGE_H + PAD;
export const FALLBACK_HERO_ID = 'frontend-developer';
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
