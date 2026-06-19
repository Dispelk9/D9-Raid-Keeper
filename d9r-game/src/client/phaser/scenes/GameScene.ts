import Phaser from 'phaser';
import { context } from '@devvit/web/client';
import { COLORS, FONT, H, HEADER_H, PAD, RARITY_COLOR, ROLE_COLOR, W } from '../constants';
import { HERO_SHEET_KEY } from './BootScene';
import { loadKeeperSave, persistKeeperSave } from '../../keeper/api';
import { HEROES } from '../../../shared/game/data/heroes';
import { getBossAppearance } from '../../../shared/game/data/raidBosses';
import {
  applyBattleRewards, canUpgradeHero, claimDailyReward,
  createBattleRewards, getHeroProgress, getScaledStats,
  getUpgradeCost, upgradeHero,
} from '../../../shared/game/logic/progression';
import {
  canUseSkill, canUseUltimate, createBattleState,
  getActiveHero, resolveHeroAction,
} from '../../../shared/game/logic/combat';
import type {
  BattleAction, BattleState, HeroTemplate, PlayerSave, RewardBundle,
} from '../../../shared/game/types';

type View = 'raid' | 'heroes' | 'loot';

const ENERGY_COST = 10;
const fmt = (n: number) => Math.round(n).toLocaleString();
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// ── Layout (no tab bar) ────────────────────────────────────────────────────
const GAME_Y    = HEADER_H + PAD;           // 60
const STAGE_X   = PAD;                       // 8
const STAGE_Y   = GAME_Y;                    // 60
const STAGE_W   = W - PAD * 2;              // 414
const STAGE_H   = 504;
const INFO_BAR_H = 52;
const ACTION_H  = 44;
const BOSS_AREA_W  = Math.floor(STAGE_W * 0.52);
const HERO_AREA_X  = STAGE_X + BOSS_AREA_W + PAD;
const HERO_AREA_W  = STAGE_W - BOSS_AREA_W - PAD;
const CONTENT_H    = STAGE_H - INFO_BAR_H - PAD - ACTION_H - PAD;
const HERO_SLOT_H  = Math.floor((CONTENT_H - 4 * 5) / 5);
const HERO_CIRCLE_R = Math.floor(HERO_SLOT_H * 0.36);
const HERO_BAR_X_OFF = HERO_CIRCLE_R * 2 + PAD * 3;
const HERO_BAR_W    = HERO_AREA_W - HERO_BAR_X_OFF - PAD;
const STATS_BAR_Y  = STAGE_Y + STAGE_H + PAD;

type HeroSlotRef = {
  bg: Phaser.GameObjects.Graphics;
  roleCircle: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Image;
  hpFill: Phaser.GameObjects.Rectangle;
  chargeFill: Phaser.GameObjects.Rectangle;
  iconCX: number; iconCY: number;
  sx: number; sy: number; sw: number; sh: number;
};

type HeroCardRef = {
  heroId: string;
  levelText: Phaser.GameObjects.Text;
  btnBg: Phaser.GameObjects.Rectangle;
};

export class GameScene extends Phaser.Scene {
  // State
  private profile: PlayerSave | null = null;
  private battle: BattleState | null = null;
  private view: View = 'raid';
  private lastRewards: RewardBundle | null = null;
  private statsExpanded = false;
  private selectedHeroId: string | null = null;
  private settingsPanelOpen = false;

  // Containers
  private raidGroup!: Phaser.GameObjects.Container;
  private heroesGroup!: Phaser.GameObjects.Container;
  private lootGroup!: Phaser.GameObjects.Container;
  private settingsGroup!: Phaser.GameObjects.Container;
  private resultGroup!: Phaser.GameObjects.Container;
  private detailGroup!: Phaser.GameObjects.Container;

  // Header
  private energyText!: Phaser.GameObjects.Text;
  private raidLvText!: Phaser.GameObjects.Text;

  // Boss
  private bossAura!: Phaser.GameObjects.Arc;
  private bossImage!: Phaser.GameObjects.Image;
  private bossTitleText!: Phaser.GameObjects.Text;
  private bossNameText!: Phaser.GameObjects.Text;
  private bossHpText!: Phaser.GameObjects.Text;
  private bossHpFill!: Phaser.GameObjects.Rectangle;

  // Hero slots
  private heroSlots: HeroSlotRef[] = [];
  private activeHighlight!: Phaser.GameObjects.Graphics;

  // Action buttons
  private attackBtnBg!: Phaser.GameObjects.Rectangle;
  private skillBtnBg!: Phaser.GameObjects.Rectangle;
  private skillBtnText!: Phaser.GameObjects.Text;
  private ultBtnBg!: Phaser.GameObjects.Rectangle;
  private ultBtnText!: Phaser.GameObjects.Text;

  // Stats bar
  private statsHeroText!: Phaser.GameObjects.Text;
  private statsRoundText!: Phaser.GameObjects.Text;
  private statsChevron!: Phaser.GameObjects.Text;
  private statsValuesGroup!: Phaser.GameObjects.Container;
  private statValueTexts: Phaser.GameObjects.Text[] = [];

  // Settings panel
  private settingsCurrTexts: Phaser.GameObjects.Text[] = [];
  private settingsNavBtns: Phaser.GameObjects.Rectangle[] = [];

  // Result overlay
  private resultStatusText!: Phaser.GameObjects.Text;
  private resultDamageText!: Phaser.GameObjects.Text;
  private resultRewardsText!: Phaser.GameObjects.Text;
  private resultNextBg!: Phaser.GameObjects.Graphics;
  private resultNextIcon!: Phaser.GameObjects.Text;
  private resultNextName!: Phaser.GameObjects.Text;

  // Heroes view
  private heroCardRefs: HeroCardRef[] = [];

  // Hero detail sheet
  private detailHeroName!: Phaser.GameObjects.Text;
  private detailRoleLv!: Phaser.GameObjects.Text;
  private detailRarityText!: Phaser.GameObjects.Text;
  private detailStatValues: Phaser.GameObjects.Text[] = [];
  private detailSkillText!: Phaser.GameObjects.Text;
  private detailUltText!: Phaser.GameObjects.Text;
  private detailUpgradeBg!: Phaser.GameObjects.Rectangle;
  private detailUpgradeText!: Phaser.GameObjects.Text;
  private detailIconText!: Phaser.GameObjects.Text;
  private detailCircle!: Phaser.GameObjects.Arc;

  // Loot view
  private lootStatTexts: Phaser.GameObjects.Text[] = [];
  private lootItemsGroup!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'Game' }); }

  // ══════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════

  async create() {
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.pageBg);

    this.raidGroup   = this.add.container(0, 0).setDepth(2);
    this.heroesGroup = this.add.container(0, 0).setDepth(2);
    this.lootGroup   = this.add.container(0, 0).setDepth(2);

    this.buildHeader();
    this.buildRaidView();
    this.buildHeroesView();
    this.buildLootView();
    this.buildSettingsPanel();
    this.buildResultOverlay();
    this.buildDetailSheet();

    this.setView('raid');

    const username = context.username ?? 'player';
    this.profile = await loadKeeperSave(username);
    this.battle = createBattleState(this.profile);
    this.refreshAll();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Header
  // ══════════════════════════════════════════════════════════════════════

  private buildHeader() {
    // BG and separator — static, always visible, no container needed
    this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, COLORS.headerBg).setDepth(8);
    this.add.rectangle(W / 2, HEADER_H - 1, W, 1, COLORS.border).setDepth(8);

    // ⚙️ gear icon — left
    this.add
      .text(PAD + 16, HEADER_H / 2, '⚙️', { fontSize: '26px', fontFamily: FONT.emoji })
      .setOrigin(0.5)
      .setDepth(9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSettingsPanel());

    // ⚡ Energy — right of center
    this.energyText = this.add
      .text(W - 96, HEADER_H / 2, '⚡0', {
        fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#52525b',
      })
      .setOrigin(0, 0.5)
      .setDepth(9);

    // RAID level badge — far right
    const badgeBg = this.add.graphics().setDepth(8);
    badgeBg.fillStyle(COLORS.ink);
    badgeBg.fillRoundedRect(W - 52, (HEADER_H - 34) / 2, 44, 34, 6);

    this.add
      .text(W - 30, HEADER_H / 2 - 8, 'RAID', {
        fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.raidLvText = this.add
      .text(W - 30, HEADER_H / 2 + 8, '1', {
        fontSize: '15px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(9);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Settings Panel  (nav + currency — ALL in one container)
  // ══════════════════════════════════════════════════════════════════════

  private buildSettingsPanel() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    // Full-screen dim overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
    overlay.on('pointerdown', () => this.toggleSettingsPanel());
    objs.push(overlay);

    const panelX = PAD * 2;
    const panelY = HEADER_H + PAD;
    const panelW = W - PAD * 4;
    const panelH = 310;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.white);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panelBg.lineStyle(1, COLORS.border, 1);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
    objs.push(panelBg);

    // Title
    objs.push(
      this.add.text(panelX + PAD * 2, panelY + 14, 'Reddit Raid Keeper', {
        fontSize: '18px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      }).setOrigin(0, 0)
    );

    // Currency tiles row
    const currLabels = ['Gold', 'Gems', 'Energy', 'Tokens'];
    const tileW = (panelW - PAD * 5) / 4;
    const tilesY = panelY + 50;
    const currTexts: Phaser.GameObjects.Text[] = [];

    currLabels.forEach((lbl, i) => {
      const tx = panelX + PAD + i * (tileW + PAD);

      const bg = this.add.graphics();
      bg.fillStyle(0xf5f5f5); bg.fillRoundedRect(tx, tilesY, tileW, 54, 6);
      objs.push(bg);

      objs.push(
        this.add.text(tx + tileW / 2, tilesY + 11, lbl.toUpperCase(), {
          fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#71717a',
        }).setOrigin(0.5, 0)
      );

      const val = this.add.text(tx + tileW / 2, tilesY + 27, '0', {
        fontSize: '14px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      }).setOrigin(0.5, 0);
      objs.push(val);
      currTexts.push(val);
    });
    this.settingsCurrTexts = currTexts;

    // Section divider label
    objs.push(
      this.add.text(panelX + PAD * 2, tilesY + 62, 'NAVIGATE', {
        fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#a1a1aa',
      }).setOrigin(0, 0)
    );

    // Nav buttons
    const navY = tilesY + 78;
    const navH = 48;
    const navBtnW = (panelW - PAD * 4) / 3;
    const views: View[] = ['raid', 'heroes', 'loot'];
    const navIcons = ['⚔️', '🧙', '🎁'];
    const navBtns: Phaser.GameObjects.Rectangle[] = [];

    views.forEach((v, i) => {
      const bx = panelX + PAD + i * (navBtnW + PAD);

      const btn = this.add
        .rectangle(bx + navBtnW / 2, navY + navH / 2, navBtnW, navH, COLORS.ink)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        this.settingsPanelOpen = false;
        this.settingsGroup.setVisible(false);
        this.setView(v);
      });
      objs.push(btn);
      navBtns.push(btn);

      objs.push(
        this.add.text(bx + navBtnW / 2, navY + navH / 2 - 8, navIcons[i] ?? '', {
          fontSize: '18px', fontFamily: FONT.emoji,
        }).setOrigin(0.5)
      );
      objs.push(
        this.add.text(bx + navBtnW / 2, navY + navH / 2 + 11, v.charAt(0).toUpperCase() + v.slice(1), {
          fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
        }).setOrigin(0.5)
      );
    });
    this.settingsNavBtns = navBtns;

    objs.push(
      this.add.text(panelX + panelW / 2, navY + navH + PAD * 2, 'tap outside to close', {
        fontSize: '11px', fontFamily: FONT.sans, color: '#a1a1aa',
      }).setOrigin(0.5, 0)
    );

    this.settingsGroup = this.add.container(0, 0, objs).setDepth(28).setVisible(false);
  }

  private toggleSettingsPanel() {
    this.settingsPanelOpen = !this.settingsPanelOpen;
    this.settingsGroup.setVisible(this.settingsPanelOpen);

    if (this.settingsPanelOpen && this.profile) {
      const vals = [
        this.profile.gold, this.profile.gems,
        this.profile.energy, this.profile.raidTokens,
      ];
      vals.forEach((v, i) => this.settingsCurrTexts[i]?.setText(fmt(v)));

      const views: View[] = ['raid', 'heroes', 'loot'];
      views.forEach((v, i) => {
        this.settingsNavBtns[i]?.setFillStyle(v === this.view ? COLORS.btnSkill : COLORS.ink);
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Raid View
  // ══════════════════════════════════════════════════════════════════════

  private buildRaidView() {
    this.buildBattleField();
    this.buildBossInfoBar();
    this.buildBossSprite();
    this.buildHeroSlotsUI();
    this.buildActionButtons();
    this.buildActiveHighlight();
    this.buildStatsBar();
  }

  private buildBattleField() {
    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.fieldBg);
    gfx.fillRoundedRect(STAGE_X, STAGE_Y, STAGE_W, STAGE_H, 8);
    gfx.lineStyle(1, 0xffffff, 0.12);
    for (let gx = STAGE_X; gx < STAGE_X + STAGE_W; gx += 42)
      gfx.lineBetween(gx, STAGE_Y, gx, STAGE_Y + STAGE_H);
    for (let gy = STAGE_Y; gy < STAGE_Y + STAGE_H; gy += 42)
      gfx.lineBetween(STAGE_X, gy, STAGE_X + STAGE_W, gy);
    gfx.fillStyle(0xf97316, 0.1);
    gfx.fillCircle(STAGE_X + STAGE_W * 0.84, STAGE_Y + STAGE_H * 0.15, 22);
    gfx.fillStyle(0x0ea5e9, 0.1);
    gfx.fillCircle(STAGE_X + STAGE_W * 0.73, STAGE_Y + STAGE_H * 0.82, 26);
    this.raidGroup.add(gfx);
  }

  private buildBossInfoBar() {
    const bx = STAGE_X + PAD;
    const by = STAGE_Y + PAD;
    const bw = STAGE_W - PAD * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.94);
    bg.fillRoundedRect(bx, by, bw, INFO_BAR_H, 6);

    this.bossTitleText = this.add.text(bx + PAD, by + 8, '', {
      fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#b91c1c',
    }).setOrigin(0, 0);

    this.bossNameText = this.add.text(bx + PAD, by + 20, '', {
      fontSize: '13px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0, 0);

    this.bossHpText = this.add.text(bx + bw - PAD, by + 14, '', {
      fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#52525b',
    }).setOrigin(1, 0.5);

    const hpY = by + INFO_BAR_H - 11;
    const hpTrack = this.add.rectangle(bx + bw / 2, hpY, bw, 7, COLORS.track).setOrigin(0.5);
    this.bossHpFill = this.add.rectangle(bx, hpY, bw, 7, COLORS.boss).setOrigin(0, 0.5);

    this.raidGroup.add([bg, this.bossTitleText, this.bossNameText, this.bossHpText, hpTrack, this.bossHpFill]);
  }

  private buildBossSprite() {
    const contentY = STAGE_Y + INFO_BAR_H + PAD * 2;
    const contentH = STAGE_H - INFO_BAR_H - PAD * 2 - ACTION_H - PAD;
    const bossCX = STAGE_X + Math.floor(BOSS_AREA_W / 2);
    const bossCY = contentY + Math.floor(contentH / 2);
    const bossR = 56;

    this.bossAura = this.add.arc(bossCX, bossCY, bossR + 20, 0, 360, false, COLORS.boss, 0.25);
    this.tweens.add({
      targets: this.bossAura,
      scaleX: 1.12, scaleY: 1.12, alpha: 0.1,
      duration: 950, ease: 'Sine.InOut', yoyo: true, repeat: -1,
    });

    // Boss image — texture is set in refreshBoss(); display size fits the circle
    this.bossImage = this.add.image(bossCX, bossCY, 'boss-goo')
      .setDisplaySize(bossR * 2, bossR * 2)
      .setOrigin(0.5);

    this.raidGroup.add([this.bossAura, this.bossImage]);
  }

  private buildHeroSlotsUI() {
    const contentY = STAGE_Y + INFO_BAR_H + PAD * 2;
    const slotW = HERO_AREA_W - PAD;

    for (let i = 0; i < 5; i++) {
      const sx = HERO_AREA_X;
      const sy = contentY + i * (HERO_SLOT_H + 5);
      const cx = sx + PAD + HERO_CIRCLE_R;
      const cy = sy + HERO_SLOT_H / 2;

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.white, 0.88);
      bg.fillRoundedRect(sx, sy, slotW, HERO_SLOT_H, 8);

      const roleCircle = this.add.arc(cx, cy, HERO_CIRCLE_R, 0, 360, false, COLORS.warrior, 1);
      // Sprite frame is updated in refreshHeroSlots once battle state is loaded
      const icon = this.add.image(cx, cy, HERO_SHEET_KEY, 0)
        .setDisplaySize(HERO_CIRCLE_R * 2, HERO_CIRCLE_R * 2)
        .setOrigin(0.5);

      const barX = sx + HERO_BAR_X_OFF;
      const barY = cy - 5;
      const hpTrack = this.add.rectangle(barX + HERO_BAR_W / 2, barY, HERO_BAR_W, 7, COLORS.track).setOrigin(0.5);
      const hpFill  = this.add.rectangle(barX, barY, HERO_BAR_W, 7, COLORS.hp).setOrigin(0, 0.5);

      const cBarY = barY + 13;
      const cTrack = this.add.rectangle(barX + HERO_BAR_W / 2, cBarY, HERO_BAR_W, 4, COLORS.track).setOrigin(0.5);
      const cFill  = this.add.rectangle(barX, cBarY, HERO_BAR_W, 4, COLORS.charge).setOrigin(0, 0.5);

      this.raidGroup.add([bg, hpTrack, cTrack, roleCircle, icon, hpFill, cFill]);
      this.heroSlots.push({
        bg, roleCircle, icon, hpFill, chargeFill: cFill,
        iconCX: cx, iconCY: cy, sx, sy, sw: slotW, sh: HERO_SLOT_H,
      });
    }
  }

  private buildActionButtons() {
    const btnY = STAGE_Y + STAGE_H - PAD - ACTION_H / 2;
    const btnW = Math.floor((STAGE_W - PAD * 4) / 3);
    const gap  = Math.floor((STAGE_W - PAD * 2 - btnW * 3) / 2);
    const startX = STAGE_X + PAD + btnW / 2;

    const makeBtn = (cx: number, label: string, color: number) => {
      const bg  = this.add.rectangle(cx, btnY, btnW, ACTION_H - 4, color).setInteractive({ useHandCursor: true });
      const txt = this.add.text(cx, btnY, label, {
        fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      }).setOrigin(0.5);
      this.raidGroup.add([bg, txt]);
      return [bg, txt] as const;
    };

    [this.attackBtnBg] = makeBtn(startX, 'Attack', COLORS.btnPrimary);
    this.attackBtnBg.on('pointerdown', () => this.handleAction('attack'));

    [this.skillBtnBg, this.skillBtnText] = makeBtn(startX + btnW + gap, 'Skill', COLORS.btnSkill);
    this.skillBtnBg.on('pointerdown', () => this.handleAction('skill'));

    [this.ultBtnBg, this.ultBtnText] = makeBtn(startX + (btnW + gap) * 2, '⚡ Ult', COLORS.btnUlt);
    this.ultBtnBg.on('pointerdown', () => this.handleAction('ultimate'));
  }

  private buildActiveHighlight() {
    this.activeHighlight = this.add.graphics();
    this.raidGroup.add(this.activeHighlight);
  }

  private buildStatsBar() {
    const sbY = STATS_BAR_Y;
    const sbW = STAGE_W;
    const sbH = 44;

    const sbBg = this.add.graphics();
    sbBg.fillStyle(COLORS.statsBg);
    sbBg.fillRoundedRect(STAGE_X, sbY, sbW, sbH, 8);
    sbBg.lineStyle(1, COLORS.border, 1);
    sbBg.strokeRoundedRect(STAGE_X, sbY, sbW, sbH, 8);

    const hitArea = this.add
      .rectangle(STAGE_X + sbW / 2, sbY + sbH / 2, sbW, sbH, 0, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.toggleStats());

    this.statsHeroText = this.add.text(STAGE_X + PAD, sbY + sbH / 2, '—', {
      fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#3f3f46',
    }).setOrigin(0, 0.5);

    this.statsRoundText = this.add.text(STAGE_X + sbW - PAD * 5, sbY + sbH / 2, '', {
      fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#71717a',
    }).setOrigin(1, 0.5);

    this.statsChevron = this.add.text(STAGE_X + sbW - PAD, sbY + sbH / 2, '▼', {
      fontSize: '10px', fontFamily: FONT.sans, color: '#a1a1aa',
    }).setOrigin(1, 0.5);

    // Stats values grid
    const statLabels = ['HP', 'ATK', 'DEF', 'MAG', 'RES', 'SPD'];
    const tileW = (sbW - PAD * 4) / 3;
    const tileH = 30;
    const vgY = sbY + sbH + PAD;
    const valsBg = this.add.graphics();
    const valsTexts: Phaser.GameObjects.Text[] = [];

    statLabels.forEach((lbl, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const tx = STAGE_X + PAD + col * (tileW + PAD);
      const ty = vgY + row * (tileH + 4);
      valsBg.fillStyle(COLORS.white, 0.9);
      valsBg.fillRoundedRect(tx, ty, tileW, tileH, 5);
      this.add.text(tx + PAD, ty + 7, lbl, {
        fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#71717a',
      }).setOrigin(0, 0);
      const val = this.add.text(tx + PAD, ty + 17, '—', {
        fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      }).setOrigin(0, 0);
      valsTexts.push(val);
    });
    this.statValueTexts = valsTexts;
    this.statsValuesGroup = this.add.container(0, 0, [valsBg, ...valsTexts]).setVisible(false);

    this.raidGroup.add([sbBg, hitArea, this.statsHeroText, this.statsRoundText, this.statsChevron, this.statsValuesGroup]);
  }

  private toggleStats() {
    this.statsExpanded = !this.statsExpanded;
    this.statsValuesGroup.setVisible(this.statsExpanded);
    this.statsChevron.setText(this.statsExpanded ? '▲' : '▼');
    this.refreshStatsBar();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Result Overlay  (ALL in resultGroup)
  // ══════════════════════════════════════════════════════════════════════

  private buildResultOverlay() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    const overlayBg = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.72);
    objs.push(overlayBg);

    const panelH = 240;
    const panelX = PAD * 3;
    const panelY = H / 2 - panelH / 2;
    const panelW = W - PAD * 6;
    const panelCX = W / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.white);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panelBg.lineStyle(1, COLORS.border, 1);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
    objs.push(panelBg);

    this.resultStatusText = this.add.text(panelCX, panelY + 20, '', {
      fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#c2410c',
    }).setOrigin(0.5, 0);
    objs.push(this.resultStatusText);

    this.resultDamageText = this.add.text(panelCX, panelY + 36, '', {
      fontSize: '32px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0.5, 0);
    objs.push(this.resultDamageText);

    this.resultRewardsText = this.add.text(panelCX, panelY + 82, '', {
      fontSize: '12px', fontFamily: FONT.sans, color: '#52525b',
    }).setOrigin(0.5, 0);
    objs.push(this.resultRewardsText);

    // Next boss preview panel
    this.resultNextBg = this.add.graphics();
    this.resultNextBg.fillStyle(0xf5f5f5);
    this.resultNextBg.fillRoundedRect(PAD * 5, panelY + 106, panelW - PAD * 4, 40, 8);
    objs.push(this.resultNextBg);

    this.resultNextIcon = this.add.text(PAD * 7, panelY + 126, '', {
      fontSize: '22px', fontFamily: FONT.emoji,
    }).setOrigin(0, 0.5);
    objs.push(this.resultNextIcon);

    this.resultNextName = this.add.text(PAD * 12, panelY + 126, '', {
      fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0, 0.5);
    objs.push(this.resultNextName);

    // Next raid button
    const nextBtnY = panelY + panelH - 30;
    const nextBtnBg = this.add.graphics();
    nextBtnBg.fillStyle(COLORS.ink);
    nextBtnBg.fillRoundedRect(PAD * 5, nextBtnY - 18, panelW - PAD * 4, 44, 8);
    objs.push(nextBtnBg);

    const nextBtnHit = this.add
      .rectangle(panelCX, nextBtnY + 4, panelW - PAD * 4, 44, 0, 0)
      .setInteractive({ useHandCursor: true });
    nextBtnHit.on('pointerdown', () => this.handleStartRaid());
    objs.push(nextBtnHit);

    objs.push(
      this.add.text(panelCX, nextBtnY + 4, 'Next raid', {
        fontSize: '14px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      }).setOrigin(0.5)
    );

    this.resultGroup = this.add.container(0, 0, objs).setDepth(18).setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Heroes View
  // ══════════════════════════════════════════════════════════════════════

  private buildHeroesView() {
    const topY = GAME_Y + PAD;
    const topBtnH = 44;
    const topBtnW = (W - PAD * 3) / 2;

    const makeLargeBtn = (x: number, label: string, color: number, handler: () => void) => {
      const bg = this.add.graphics();
      bg.fillStyle(color); bg.fillRoundedRect(x, topY, topBtnW, topBtnH, 8);
      const hit = this.add.rectangle(x + topBtnW / 2, topY + topBtnH / 2, topBtnW, topBtnH, 0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', handler);
      const txt = this.add.text(x + topBtnW / 2, topY + topBtnH / 2, label, {
        fontSize: '13px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      }).setOrigin(0.5);
      this.heroesGroup.add([bg, hit, txt]);
    };

    makeLargeBtn(PAD, 'Claim Daily', COLORS.btnGreen, () => this.handleDailyClaim());
    makeLargeBtn(PAD * 2 + topBtnW, 'New Raid', COLORS.ink, () => this.handleStartRaid());

    // Hero cards grid (2 col × 3 row)
    const cardW = Math.floor((W - PAD * 3) / 2);
    const cardH = 90;
    const gridStartY = topY + topBtnH + PAD;

    HEROES.forEach((hero, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = PAD + col * (cardW + PAD);
      const cy = gridStartY + row * (cardH + PAD);
      this.buildHeroCard(hero, cx, cy, cardW, cardH);
    });
  }

  private buildHeroCard(hero: HeroTemplate, x: number, y: number, w: number, h: number) {
    const circleR = Math.floor(h * 0.35);
    const cx = x + PAD + circleR;
    const cy = y + h / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(COLORS.white);
    cardBg.fillRoundedRect(x, y, w, h, 8);
    cardBg.lineStyle(1, COLORS.border, 1);
    cardBg.strokeRoundedRect(x, y, w, h, 8);

    const circle = this.add.arc(cx, cy, circleR, 0, 360, false, ROLE_COLOR[hero.role] ?? COLORS.warrior, 1);
    const iconT  = this.add.text(cx, cy, hero.icon, {
      fontSize: `${Math.floor(circleR * 1.1)}px`, fontFamily: FONT.emoji,
    }).setOrigin(0.5);

    this.add.text(cx + circleR + PAD, y + 12, hero.name, {
      fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0, 0);

    const levelText = this.add.text(cx + circleR + PAD, y + 28, `${hero.role} · Lv 1`, {
      fontSize: '10px', fontFamily: FONT.sans, color: '#71717a',
    }).setOrigin(0, 0);

    this.add.text(cx + circleR + PAD, y + 44, hero.rarity, {
      fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans,
      color: '#' + (RARITY_COLOR[hero.rarity] ?? COLORS.rarityCommon).toString(16).padStart(6, '0'),
    }).setOrigin(0, 0);

    const btnX = x + w - PAD - 60;
    const btnY = y + h - PAD - 14;
    const btnBg = this.add.rectangle(btnX + 30, btnY, 60, 28, COLORS.ink).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(btnX + 30, btnY, 'Upgrade', {
      fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
    }).setOrigin(0.5);
    btnBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      this.handleUpgrade(hero.id);
    });

    // Hit area to open detail
    const hitArea = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.showDetail(hero.id));

    this.heroesGroup.add([cardBg, circle, iconT, levelText, btnBg, btnTxt, hitArea]);
    this.heroCardRefs.push({ heroId: hero.id, levelText, btnBg });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Hero Detail Sheet  (ALL in detailGroup)
  // ══════════════════════════════════════════════════════════════════════

  private buildDetailSheet() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    const sheetH = 348;
    const sheetY = H - sheetH;

    // Dim overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    overlay.on('pointerdown', () => this.hideDetail());
    objs.push(overlay);

    // Sheet BG
    const sheetBg = this.add.graphics();
    sheetBg.fillStyle(COLORS.white);
    sheetBg.fillRoundedRect(0, sheetY, W, sheetH + 20, 16);
    objs.push(sheetBg);

    // Close button
    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0xf5f5f5);
    closeBtn.fillCircle(W - PAD * 2 - 14, sheetY + 20, 14);
    objs.push(closeBtn);
    const closeHit = this.add.rectangle(W - PAD * 2 - 14, sheetY + 20, 32, 32, 0, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.hideDetail());
    objs.push(closeHit);
    objs.push(this.add.text(W - PAD * 2 - 14, sheetY + 20, '✕', {
      fontSize: '13px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#52525b',
    }).setOrigin(0.5));

    // Hero circle + icon
    this.detailCircle = this.add.arc(PAD * 2 + 28, sheetY + 26, 28, 0, 360, false, COLORS.warrior, 1);
    objs.push(this.detailCircle);
    this.detailIconText = this.add.text(PAD * 2 + 28, sheetY + 26, '⚔️', {
      fontSize: '28px', fontFamily: FONT.emoji,
    }).setOrigin(0.5);
    objs.push(this.detailIconText);

    // Hero name / role / rarity
    this.detailHeroName = this.add.text(PAD * 4 + 56, sheetY + 12, '', {
      fontSize: '15px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
    }).setOrigin(0, 0);
    objs.push(this.detailHeroName);

    this.detailRoleLv = this.add.text(PAD * 4 + 56, sheetY + 30, '', {
      fontSize: '11px', fontFamily: FONT.sans, color: '#71717a',
    }).setOrigin(0, 0);
    objs.push(this.detailRoleLv);

    this.detailRarityText = this.add.text(PAD * 4 + 56, sheetY + 46, '', {
      fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#7c3aed',
    }).setOrigin(0, 0);
    objs.push(this.detailRarityText);

    // Stats grid (3 col × 2 row)
    const statLabels = ['HP', 'ATK', 'DEF', 'MAG', 'RES', 'SPD'];
    const statTileW = (W - PAD * 4) / 3;
    const statTileH = 36;
    const statsY = sheetY + 72;
    const statValueTexts: Phaser.GameObjects.Text[] = [];

    statLabels.forEach((lbl, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const tx = PAD + col * (statTileW + PAD);
      const ty = statsY + row * (statTileH + 4);

      const tileBg = this.add.graphics();
      tileBg.fillStyle(0xf5f5f4); tileBg.fillRoundedRect(tx, ty, statTileW, statTileH, 6);
      objs.push(tileBg);

      objs.push(this.add.text(tx + PAD, ty + 7, lbl, {
        fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#71717a',
      }).setOrigin(0, 0));

      const val = this.add.text(tx + PAD, ty + 19, '—', {
        fontSize: '13px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      }).setOrigin(0, 0);
      statValueTexts.push(val);
      objs.push(val);
    });
    this.detailStatValues = statValueTexts;

    // Skill / Ultimate panels
    const skillY = statsY + statTileH * 2 + 12;
    const halfW  = (W - PAD * 3) / 2;

    const skillBg = this.add.graphics();
    skillBg.fillStyle(0xfff7ed); skillBg.fillRoundedRect(PAD, skillY, halfW, 52, 8);
    objs.push(skillBg);
    objs.push(this.add.text(PAD + 6, skillY + 7, 'SKILL', {
      fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#c2410c',
    }).setOrigin(0, 0));
    this.detailSkillText = this.add.text(PAD + 6, skillY + 20, '', {
      fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      wordWrap: { width: halfW - 12 },
    }).setOrigin(0, 0);
    objs.push(this.detailSkillText);

    const ultBg = this.add.graphics();
    ultBg.fillStyle(0xeef2ff); ultBg.fillRoundedRect(PAD * 2 + halfW, skillY, halfW, 52, 8);
    objs.push(ultBg);
    objs.push(this.add.text(PAD * 2 + halfW + 6, skillY + 7, 'ULTIMATE', {
      fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#4338ca',
    }).setOrigin(0, 0));
    this.detailUltText = this.add.text(PAD * 2 + halfW + 6, skillY + 20, '', {
      fontSize: '11px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      wordWrap: { width: halfW - 12 },
    }).setOrigin(0, 0);
    objs.push(this.detailUltText);

    // Upgrade button
    const upgBtnY = skillY + 62;
    this.detailUpgradeBg = this.add
      .rectangle(W / 2, upgBtnY + 20, W - PAD * 2, 40, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    this.detailUpgradeBg.on('pointerdown', () => {
      if (this.selectedHeroId) this.handleUpgrade(this.selectedHeroId);
      this.hideDetail();
    });
    objs.push(this.detailUpgradeBg);

    this.detailUpgradeText = this.add.text(W / 2, upgBtnY + 20, 'Upgrade', {
      fontSize: '14px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
    }).setOrigin(0.5);
    objs.push(this.detailUpgradeText);

    this.detailGroup = this.add.container(0, 0, objs).setDepth(28).setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Loot View
  // ══════════════════════════════════════════════════════════════════════

  private buildLootView() {
    const topY = GAME_Y + PAD;
    const tileW = (W - PAD * 3) / 2;
    const tileH = 52;

    const statLabels = ['Best Dmg', 'Total Dmg', 'Raid Lv', 'Items'];
    const statTexts: Phaser.GameObjects.Text[] = [];

    statLabels.forEach((lbl, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const tx = PAD + col * (tileW + PAD);
      const ty = topY + row * (tileH + PAD);

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.white, 0.9); bg.fillRoundedRect(tx, ty, tileW, tileH, 7);
      this.add.text(tx + PAD, ty + 10, lbl.toUpperCase(), {
        fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#71717a',
      }).setOrigin(0, 0);
      const val = this.add.text(tx + PAD, ty + 26, '—', {
        fontSize: '14px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      }).setOrigin(0, 0);
      statTexts.push(val);
      this.lootGroup.add([bg, val]);
    });
    this.lootStatTexts = statTexts;

    const btnY = topY + (tileH + PAD) * 2 + PAD;
    const btnW = (W - PAD * 3) / 2;

    const makeLootBtn = (bx: number, label: string, color: number, handler: () => void) => {
      const bg = this.add.graphics();
      bg.fillStyle(color); bg.fillRoundedRect(bx, btnY, btnW, 40, 8);
      const hit = this.add.rectangle(bx + btnW / 2, btnY + 20, btnW, 40, 0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', handler);
      const txt = this.add.text(bx + btnW / 2, btnY + 20, label, {
        fontSize: '13px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#ffffff',
      }).setOrigin(0.5);
      this.lootGroup.add([bg, hit, txt]);
    };
    makeLootBtn(PAD, 'Daily', COLORS.btnGreen, () => this.handleDailyClaim());
    makeLootBtn(PAD * 2 + btnW, 'Raid', COLORS.ink, () => this.handleStartRaid());

    this.lootItemsGroup = this.add.container(0, btnY + 52);
    this.lootGroup.add(this.lootItemsGroup);
  }

  // ══════════════════════════════════════════════════════════════════════
  // View switching
  // ══════════════════════════════════════════════════════════════════════

  private setView(v: View) {
    this.view = v;
    this.raidGroup.setVisible(v === 'raid');
    this.heroesGroup.setVisible(v === 'heroes');
    this.lootGroup.setVisible(v === 'loot');
    if (v !== 'heroes') this.hideDetail();
    if (v === 'loot') this.refreshLoot();
    if (v === 'heroes') this.refreshHeroes();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Refresh
  // ══════════════════════════════════════════════════════════════════════

  private refreshAll() {
    this.refreshHeader();
    this.refreshRaid();
    if (this.view === 'heroes') this.refreshHeroes();
    if (this.view === 'loot') this.refreshLoot();
  }

  private refreshHeader() {
    if (!this.profile) return;
    this.energyText.setText(`⚡${this.profile.energy}`);
    this.raidLvText.setText(String(this.profile.raidLevel));
  }

  private refreshRaid() {
    if (!this.battle || !this.profile) return;
    this.refreshBoss();
    this.refreshHeroSlots();
    this.refreshButtons();
    this.refreshStatsBar();
    this.refreshResultOverlay();
  }

  private refreshBoss() {
    if (!this.battle) return;
    const { boss } = this.battle;
    this.bossTitleText.setText(boss.title.toUpperCase());
    this.bossNameText.setText(boss.name);
    this.bossHpText.setText(`${fmt(boss.hp)}/${fmt(boss.maxHp)}`);
    this.bossHpFill.scaleX = clamp(boss.hp / boss.maxHp);
    if (this.textures.exists(boss.spriteKey)) {
      this.bossImage.setTexture(boss.spriteKey).setDisplaySize(112, 112);
    }
  }

  private refreshHeroSlots() {
    if (!this.battle) return;
    const { heroes, activeHeroIndex } = this.battle;
    const activeHero = getActiveHero(this.battle);

    heroes.forEach((hero, i) => {
      const slot = this.heroSlots[i];
      if (!slot) return;
      const dead = hero.hp <= 0;
      slot.icon.setFrame(hero.spriteFrame);
      slot.roleCircle.setFillStyle(dead ? COLORS.muted : (ROLE_COLOR[hero.role] ?? COLORS.warrior));
      slot.icon.setAlpha(dead ? 0.4 : 1);
      slot.hpFill.scaleX = clamp(hero.hp / hero.maxHp);
      slot.chargeFill.scaleX = clamp(hero.charge / 100);
      slot.bg.setAlpha(dead ? 0.5 : 1);
    });

    this.activeHighlight.clear();
    const activeSlot = this.heroSlots[activeHeroIndex];
    if (activeSlot && this.battle.status === 'active') {
      this.activeHighlight.lineStyle(3, 0xf97316, 1);
      this.activeHighlight.strokeRoundedRect(activeSlot.sx, activeSlot.sy, activeSlot.sw, activeSlot.sh, 8);
    }
    void activeHero; // suppress unused-var warning
  }

  private refreshButtons() {
    if (!this.battle) return;
    const active = this.battle.status === 'active';
    const activeHero = getActiveHero(this.battle);
    const skillReady = active && canUseSkill(activeHero);
    const ultReady   = active && canUseUltimate(activeHero);

    this.attackBtnBg.setFillStyle(active ? COLORS.btnPrimary : COLORS.btnDisabled);
    active ? this.attackBtnBg.setInteractive() : this.attackBtnBg.disableInteractive();

    this.skillBtnBg.setFillStyle(skillReady ? COLORS.btnSkill : COLORS.btnDisabled);
    skillReady ? this.skillBtnBg.setInteractive({ useHandCursor: true }) : this.skillBtnBg.disableInteractive();
    this.skillBtnText.setText((activeHero?.skillCooldown ?? 0) > 0 ? `CD:${activeHero!.skillCooldown}` : 'Skill');

    this.ultBtnBg.setFillStyle(ultReady ? COLORS.btnUlt : COLORS.btnDisabled);
    ultReady ? this.ultBtnBg.setInteractive({ useHandCursor: true }) : this.ultBtnBg.disableInteractive();
    this.ultBtnText.setText(ultReady ? '⚡ Ult' : 'Ult');
  }

  private refreshStatsBar() {
    if (!this.battle) return;
    const activeHero = getActiveHero(this.battle);
    const living = this.battle.heroes.filter((h) => h.hp > 0).length;
    this.statsHeroText.setText(activeHero?.name ?? '—');
    this.statsRoundText.setText(`${living}/5 · R${this.battle.round}`);

    if (this.statsExpanded && activeHero) {
      const vals = [
        `${Math.round(activeHero.hp)}/${activeHero.maxHp}`,
        String(activeHero.atk), String(activeHero.def),
        String(activeHero.mag), String(activeHero.res), String(activeHero.spd),
      ];
      vals.forEach((v, i) => this.statValueTexts[i]?.setText(v));
    }
  }

  private refreshResultOverlay() {
    if (!this.battle || !this.profile) return;
    const done = this.battle.status !== 'active';
    this.resultGroup.setVisible(done);

    if (done) {
      const won = this.battle.status === 'won';
      this.resultStatusText.setText(won ? 'RAID CLEARED' : 'RAID FAILED');
      this.resultDamageText.setText(fmt(this.battle.totalDamage));
      this.resultRewardsText.setText(
        this.lastRewards ? `+${this.lastRewards.gold} gold  ·  +${this.lastRewards.exp} EXP` : ''
      );

      const showNext = won;
      this.resultNextBg.setVisible(showNext);
      this.resultNextIcon.setVisible(showNext);
      this.resultNextName.setVisible(showNext);
      if (showNext) {
        const next = getBossAppearance(this.profile.raidLevel);
        this.resultNextIcon.setText(next.icon);
        this.resultNextName.setText(`Next: ${next.name}  ·  Lv ${this.profile.raidLevel}`);
      }
    }
  }

  private refreshHeroes() {
    if (!this.profile) return;
    this.heroCardRefs.forEach(({ heroId, levelText, btnBg }) => {
      const progress = getHeroProgress(this.profile!, heroId);
      const ready    = canUpgradeHero(this.profile!, heroId);
      levelText.setText(`${HEROES.find(h => h.id === heroId)?.role ?? ''} · Lv ${progress.level}`);
      btnBg.setFillStyle(ready ? COLORS.btnPrimary : COLORS.btnDisabled);
      ready ? btnBg.setInteractive({ useHandCursor: true }) : btnBg.disableInteractive();
    });
  }

  private refreshLoot() {
    if (!this.profile) return;
    const vals = [
      fmt(this.profile.bestRaidDamage),
      fmt(this.profile.totalRaidDamage),
      String(this.profile.raidLevel),
      String(this.profile.inventory.length),
    ];
    vals.forEach((v, i) => this.lootStatTexts[i]?.setText(v));

    this.lootItemsGroup.removeAll(true);
    const items = this.profile.inventory.slice(-8).reverse();
    items.forEach((item, i) => {
      const iy = i * 40;
      const ibg = this.add.graphics();
      ibg.fillStyle(0xf5f5f4); ibg.fillRoundedRect(PAD, iy + PAD, W - PAD * 2, 36, 6);
      const nameT = this.add.text(PAD * 2.5, iy + PAD + 8, item.name, {
        fontSize: '12px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
      });
      const bonusT = this.add.text(PAD * 2.5, iy + PAD + 22, `+${item.bonus} ${item.stat.toUpperCase()}`, {
        fontSize: '10px', fontFamily: FONT.sans, color: '#71717a',
      });
      const rarT = this.add.text(W - PAD * 2.5, iy + PAD + 18, item.rarity, {
        fontSize: '9px', fontStyle: 'bold', fontFamily: FONT.sans,
        color: '#' + (RARITY_COLOR[item.rarity] ?? COLORS.rarityCommon).toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5);
      this.lootItemsGroup.add([ibg, nameT, bonusT, rarT]);
    });

    if (items.length === 0) {
      this.lootItemsGroup.add(
        this.add.text(W / 2, 50, 'Clear raids to earn gear.', {
          fontSize: '13px', fontFamily: FONT.sans, color: '#a1a1aa',
        }).setOrigin(0.5)
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Hero detail
  // ══════════════════════════════════════════════════════════════════════

  private showDetail(heroId: string) {
    this.selectedHeroId = heroId;
    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero || !this.profile) return;

    const progress = getHeroProgress(this.profile, heroId);
    const stats    = getScaledStats(hero, progress.level);
    const cost     = getUpgradeCost(progress.level);
    const ready    = canUpgradeHero(this.profile, heroId);

    this.detailCircle.setFillStyle(ROLE_COLOR[hero.role] ?? COLORS.warrior);
    this.detailIconText.setText(hero.icon);
    this.detailHeroName.setText(hero.name);
    this.detailRoleLv.setText(`${hero.title} · ${hero.role} · Lv ${progress.level}`);
    this.detailRarityText.setColor(
      '#' + (RARITY_COLOR[hero.rarity] ?? COLORS.rarityCommon).toString(16).padStart(6, '0')
    );
    this.detailRarityText.setText(hero.rarity);

    [stats.hp, stats.atk, stats.def, stats.mag, stats.res, stats.spd]
      .forEach((v, i) => this.detailStatValues[i]?.setText(String(v)));

    this.detailSkillText.setText(`${hero.skill.name}\n${hero.skill.summary}`);
    this.detailUltText.setText(`${hero.ultimate.name}\n${hero.ultimate.summary}`);
    this.detailUpgradeBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
    ready ? this.detailUpgradeBg.setInteractive({ useHandCursor: true }) : this.detailUpgradeBg.disableInteractive();
    this.detailUpgradeText.setText(ready ? `Upgrade · ${cost} gold` : `Need ${cost} gold`);

    this.detailGroup.setVisible(true);
  }

  private hideDetail() {
    this.selectedHeroId = null;
    this.detailGroup.setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Action handlers
  // ══════════════════════════════════════════════════════════════════════

  private handleAction(action: BattleAction) {
    if (!this.profile || !this.battle || this.battle.status !== 'active') return;
    const activeHero = getActiveHero(this.battle);

    if (action === 'ultimate' && !canUseUltimate(activeHero)) return;
    if (action === 'skill'    && !canUseSkill(activeHero))    return;

    const prevHeroes = this.battle.heroes;
    const nextBattle = resolveHeroAction(this.battle, action);

    nextBattle.heroes.forEach((nextHero, i) => {
      const prev = prevHeroes[i];
      if (!prev) return;
      const diff = Math.round(nextHero.hp) - Math.round(prev.hp);
      if (Math.abs(diff) < 1) return;
      const isActorUlt = action === 'ultimate' && prev.id === (activeHero?.id ?? '');
      this.spawnFloat(i, Math.abs(diff), diff < 0 ? (isActorUlt ? 'ultimate' : 'damage') : 'heal');
    });
    if (action === 'ultimate' && activeHero) {
      const idx = this.battle.heroes.findIndex((h) => h.id === activeHero.id);
      const had = prevHeroes[idx]
        ? Math.abs(Math.round(nextBattle.heroes[idx]?.hp ?? 0) - Math.round(prevHeroes[idx]!.hp)) >= 1
        : false;
      if (!had) this.spawnFloat(idx, 0, 'ultimate');
    }

    this.battle = nextBattle;

    if (nextBattle.status === 'active') {
      this.refreshRaid();
      return;
    }

    const victory = nextBattle.status === 'won';
    const rewards = createBattleRewards(nextBattle.totalDamage, victory, this.profile.inventory.length);
    const nextProfile = applyBattleRewards(this.profile, rewards, nextBattle.totalDamage);
    this.lastRewards = rewards;
    this.profile = nextProfile;
    void persistKeeperSave(nextProfile);
    this.refreshAll();
  }

  private handleStartRaid() {
    if (!this.profile) return;
    if (this.profile.energy < ENERGY_COST) return;
    const nextProfile = {
      ...this.profile,
      energy: this.profile.energy - ENERGY_COST,
      updatedAt: new Date().toISOString(),
    };
    this.profile = nextProfile;
    void persistKeeperSave(nextProfile);
    this.battle = createBattleState(nextProfile);
    this.lastRewards = null;
    this.resultGroup.setVisible(false);
    this.setView('raid');
    this.refreshAll();
  }

  private handleDailyClaim() {
    if (!this.profile) return;
    const result = claimDailyReward(this.profile);
    if (!result.claimed) return;
    this.profile = result.save;
    void persistKeeperSave(result.save);
    this.refreshAll();
  }

  private handleUpgrade(heroId: string) {
    if (!this.profile) return;
    const result = upgradeHero(this.profile, heroId);
    if (!result.upgraded) return;
    this.profile = result.save;
    void persistKeeperSave(result.save);
    if (!this.battle || this.battle.status !== 'active') {
      this.battle = createBattleState(result.save);
    }
    this.refreshAll();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Combat effects
  // ══════════════════════════════════════════════════════════════════════

  private spawnFloat(slotIndex: number, value: number, kind: 'damage' | 'heal' | 'ultimate') {
    const slot = this.heroSlots[slotIndex];
    if (!slot) return;

    const label  = kind === 'damage' ? `-${value}` : kind === 'heal' ? `+${value}` : '⚡';
    const color  = kind === 'damage' ? '#ef4444'   : kind === 'heal' ? '#60a5fa'   : '#fbbf24';

    const floatText = this.add
      .text(slot.iconCX, slot.iconCY - HERO_CIRCLE_R, label, {
        fontSize: kind === 'ultimate' ? '18px' : '13px',
        fontStyle: 'bold',
        fontFamily: kind === 'ultimate' ? FONT.emoji : FONT.sans,
        color,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(15);

    this.tweens.add({
      targets: floatText,
      y: slot.iconCY - HERO_CIRCLE_R - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.Out',
      onComplete: () => floatText.destroy(),
    });
  }
}
