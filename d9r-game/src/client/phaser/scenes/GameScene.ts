import Phaser from 'phaser';
import { context } from '@devvit/web/client';
import { COLORS, FONT, H, HEADER_H, PAD, RARITY_COLOR, W } from '../constants';
import {
  DAMAGE_EFFECT_KEY,
  HERO_SPRITE_CONFIG,
  HUD_KEY,
  TITLE_SCREEN_KEY,
} from './BootScene';
import type { HeroSpriteConfig } from './BootScene';
import { loadKeeperSave, persistKeeperSave } from '../../keeper/api';
import {
  HEROES,
  getHeroSkillChoicesForLevel,
  getNextHeroSkillUnlock,
} from '../../../shared/game/data/heroes';
import {
  RAID_NODES,
  getBossAppearance,
  getRaidNode,
} from '../../../shared/game/data/raidBosses';
import {
  DAILY_REWARD,
  HERO_GEM_UPGRADE_COST,
  HERO_STAR_MAX,
  LOOT_TOKEN_UPGRADE_COST,
  LOOT_BONUS_LEVEL_MAX,
  applyBattleRewards,
  canClaimDailyReward,
  canUpgradeHero,
  canUpgradeHeroWithGem,
  canUpgradeLootWithToken,
  claimDailyReward,
  createInitialPlayerSave,
  createBattleRewards,
  getEffectiveHeroRarity,
  getHeroProgress,
  getScaledStats,
  getUpgradeCost,
  isHeroFullyUpgraded,
  upgradeHero,
  upgradeHeroWithGem,
  upgradeLootWithToken,
} from '../../../shared/game/logic/progression';
import {
  MAX_LOGS,
  canUseSkill,
  canUseUltimate,
  createBattleState,
  getActiveHero,
  resolveHeroAction,
} from '../../../shared/game/logic/combat';
import type {
  BattleAction,
  BattleHero,
  BattleLogEntry,
  BattleState,
  HeroSkill,
  HeroPose,
  HeroTemplate,
  PlayerSave,
  RewardBundle,
} from '../../../shared/game/types';

type View = 'title' | 'map' | 'party' | 'raid' | 'heroes' | 'loot' | 'help';

const ENERGY_COST = 10;
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtCompact = (n: number) =>
  Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.round(n));
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// ── Layout (no tab bar) ────────────────────────────────────────────────────
const GAME_Y = HEADER_H + PAD; // 60
const STAGE_X = PAD; // 8
const STAGE_Y = GAME_Y; // 60
const STAGE_W = W - PAD * 2; // 414
const STAGE_H = 504;
const INFO_BAR_H = 52;
const ACTION_H = 64;
const BOSS_AREA_W = Math.floor(STAGE_W * 0.52);
const HERO_AREA_X = STAGE_X + BOSS_AREA_W + PAD;
const HERO_AREA_W = STAGE_W - BOSS_AREA_W - PAD;
const CONTENT_H = STAGE_H - INFO_BAR_H - PAD - ACTION_H - PAD;
const HERO_SLOT_H = Math.floor((CONTENT_H - 4 * 5) / 5);
const HERO_SPRITE_SIZE = 72;
const HERO_BAR_X_OFF = HERO_SPRITE_SIZE - 2;
const STATS_BAR_Y = STAGE_Y + STAGE_H + PAD;
const HERO_FRAME_DISPLAY_W = 70;
const HERO_FRAME_DISPLAY_H = 70;
const FALLBACK_HERO_ID = 'snoo-vanguard';
const COMMON_HERO_POSE_COL: Record<HeroPose, number> = {
  idle: 0,
  walk1: 0,
  walk2: 0,
  attack: 1,
  cast: 2,
  hit: 0,
  ko: 3,
  victory: 4,
};

const DEVOPS_HERO_POSE_COL: Record<HeroPose, number> = {
  ...COMMON_HERO_POSE_COL,
  hit: 3,
  ko: 4,
  victory: 5,
};

type HeroSlotRef = {
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

type HeroCardRef = {
  heroId: string;
  levelText: Phaser.GameObjects.Text;
  rarityText: Phaser.GameObjects.Text;
  btnBg: Phaser.GameObjects.Rectangle;
  partyBg: Phaser.GameObjects.Rectangle;
  partyText: Phaser.GameObjects.Text;
  gemBg: Phaser.GameObjects.Rectangle;
  gemText: Phaser.GameObjects.Text;
};

type MapNodeRef = {
  level: number;
  bg: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Arc;
};

type PartyHeroRef = {
  heroId: string;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
};

type RaidRun = {
  nodeLevel: number;
  battleIndex: number;
  battleCount: number;
  totalDamage: number;
  party: string[];
};

type SkillChoiceRef = {
  hit: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  summaryText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
};

export class GameScene extends Phaser.Scene {
  // State
  private profile: PlayerSave | null = null;
  private battle: BattleState | null = null;
  private view: View = 'title';
  private lastRewards: RewardBundle | null = null;
  private selectedHeroId: string | null = null;
  private username = 'player';
  private settingsPanelOpen = false;
  private selectedRaidLevel = 1;
  private selectedParty: string[] = [];
  private raidRun: RaidRun | null = null;

  // Containers
  private titleGroup!: Phaser.GameObjects.Container;
  private mapGroup!: Phaser.GameObjects.Container;
  private partyGroup!: Phaser.GameObjects.Container;
  private helpGroup!: Phaser.GameObjects.Container;
  private headerGroup!: Phaser.GameObjects.Container;
  private raidGroup!: Phaser.GameObjects.Container;
  private heroesGroup!: Phaser.GameObjects.Container;
  private lootGroup!: Phaser.GameObjects.Container;
  private settingsGroup!: Phaser.GameObjects.Container;
  private resultGroup!: Phaser.GameObjects.Container;
  private detailGroup!: Phaser.GameObjects.Container;
  private skillChoiceGroup!: Phaser.GameObjects.Container;
  private newGameConfirmGroup!: Phaser.GameObjects.Container;

  // Header
  private resourceText!: Phaser.GameObjects.Text;
  private raidLvText!: Phaser.GameObjects.Text;

  // Boss
  private bossAura!: Phaser.GameObjects.Arc;
  private bossImage!: Phaser.GameObjects.Image;
  private bossTitleText!: Phaser.GameObjects.Text;
  private bossNameText!: Phaser.GameObjects.Text;
  private bossHpText!: Phaser.GameObjects.Text;
  private bossHpFill!: Phaser.GameObjects.Rectangle;
  private bossCX = 0;
  private bossCY = 0;

  // Hero slots
  private heroSlots: HeroSlotRef[] = [];
  private activeHighlight!: Phaser.GameObjects.Graphics;
  private activeTween: Phaser.Tweens.Tween | null = null;

  // Action buttons
  private attackBtnBg!: Phaser.GameObjects.Rectangle;
  private attackBtnText!: Phaser.GameObjects.Text;
  private skillBtnBg!: Phaser.GameObjects.Rectangle;
  private skillBtnText!: Phaser.GameObjects.Text;
  private ultBtnBg!: Phaser.GameObjects.Rectangle;
  private ultBtnText!: Phaser.GameObjects.Text;

  // Battle log
  private battleLogLines: Phaser.GameObjects.Text[] = [];
  private battleLogHeader!: Phaser.GameObjects.Text;

  // Settings panel
  private settingsCurrTexts: Phaser.GameObjects.Text[] = [];
  private settingsNavBtns: Phaser.GameObjects.Rectangle[] = [];
  private dailyActBg!: Phaser.GameObjects.Graphics;
  private dailyActHit!: Phaser.GameObjects.Rectangle;
  private dailyActText!: Phaser.GameObjects.Text;
  private dailyActSubText!: Phaser.GameObjects.Text;

  // Result overlay
  private resultStatusText!: Phaser.GameObjects.Text;
  private resultDamageText!: Phaser.GameObjects.Text;
  private resultRewardsText!: Phaser.GameObjects.Text;
  private resultNextBg!: Phaser.GameObjects.Graphics;
  private resultNextIcon!: Phaser.GameObjects.Text;
  private resultNextName!: Phaser.GameObjects.Text;

  // Heroes view
  private heroCardRefs: HeroCardRef[] = [];
  private mapNodeRefs: MapNodeRef[] = [];
  private partyHeroRefs: PartyHeroRef[] = [];
  private partyStartBg!: Phaser.GameObjects.Rectangle;
  private partyStartText!: Phaser.GameObjects.Text;
  private partyTitleText!: Phaser.GameObjects.Text;

  // Hero detail sheet
  private detailHeroName!: Phaser.GameObjects.Text;
  private detailRoleLv!: Phaser.GameObjects.Text;
  private detailRarityText!: Phaser.GameObjects.Text;
  private detailStatValues: Phaser.GameObjects.Text[] = [];
  private detailSkillText!: Phaser.GameObjects.Text;
  private detailUltText!: Phaser.GameObjects.Text;
  private detailUpgradeBg!: Phaser.GameObjects.Rectangle;
  private detailUpgradeText!: Phaser.GameObjects.Text;
  private detailHeroIcon!: Phaser.GameObjects.Image;
  private skillChoiceHeroText!: Phaser.GameObjects.Text;
  private skillChoiceRefs: SkillChoiceRef[] = [];

  // Loot view
  private lootStatTexts: Phaser.GameObjects.Text[] = [];
  private lootItemsGroup!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Game' });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════

  async create() {
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.pageBg);
    this.username = context.username ?? 'player';

    this.titleGroup = this.add.container(0, 0).setDepth(4);
    this.mapGroup = this.add.container(0, 0).setDepth(2);
    this.partyGroup = this.add.container(0, 0).setDepth(2);
    this.helpGroup = this.add.container(0, 0).setDepth(22);
    this.raidGroup = this.add.container(0, 0).setDepth(2);
    this.heroesGroup = this.add.container(0, 0).setDepth(2);
    this.lootGroup = this.add.container(0, 0).setDepth(2);

    this.buildTitleView();
    this.buildHeader();
    this.buildMapView();
    this.buildPartyView();
    this.buildRaidView();
    this.buildHeroesView();
    this.buildLootView();
    this.buildHelpView();
    this.buildSettingsPanel();
    this.buildResultOverlay();
    this.buildDetailSheet();
    this.buildSkillChoiceOverlay();
    this.buildNewGameConfirmOverlay();

    this.setView('title');

    this.profile = await loadKeeperSave(this.username);
    this.selectedParty = this.profile.party.slice(0, 5);
    this.refreshAll();
  }

  private buildTitleView() {
    const bg = this.add
      .image(W / 2, H / 2, TITLE_SCREEN_KEY)
      .setDisplaySize(W, H)
      .setOrigin(0.5);

    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.08);

    const makeButton = (y: number, label: string, onClick: () => void) => {
      const bgRect = this.add
        .rectangle(W / 2, y, 238, 46, COLORS.ink, 0.88)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(W / 2, y, label, {
          fontSize: '15px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      bgRect.on('pointerdown', onClick);
      this.titleGroup.add([bgRect, text]);
    };

    this.titleGroup.add([bg, shade]);
    makeButton(520, 'New Game', () => this.showNewGameConfirm());
    makeButton(574, 'Continue', () => this.handleContinue());
    makeButton(628, 'Help', () => this.setView('help'));
  }

  private buildMapView() {
    const title = this.add
      .text(W / 2, GAME_Y + 4, 'Corporate Raid Map', {
        fontSize: '20px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5, 0);
    const subtitle = this.add
      .text(W / 2, GAME_Y + 30, 'Clear each node to unlock the boss above it.', {
        fontSize: '11px',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(0.5, 0);

    const path = this.add.graphics();
    path.lineStyle(5, 0x94a3b8, 0.42);

    const nodePoints = RAID_NODES.map((node, index) => ({
      level: node.level,
      x: W / 2 + (index % 2 === 0 ? -54 : 54),
      y: 650 - index * 92,
    }));

    nodePoints.forEach((point, index) => {
      const next = nodePoints[index + 1];
      if (!next) return;
      path.lineBetween(point.x, point.y, next.x, next.y);
    });

    this.mapGroup.add([path, title, subtitle]);

    nodePoints.forEach((point) => {
      const node = getRaidNode(point.level);
      const boss = getBossAppearance(point.level, node.bossId);
      const ring = this.add.graphics();
      const bg = this.add
        .circle(point.x, point.y, 34, COLORS.white)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(point.x, point.y - 8, boss.icon, {
          fontSize: boss.icon.length > 2 ? '12px' : '15px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
        })
        .setOrigin(0.5);
      const subLabel = this.add
        .text(point.x, point.y + 13, `Lv ${point.level}`, {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#52525b',
        })
        .setOrigin(0.5);
      const name = this.add
        .text(point.x, point.y + 42, node.name, {
          fontSize: '10px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#3f3f46',
          wordWrap: { width: 116 },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      bg.on('pointerdown', () => this.openPartySelect(point.level));
      this.mapGroup.add([ring, bg, label, subLabel, name]);
      this.mapNodeRefs.push({
        level: point.level,
        bg,
        ring,
        label,
        subLabel,
        hit: bg,
      });
    });

    const heroesBtn = this.add
      .rectangle(PAD + 48, H - 34, 88, 38, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    heroesBtn.on('pointerdown', () => this.setView('heroes'));
    const heroesText = this.add
      .text(PAD + 48, H - 34, 'Heroes', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const lootBtn = this.add
      .rectangle(W - PAD - 48, H - 34, 88, 38, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    lootBtn.on('pointerdown', () => this.setView('loot'));
    const lootText = this.add
      .text(W - PAD - 48, H - 34, 'Loot', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.mapGroup.add([heroesBtn, heroesText, lootBtn, lootText]);
  }

  private buildPartyView() {
    const back = this.add
      .text(PAD, GAME_Y + 2, '< Map', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#2563eb',
      })
      .setInteractive({ useHandCursor: true })
      .setOrigin(0, 0);
    back.on('pointerdown', () => this.setView('map'));

    this.partyTitleText = this.add
      .text(W / 2, GAME_Y + 2, 'Choose 5 Heroes', {
        fontSize: '18px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5, 0);

    const cardW = Math.floor((W - PAD * 3) / 2);
    const cardH = 82;
    const startY = GAME_Y + 48;

    HEROES.forEach((hero, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = PAD + col * (cardW + PAD);
      const y = startY + row * (cardH + PAD);

      const bg = this.add
        .rectangle(x + cardW / 2, y + cardH / 2, cardW, cardH, COLORS.white)
        .setInteractive({ useHandCursor: true });
      const sprite = this.add
        .image(x + 39, y + 40, this.getHeroSpriteKey(hero.id))
        .setDisplaySize(62, 62)
        .setOrigin(0.5);
      this.setHeroPose(sprite, hero.id, 'idle');
      const label = this.add
        .text(x + 76, y + 13, hero.name, {
          fontSize: '11px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
          wordWrap: { width: cardW - 86 },
        })
        .setOrigin(0, 0);
      const subLabel = this.add
        .text(x + 76, y + 48, hero.role, {
          fontSize: '10px',
          fontFamily: FONT.sans,
          color: '#71717a',
        })
        .setOrigin(0, 0);
      const check = this.add
        .text(x + cardW - 16, y + 12, '', {
          fontSize: '15px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#16a34a',
        })
        .setOrigin(0.5);
      bg.on('pointerdown', () => this.toggleSelectedPartyHero(hero.id));
      this.partyGroup.add([bg, sprite, label, subLabel, check]);
      this.partyHeroRefs.push({ heroId: hero.id, bg, label, subLabel, check });
    });

    this.partyStartBg = this.add
      .rectangle(W / 2, H - 56, W - PAD * 2, 46, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    this.partyStartBg.on('pointerdown', () => this.handleStartRaid());
    this.partyStartText = this.add
      .text(W / 2, H - 56, 'Start Raid', {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.partyGroup.add([back, this.partyTitleText, this.partyStartBg, this.partyStartText]);
  }

  private buildHelpView() {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x111827, 0.9);
    const title = this.add
      .text(W / 2, 92, 'D9 Raid Keeper', {
        fontSize: '26px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        PAD * 3,
        142,
        [
          'A team of five developer-knights climbs the corporate hierarchy to stop the next layoff wave.',
          '',
          'Clear raid nodes from bottom to top. Each node contains a short chain of battles. If the team falls, gems still pay out based on how many battles were cleared.',
          '',
          `Use gems to recruit heroes. Duplicate heroes raise rarity; duplicates at Legendary convert into gold.`,
        ].join('\n'),
        {
          fontSize: '14px',
          fontFamily: FONT.sans,
          color: '#e5e7eb',
          wordWrap: { width: W - PAD * 6 },
          lineSpacing: 8,
        }
      )
      .setOrigin(0, 0);
    const backBg = this.add
      .rectangle(W / 2, H - 88, 220, 44, COLORS.white)
      .setInteractive({ useHandCursor: true });
    const backText = this.add
      .text(W / 2, H - 88, 'Back', {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#111827',
      })
      .setOrigin(0.5);
    backBg.on('pointerdown', () => this.setView('title'));
    this.helpGroup.add([overlay, title, body, backBg, backText]);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Header
  // ══════════════════════════════════════════════════════════════════════

  private buildHeader() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    objs.push(
      this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, COLORS.headerBg)
    );
    objs.push(this.add.rectangle(W / 2, HEADER_H - 1, W, 1, COLORS.border));

    // ⚙️ gear icon — left
    const gear = this.add
      .text(PAD + 16, HEADER_H / 2, '⚙️', {
        fontSize: '26px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSettingsPanel());
    objs.push(gear);

    this.resourceText = this.add
      .text(PAD + 42, 10, 'Gold 0   Tok 0\nGem 0    EN 0', {
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(0, 0)
      .setLineSpacing(2)
      .setWordWrapWidth(W - 122);
    objs.push(this.resourceText);

    // RAID level badge — far right
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(COLORS.ink);
    badgeBg.fillRoundedRect(W - 52, (HEADER_H - 34) / 2, 44, 34, 6);
    objs.push(badgeBg);

    objs.push(
      this.add
      .text(W - 30, HEADER_H / 2 - 8, 'RAID', {
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5)
    );

    this.raidLvText = this.add
      .text(W - 30, HEADER_H / 2 + 8, '1', {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    objs.push(this.raidLvText);

    this.headerGroup = this.add.container(0, 0, objs).setDepth(8);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Settings Panel  (nav + currency — ALL in one container)
  // ══════════════════════════════════════════════════════════════════════

  private buildSettingsPanel() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    // Full-screen dim overlay
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
      .setInteractive();
    overlay.on('pointerdown', () => this.toggleSettingsPanel());
    objs.push(overlay);

    const panelX = PAD * 2;
    const panelY = HEADER_H + PAD;
    const panelW = W - PAD * 4;
    const panelH = 370;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.white);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panelBg.lineStyle(1, COLORS.border, 1);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
    objs.push(panelBg);

    // Title
    objs.push(
      this.add
        .text(panelX + PAD * 2, panelY + 14, 'D9 Raid Keeper', {
          fontSize: '18px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
        })
        .setOrigin(0, 0)
    );

    // Currency tiles row
    const currLabels = ['Gold', 'Gems', 'Energy', 'Tokens'];
    const tileW = (panelW - PAD * 5) / 4;
    const tilesY = panelY + 50;
    const currTexts: Phaser.GameObjects.Text[] = [];

    currLabels.forEach((lbl, i) => {
      const tx = panelX + PAD + i * (tileW + PAD);

      const bg = this.add.graphics();
      bg.fillStyle(0xf5f5f5);
      bg.fillRoundedRect(tx, tilesY, tileW, 54, 6);
      objs.push(bg);

      objs.push(
        this.add
          .text(tx + tileW / 2, tilesY + 11, lbl.toUpperCase(), {
            fontSize: '9px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#71717a',
          })
          .setOrigin(0.5, 0)
      );

      const val = this.add
        .text(tx + tileW / 2, tilesY + 27, '0', {
          fontSize: '14px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
        })
        .setOrigin(0.5, 0);
      objs.push(val);
      currTexts.push(val);
    });
    this.settingsCurrTexts = currTexts;

    // Section divider label
    objs.push(
      this.add
        .text(panelX + PAD * 2, tilesY + 62, 'NAVIGATE', {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        })
        .setOrigin(0, 0)
    );

    // Nav buttons
    const navY = tilesY + 78;
    const navH = 48;
    const navBtnW = (panelW - PAD * 4) / 3;
    const views: View[] = ['map', 'heroes', 'loot'];
    const navIcons = ['🗺️', '🧙', '🎁'];
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
        this.add
          .text(bx + navBtnW / 2, navY + navH / 2 - 8, navIcons[i] ?? '', {
            fontSize: '18px',
            fontFamily: FONT.emoji,
          })
          .setOrigin(0.5)
      );
      objs.push(
        this.add
          .text(
            bx + navBtnW / 2,
            navY + navH / 2 + 11,
            v.charAt(0).toUpperCase() + v.slice(1),
            {
              fontSize: '11px',
              fontStyle: 'bold',
              fontFamily: FONT.sans,
              color: '#ffffff',
            }
          )
          .setOrigin(0.5)
      );
    });
    this.settingsNavBtns = navBtns;

    // Action buttons row
    const actLblY = navY + navH + PAD * 2;
    objs.push(
      this.add
        .text(panelX + PAD * 2, actLblY, 'ACTIONS', {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        })
        .setOrigin(0, 0)
    );

    const actionBtnY = actLblY + 18;
    const actionBtnH = 42;
    const actionBtnW = panelW - PAD * 2; // full width

    this.dailyActBg = this.add.graphics();
    this.dailyActBg.fillStyle(COLORS.btnGreen);
    this.dailyActBg.fillRoundedRect(
      panelX + PAD,
      actionBtnY,
      actionBtnW,
      actionBtnH,
      6
    );
    objs.push(this.dailyActBg);
    this.dailyActHit = this.add
      .rectangle(
        panelX + PAD + actionBtnW / 2,
        actionBtnY + actionBtnH / 2,
        actionBtnW,
        actionBtnH,
        0,
        0
      )
      .setInteractive({ useHandCursor: true });
    this.dailyActHit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      this.handleDailyClaim();
    });
    objs.push(this.dailyActHit);
    this.dailyActText = this.add
      .text(panelX + PAD + actionBtnW / 2, actionBtnY + 13, 'Daily Reward', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.dailyActSubText = this.add
      .text(
        panelX + PAD + actionBtnW / 2,
        actionBtnY + 29,
        `+${DAILY_REWARD.gold}🪙 +${DAILY_REWARD.gems}💎 +${DAILY_REWARD.energy}⚡`,
        {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.emoji,
          color: '#dcfce7',
        }
      )
      .setOrigin(0.5);
    objs.push(this.dailyActText, this.dailyActSubText);

    objs.push(
      this.add
        .text(
          panelX + panelW / 2,
          actionBtnY + actionBtnH + PAD * 2,
          'tap outside to close',
          {
            fontSize: '11px',
            fontFamily: FONT.sans,
            color: '#a1a1aa',
          }
        )
        .setOrigin(0.5, 0)
    );

    this.settingsGroup = this.add
      .container(0, 0, objs)
      .setDepth(28)
      .setVisible(false);
  }

  private toggleSettingsPanel() {
    this.settingsPanelOpen = !this.settingsPanelOpen;
    this.settingsGroup.setVisible(this.settingsPanelOpen);

    if (this.settingsPanelOpen && this.profile) {
      const vals = [
        this.profile.gold,
        this.profile.gems,
        this.profile.energy,
        this.profile.raidTokens,
      ];
      vals.forEach((v, i) => this.settingsCurrTexts[i]?.setText(fmt(v)));
      this.refreshDailyAction();

      const views: View[] = ['raid', 'heroes', 'loot'];
      views.forEach((v, i) => {
        this.settingsNavBtns[i]?.setFillStyle(
          v === this.view ? COLORS.btnSkill : COLORS.ink
        );
      });
    }
  }

  private refreshDailyAction() {
    if (!this.profile) return;

    const available = canClaimDailyReward(this.profile);
    this.dailyActBg.setAlpha(available ? 1 : 0.42);
    this.dailyActText.setText(available ? 'Daily Reward' : 'Claimed Today');
    this.dailyActSubText.setText(
      available
        ? `+${DAILY_REWARD.gold}🪙 +${DAILY_REWARD.gems}💎 +${DAILY_REWARD.energy}⚡`
        : 'Resets tomorrow'
    );
    if (available) {
      this.dailyActHit.setInteractive({ useHandCursor: true });
    } else {
      this.dailyActHit.disableInteractive();
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
    this.buildBattleLog();
  }

  private buildBattleField() {
    const bgImg = this.add
      .image(STAGE_X + STAGE_W / 2, STAGE_Y + STAGE_H / 2, 'battle-bg')
      .setDisplaySize(STAGE_W, STAGE_H)
      .setOrigin(0.5);

    this.raidGroup.add(bgImg);
  }

  private buildBossInfoBar() {
    const bx = STAGE_X + PAD;
    const by = STAGE_Y + PAD;
    const bw = STAGE_W - PAD * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.94);
    bg.fillRoundedRect(bx, by, bw, INFO_BAR_H, 6);

    this.bossTitleText = this.add
      .text(bx + PAD, by + 8, '', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#b91c1c',
      })
      .setOrigin(0, 0);

    this.bossNameText = this.add
      .text(bx + PAD, by + 20, '', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0, 0);

    this.bossHpText = this.add
      .text(bx + bw - PAD, by + 14, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(1, 0.5);

    const hpY = by + INFO_BAR_H - 11;
    const hpTrack = this.add
      .rectangle(bx + bw / 2, hpY, bw, 7, COLORS.track)
      .setOrigin(0.5);
    this.bossHpFill = this.add
      .rectangle(bx, hpY, bw, 7, COLORS.boss)
      .setOrigin(0, 0.5);

    this.raidGroup.add([
      bg,
      this.bossTitleText,
      this.bossNameText,
      this.bossHpText,
      hpTrack,
      this.bossHpFill,
    ]);
  }

  private buildBossSprite() {
    const contentY = STAGE_Y + INFO_BAR_H + PAD * 2;
    const contentH = STAGE_H - INFO_BAR_H - PAD * 2 - ACTION_H - PAD;
    const bossCX = STAGE_X + Math.floor(BOSS_AREA_W / 2);
    const bossCY = contentY + Math.floor(contentH / 2);
    const bossR = 56;
    this.bossCX = bossCX;
    this.bossCY = bossCY;

    this.bossAura = this.add.arc(
      bossCX,
      bossCY,
      bossR + 20,
      0,
      360,
      false,
      COLORS.boss,
      0.25
    );
    this.tweens.add({
      targets: this.bossAura,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.1,
      duration: 950,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    // Boss image — texture is set in refreshBoss(); display size fits the circle
    this.bossImage = this.add
      .image(bossCX, bossCY, 'boss-goo')
      .setDisplaySize(bossR * 2, bossR * 2)
      .setOrigin(0.5);

    this.raidGroup.add([this.bossAura, this.bossImage]);
  }

  private buildHeroSlotsUI() {
    const contentY = STAGE_Y + INFO_BAR_H + PAD * 2;
    const slotW = HERO_AREA_W - PAD;
    const textX = HERO_AREA_X + HERO_BAR_X_OFF;
    const stroke = { stroke: '#000000', strokeThickness: 3 };

    for (let i = 0; i < 5; i++) {
      const sx = HERO_AREA_X;
      const sy = contentY + i * (HERO_SLOT_H + 5);
      const cx = sx + HERO_SPRITE_SIZE / 2 - 2;
      const cy = sy + HERO_SLOT_H / 2;

      const icon = this.add
        .image(cx, cy, this.getHeroSpriteKey(FALLBACK_HERO_ID))
        .setDisplaySize(HERO_FRAME_DISPLAY_W, HERO_FRAME_DISPLAY_H)
        .setOrigin(0.5);
      this.setHeroPose(icon, FALLBACK_HERO_ID, 'idle');

      const hpText = this.add
        .text(textX, cy - 8, '—', {
          fontSize: '13px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
          ...stroke,
        })
        .setOrigin(0, 0.5);

      const lbText = this.add
        .text(textX, cy + 12, '—%', {
          fontSize: '11px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#fbbf24',
          ...stroke,
        })
        .setOrigin(0, 0.5);

      this.raidGroup.add([icon, hpText, lbText]);
      this.heroSlots.push({
        icon,
        hpText,
        lbText,
        objects: [icon, hpText, lbText],
        iconCX: cx,
        iconCY: cy,
        sx,
        sy,
        sw: slotW,
        sh: HERO_SLOT_H,
      });
    }
  }

  private buildActionButtons() {
    const btnY = STAGE_Y + STAGE_H - PAD - ACTION_H / 2;
    const btnW = Math.floor((STAGE_W - PAD * 4) / 3);
    const gap = Math.floor((STAGE_W - PAD * 2 - btnW * 3) / 2);
    const startX = STAGE_X + PAD + btnW / 2;

    const hud = this.add
      .image(STAGE_X + STAGE_W / 2, btnY, HUD_KEY)
      .setDisplaySize(STAGE_W - PAD * 2, ACTION_H)
      .setOrigin(0.5);
    this.raidGroup.add(hud);

    const makeBtn = (cx: number, label: string) => {
      const bg = this.add
        .rectangle(cx, btnY, btnW, ACTION_H - 18, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(cx, btnY, label, {
          fontSize: '13px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.raidGroup.add([bg, txt]);
      return [bg, txt] as const;
    };

    [this.attackBtnBg, this.attackBtnText] = makeBtn(startX, 'Attack');
    this.attackBtnBg.on('pointerdown', () => this.handleAction('attack'));

    [this.skillBtnBg, this.skillBtnText] = makeBtn(
      startX + btnW + gap,
      'Skill'
    );
    this.skillBtnBg.on('pointerdown', () => this.openSkillChoice());

    [this.ultBtnBg, this.ultBtnText] = makeBtn(
      startX + (btnW + gap) * 2,
      '⚡ Limit'
    );
    this.ultBtnBg.on('pointerdown', () => this.handleAction('ultimate'));
  }

  private buildActiveHighlight() {
    this.activeHighlight = this.add.graphics();
    this.raidGroup.add(this.activeHighlight);
  }

  private buildBattleLog() {
    const lbY = STATS_BAR_Y;
    const lbW = STAGE_W;
    const headerH = 22;
    const lineH = 22;
    const lbH = headerH + MAX_LOGS * lineH + PAD;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.statsBg);
    bg.fillRoundedRect(STAGE_X, lbY, lbW, lbH, 8);
    bg.lineStyle(1, COLORS.border, 1);
    bg.strokeRoundedRect(STAGE_X, lbY, lbW, lbH, 8);

    this.battleLogHeader = this.add
      .text(STAGE_X + PAD, lbY + 5, 'BATTLE LOG', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#a1a1aa',
      })
      .setOrigin(0, 0);

    const lines: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < MAX_LOGS; i++) {
      const lt = this.add
        .text(STAGE_X + PAD, lbY + headerH + i * lineH, '', {
          fontSize: '12px',
          fontFamily: FONT.sans,
          color: '#3f3f46',
          wordWrap: { width: lbW - PAD * 2 },
        })
        .setOrigin(0, 0);
      lines.push(lt);
    }
    this.battleLogLines = lines;

    this.raidGroup.add([bg, this.battleLogHeader, ...lines]);
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

    this.resultStatusText = this.add
      .text(panelCX, panelY + 20, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#c2410c',
      })
      .setOrigin(0.5, 0);
    objs.push(this.resultStatusText);

    this.resultDamageText = this.add
      .text(panelCX, panelY + 36, '', {
        fontSize: '32px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5, 0);
    objs.push(this.resultDamageText);

    this.resultRewardsText = this.add
      .text(panelCX, panelY + 82, '', {
        fontSize: '12px',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(0.5, 0);
    objs.push(this.resultRewardsText);

    // Next boss preview panel
    this.resultNextBg = this.add.graphics();
    this.resultNextBg.fillStyle(0xf5f5f5);
    this.resultNextBg.fillRoundedRect(
      PAD * 5,
      panelY + 106,
      panelW - PAD * 4,
      40,
      8
    );
    objs.push(this.resultNextBg);

    this.resultNextIcon = this.add
      .text(PAD * 7, panelY + 126, '', {
        fontSize: '22px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(0, 0.5);
    objs.push(this.resultNextIcon);

    this.resultNextName = this.add
      .text(PAD * 12, panelY + 126, '', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0, 0.5);
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
    nextBtnHit.on('pointerdown', () => this.setView('map'));
    objs.push(nextBtnHit);

    objs.push(
      this.add
        .text(panelCX, nextBtnY + 4, 'Back to map', {
          fontSize: '14px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );

    this.resultGroup = this.add
      .container(0, 0, objs)
      .setDepth(18)
      .setVisible(false);
  }

  private buildSkillChoiceOverlay() {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
      .setInteractive();
    overlay.on('pointerdown', () => this.hideSkillChoice());
    objs.push(overlay);

    const panelX = PAD * 2;
    const panelY = H - 264;
    const panelW = W - PAD * 4;
    const panelH = 220;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x111827, 0.92);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelBg.lineStyle(1, 0xf8fafc, 0.35);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    objs.push(panelBg);

    this.skillChoiceHeroText = this.add
      .text(panelX + PAD * 2, panelY + 14, 'Choose Skill', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0, 0);
    objs.push(this.skillChoiceHeroText);

    const close = this.add
      .text(panelX + panelW - PAD * 2, panelY + 14, 'Close', {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#cbd5e1',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.hideSkillChoice());
    objs.push(close);

    this.skillChoiceRefs = [0, 1].map((index) => {
      const cy = panelY + 70 + index * 72;
      const bg = this.add
        .image(W / 2, cy, HUD_KEY)
        .setDisplaySize(panelW - PAD * 2, 58)
        .setOrigin(0.5);
      const hit = this.add
        .rectangle(W / 2, cy, panelW - PAD * 2, 58, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        this.chooseSkill(index);
      });
      const nameText = this.add
        .text(panelX + PAD * 3, cy - 18, '', {
          fontSize: '12px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
          wordWrap: { width: panelW - PAD * 10 },
        })
        .setOrigin(0, 0);
      const summaryText = this.add
        .text(panelX + PAD * 3, cy, '', {
          fontSize: '10px',
          fontFamily: FONT.sans,
          color: '#bfdbfe',
          wordWrap: { width: panelW - PAD * 8 },
        })
        .setOrigin(0, 0);
      const metaText = this.add
        .text(panelX + panelW - PAD * 3, cy - 18, '', {
          fontSize: '10px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#fbbf24',
        })
        .setOrigin(1, 0);
      objs.push(bg, hit, nameText, summaryText, metaText);

      return {
        hit,
        nameText,
        summaryText,
        metaText,
      };
    });

    this.skillChoiceGroup = this.add
      .container(0, 0, objs)
      .setDepth(30)
      .setVisible(false);
  }

  private buildNewGameConfirmOverlay() {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.52)
      .setInteractive();
    overlay.on('pointerdown', () => this.hideNewGameConfirm());
    objs.push(overlay);

    const panelW = W - PAD * 6;
    const panelH = 190;
    const panelX = W / 2 - panelW / 2;
    const panelY = H / 2 - panelH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.white, 0.98);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(1, COLORS.border, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    objs.push(panel);

    objs.push(
      this.add
        .text(W / 2, panelY + 22, 'Start New Game?', {
          fontSize: '18px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
        })
        .setOrigin(0.5, 0)
    );
    objs.push(
      this.add
        .text(
          W / 2,
          panelY + 58,
          'Your current continue point will be replaced.',
          {
            fontSize: '12px',
            fontFamily: FONT.sans,
            color: '#52525b',
            wordWrap: { width: panelW - PAD * 4 },
            align: 'center',
          }
        )
        .setOrigin(0.5, 0)
    );

    const cancelBg = this.add
      .rectangle(W / 2 - 78, panelY + panelH - 42, 136, 40, 0xe5e7eb)
      .setInteractive({ useHandCursor: true });
    cancelBg.on('pointerdown', () => this.hideNewGameConfirm());
    const cancelText = this.add
      .text(W / 2 - 78, panelY + panelH - 42, 'Cancel', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0.5);
    const resetBg = this.add
      .rectangle(W / 2 + 78, panelY + panelH - 42, 136, 40, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    resetBg.on('pointerdown', () => this.confirmNewGame());
    const resetText = this.add
      .text(W / 2 + 78, panelY + panelH - 42, 'New Game', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    objs.push(cancelBg, cancelText, resetBg, resetText);

    this.newGameConfirmGroup = this.add
      .container(0, 0, objs)
      .setDepth(32)
      .setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Heroes View
  // ══════════════════════════════════════════════════════════════════════

  private buildHeroesView() {
    const topY = GAME_Y + PAD;

    // Hero cards grid (2 col × 3 row)
    const cardW = Math.floor((W - PAD * 3) / 2);
    const cardH = 104;
    const gridStartY = topY;

    HEROES.forEach((hero, i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const cx = PAD + col * (cardW + PAD);
      const cy = gridStartY + row * (cardH + PAD);
      this.buildHeroCard(hero, cx, cy, cardW, cardH);
    });
  }

  private buildHeroCard(
    hero: HeroTemplate,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const spriteSize = 64;
    const cx = x + PAD + spriteSize / 2;
    const cy = y + 37;
    const textX = x + PAD * 2 + spriteSize;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(COLORS.white);
    cardBg.fillRoundedRect(x, y, w, h, 8);
    cardBg.lineStyle(1, COLORS.border, 1);
    cardBg.strokeRoundedRect(x, y, w, h, 8);

    const hitArea = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.showDetail(hero.id));

    const iconT = this.add
      .image(cx, cy, this.getHeroSpriteKey(hero.id))
      .setOrigin(0.5);
    this.setHeroPose(iconT, hero.id, 'idle');
    const heroConfig = this.getHeroSpriteConfig(hero.id);
    iconT.setScale(spriteSize / heroConfig.frameW);

    const nameText = this.add
      .text(textX, y + 10, hero.name, {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: w - spriteSize - PAD * 3 },
      })
      .setOrigin(0, 0);

    const levelText = this.add
      .text(textX, y + 29, `${hero.role} · Lv 1`, {
        fontSize: '10px',
        fontFamily: FONT.sans,
        color: '#71717a',
      })
      .setOrigin(0, 0);

    const rarityText = this.add
      .text(textX, y + 45, hero.rarity, {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color:
          '#' +
          (RARITY_COLOR[hero.rarity] ?? COLORS.rarityCommon)
            .toString(16)
            .padStart(6, '0'),
      })
      .setOrigin(0, 0);

    // 3 buttons: Party | Upgrade (gold) | Gem
    const totalBtnW = w - PAD * 2;
    const btnW3 = Math.floor(totalBtnW / 3) - 2;
    const btnY = y + h - PAD - 12;
    const btn1X = x + PAD + btnW3 / 2;
    const btn2X = btn1X + btnW3 + 4;
    const btn3X = btn2X + btnW3 + 4;

    const partyBg = this.add
      .rectangle(btn1X, btnY, btnW3, 22, COLORS.btnSkill)
      .setInteractive({ useHandCursor: true });
    const partyText = this.add
      .text(btn1X, btnY, 'Party', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    partyBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      this.handleToggleParty(hero.id);
    });

    const btnBg = this.add
      .rectangle(btn2X, btnY, btnW3, 22, COLORS.ink)
      .setInteractive({ useHandCursor: true });
    const btnTxt = this.add
      .text(btn2X, btnY, '⬆ Gold', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    btnBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      this.handleUpgrade(hero.id);
    });

    const gemBg = this.add
      .rectangle(btn3X, btnY, btnW3, 22, 0x7c3aed)
      .setInteractive({ useHandCursor: true });
    const gemText = this.add
      .text(btn3X, btnY, '💎 Gem', {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    gemBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      ptr.event.stopPropagation();
      this.handleGemUpgrade(hero.id);
    });

    this.heroesGroup.add([
      cardBg,
      hitArea,
      iconT,
      nameText,
      levelText,
      rarityText,
      partyBg,
      partyText,
      btnBg,
      btnTxt,
      gemBg,
      gemText,
    ]);
    this.heroCardRefs.push({
      heroId: hero.id,
      levelText,
      rarityText,
      btnBg,
      partyBg,
      partyText,
      gemBg,
      gemText,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Build: Hero Detail Sheet  (ALL in detailGroup)
  // ══════════════════════════════════════════════════════════════════════

  private buildDetailSheet() {
    const objs: Phaser.GameObjects.GameObject[] = [];

    const sheetH = 348;
    const sheetY = H - sheetH;

    // Dim overlay
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.55)
      .setInteractive();
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
    const closeHit = this.add
      .rectangle(W - PAD * 2 - 14, sheetY + 20, 32, 32, 0, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.hideDetail());
    objs.push(closeHit);
    objs.push(
      this.add
        .text(W - PAD * 2 - 14, sheetY + 20, '✕', {
          fontSize: '13px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#52525b',
        })
        .setOrigin(0.5)
    );

    this.detailHeroIcon = this.add
      .image(PAD * 2 + 28, sheetY + 28, this.getHeroSpriteKey(FALLBACK_HERO_ID))
      .setOrigin(0.5);
    this.setHeroPose(this.detailHeroIcon, FALLBACK_HERO_ID, 'idle');
    this.detailHeroIcon.setScale(64 / this.getHeroSpriteConfig(FALLBACK_HERO_ID).frameW);
    objs.push(this.detailHeroIcon);

    // Hero name / role / rarity
    this.detailHeroName = this.add
      .text(PAD * 4 + 56, sheetY + 12, '', {
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      })
      .setOrigin(0, 0);
    objs.push(this.detailHeroName);

    this.detailRoleLv = this.add
      .text(PAD * 4 + 56, sheetY + 30, '', {
        fontSize: '11px',
        fontFamily: FONT.sans,
        color: '#71717a',
      })
      .setOrigin(0, 0);
    objs.push(this.detailRoleLv);

    this.detailRarityText = this.add
      .text(PAD * 4 + 56, sheetY + 46, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#7c3aed',
      })
      .setOrigin(0, 0);
    objs.push(this.detailRarityText);

    // Stats grid (3 col × 2 row)
    const statLabels = ['HP', 'ATK', 'DEF', 'MAG', 'RES', 'SPD'];
    const statTileW = (W - PAD * 4) / 3;
    const statTileH = 36;
    const statsY = sheetY + 72;
    const statValueTexts: Phaser.GameObjects.Text[] = [];

    statLabels.forEach((lbl, i) => {
      const col = i % 3,
        row = Math.floor(i / 3);
      const tx = PAD + col * (statTileW + PAD);
      const ty = statsY + row * (statTileH + 4);

      const tileBg = this.add.graphics();
      tileBg.fillStyle(0xf5f5f4);
      tileBg.fillRoundedRect(tx, ty, statTileW, statTileH, 6);
      objs.push(tileBg);

      objs.push(
        this.add
          .text(tx + PAD, ty + 5, lbl, {
            fontSize: '9px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#374151',
          })
          .setOrigin(0, 0)
      );

      const val = this.add
        .text(tx + PAD, ty + 17, '—', {
          fontSize: '14px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#111827',
        })
        .setOrigin(0, 0);
      statValueTexts.push(val);
      objs.push(val);
    });
    this.detailStatValues = statValueTexts;

    // Skill / Ultimate panels
    const skillY = statsY + statTileH * 2 + 12;
    const halfW = (W - PAD * 3) / 2;

    const skillBg = this.add.graphics();
    skillBg.fillStyle(0xfff7ed);
    skillBg.fillRoundedRect(PAD, skillY, halfW, 52, 8);
    objs.push(skillBg);
    objs.push(
      this.add
        .text(PAD + 6, skillY + 7, 'SKILL', {
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#c2410c',
        })
        .setOrigin(0, 0)
    );
    this.detailSkillText = this.add
      .text(PAD + 6, skillY + 20, '', {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: halfW - 12 },
      })
      .setOrigin(0, 0);
    objs.push(this.detailSkillText);

    const ultBg = this.add.graphics();
    ultBg.fillStyle(0xeef2ff);
    ultBg.fillRoundedRect(PAD * 2 + halfW, skillY, halfW, 52, 8);
    objs.push(ultBg);
    objs.push(
      this.add
        .text(PAD * 2 + halfW + 6, skillY + 7, 'ULTIMATE', {
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#4338ca',
        })
        .setOrigin(0, 0)
    );
    this.detailUltText = this.add
      .text(PAD * 2 + halfW + 6, skillY + 20, '', {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: halfW - 12 },
      })
      .setOrigin(0, 0);
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

    this.detailUpgradeText = this.add
      .text(W / 2, upgBtnY + 20, 'Upgrade', {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    objs.push(this.detailUpgradeText);

    this.detailGroup = this.add
      .container(0, 0, objs)
      .setDepth(28)
      .setVisible(false);
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
      const col = i % 2,
        row = Math.floor(i / 2);
      const tx = PAD + col * (tileW + PAD);
      const ty = topY + row * (tileH + PAD);

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.white, 0.9);
      bg.fillRoundedRect(tx, ty, tileW, tileH, 7);
      const lblTxt = this.add
        .text(tx + PAD, ty + 10, lbl.toUpperCase(), {
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#71717a',
        })
        .setOrigin(0, 0);
      const val = this.add
        .text(tx + PAD, ty + 26, '—', {
          fontSize: '14px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#18181b',
        })
        .setOrigin(0, 0);
      statTexts.push(val);
      this.lootGroup.add([bg, lblTxt, val]);
    });
    this.lootStatTexts = statTexts;

    const itemsStartY = topY + (tileH + PAD) * 2 + PAD;
    this.lootItemsGroup = this.add.container(0, itemsStartY);
    this.lootGroup.add(this.lootItemsGroup);
  }

  // ══════════════════════════════════════════════════════════════════════
  // View switching
  // ══════════════════════════════════════════════════════════════════════

  private setView(v: View) {
    this.view = v;
    this.titleGroup.setVisible(v === 'title');
    this.mapGroup.setVisible(v === 'map');
    this.partyGroup.setVisible(v === 'party');
    this.raidGroup.setVisible(v === 'raid');
    this.heroesGroup.setVisible(v === 'heroes');
    this.lootGroup.setVisible(v === 'loot');
    this.helpGroup.setVisible(v === 'help');
    this.headerGroup.setVisible(!['title', 'help'].includes(v));
    if (v !== 'heroes') this.hideDetail();
    if (v !== 'raid') this.hideSkillChoice();
    if (v !== 'title') this.hideNewGameConfirm();
    if (v !== 'raid') this.resultGroup?.setVisible(false);
    if (v === 'map') this.refreshMap();
    if (v === 'party') this.refreshPartySelect();
    if (v === 'loot') this.refreshLoot();
    if (v === 'heroes') this.refreshHeroes();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Refresh
  // ══════════════════════════════════════════════════════════════════════

  private refreshAll() {
    this.refreshHeader();
    this.refreshDailyAction();
    this.refreshRaid();
    if (this.view === 'map') this.refreshMap();
    if (this.view === 'party') this.refreshPartySelect();
    if (this.view === 'heroes') this.refreshHeroes();
    if (this.view === 'loot') this.refreshLoot();
  }

  private refreshHeader() {
    if (!this.profile) return;
    this.resourceText.setText(
      `Gold ${fmtCompact(this.profile.gold)}   Tok ${fmtCompact(this.profile.raidTokens)}\nGem ${fmtCompact(this.profile.gems)}    EN ${fmtCompact(this.profile.energy)}`
    );
    this.raidLvText.setText(
      this.profile.raidLevel > RAID_NODES.length ? 'MAX' : String(this.profile.raidLevel)
    );
  }

  private getOwnedHeroIds() {
    return new Set(this.profile?.heroes.map((hero) => hero.heroId) ?? []);
  }

  private refreshMap() {
    if (!this.profile) return;

    this.mapNodeRefs.forEach((ref) => {
      const completed = ref.level < this.profile!.raidLevel;
      const unlocked = ref.level <= this.profile!.raidLevel;
      const current = ref.level === Math.min(this.profile!.raidLevel, RAID_NODES.length);
      const fill = completed ? 0xdcfce7 : unlocked ? 0xffffff : 0xe5e7eb;
      const stroke = completed ? 0x16a34a : current ? 0xf97316 : 0x94a3b8;

      ref.bg.setFillStyle(fill, unlocked ? 1 : 0.72);
      ref.ring.clear();
      ref.ring.lineStyle(current ? 4 : 2, stroke, unlocked ? 1 : 0.45);
      ref.ring.strokeCircle(ref.bg.x, ref.bg.y, current ? 39 : 36);
      ref.label.setAlpha(unlocked ? 1 : 0.35);
      ref.subLabel
        .setText(completed ? 'DONE' : unlocked ? `Lv ${ref.level}` : 'LOCK')
        .setColor(completed ? '#15803d' : unlocked ? '#52525b' : '#94a3b8');

      if (unlocked) {
        ref.hit.setInteractive({ useHandCursor: true });
      } else {
        ref.hit.disableInteractive();
      }
    });
  }

  private refreshPartySelect() {
    if (!this.profile) return;

    const owned = this.getOwnedHeroIds();
    this.selectedParty = this.selectedParty
      .filter((heroId) => owned.has(heroId))
      .slice(0, 5);

    const node = getRaidNode(this.selectedRaidLevel);
    this.partyTitleText.setText(`Node ${node.level}: ${node.name}`);

    this.partyHeroRefs.forEach((ref) => {
      const hero = HEROES.find((candidate) => candidate.id === ref.heroId);
      const isOwned = owned.has(ref.heroId);
      const selected = this.selectedParty.includes(ref.heroId);
      const rarity = hero && this.profile ? getEffectiveHeroRarity(this.profile, hero) : null;

      ref.bg.setFillStyle(
        selected ? 0xdcfce7 : isOwned ? COLORS.white : 0xe5e7eb,
        isOwned ? 1 : 0.64
      );
      ref.bg.setStrokeStyle(
        selected ? 2 : 1,
        selected ? COLORS.btnGreen : COLORS.border,
        isOwned ? 1 : 0.5
      );
      ref.label.setAlpha(isOwned ? 1 : 0.46);
      ref.subLabel
        .setText(isOwned ? `${hero?.role ?? ''} · ${rarity ?? ''}` : 'Locked')
        .setAlpha(isOwned ? 1 : 0.5);
      ref.check.setText(selected ? 'OK' : '');

      if (isOwned) {
        ref.bg.setInteractive({ useHandCursor: true });
      } else {
        ref.bg.disableInteractive();
      }
    });

    const ready = this.selectedParty.length === 5 && this.profile.energy >= ENERGY_COST;
    this.partyStartBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
    this.partyStartText.setText(
      this.selectedParty.length < 5
        ? `Choose ${5 - this.selectedParty.length} more`
        : this.profile.energy < ENERGY_COST
          ? `Need ${ENERGY_COST} energy`
          : `Start Raid · ${ENERGY_COST} energy`
    );
    if (ready) {
      this.partyStartBg.setInteractive({ useHandCursor: true });
    } else {
      this.partyStartBg.disableInteractive();
    }
  }

  private refreshRaid() {
    if (!this.battle || !this.profile) return;
    this.refreshBoss();
    this.refreshHeroSlots();
    this.refreshButtons();
    this.refreshBattleLog();
    this.refreshResultOverlay();
  }

  private refreshBoss() {
    if (!this.battle) return;
    const { boss } = this.battle;
    const elite = boss.isElite ?? false;

    this.bossTitleText
      .setText(
        `${elite ? '⚡ ELITE · ' : ''}${boss.title.toUpperCase()}`
      )
      .setColor(elite ? '#d97706' : '#b91c1c');

    this.bossNameText.setText(
      `${boss.name}${boss.specialSkill ? `  ${boss.specialSkill.icon}` : ''}`
    );
    this.bossHpText.setText(`${fmt(boss.hp)}/${fmt(boss.maxHp)}`);
    this.bossHpFill.scaleX = clamp(boss.hp / boss.maxHp);
    this.bossAura.setFillStyle(elite ? 0xfbbf24 : COLORS.boss, 0.22);
    if (this.textures.exists(boss.spriteKey)) {
      this.bossImage
        .setTexture(boss.spriteKey, boss.spriteFrame ?? 0)
        .setDisplaySize(112, 112);
    }
  }

  private refreshHeroSlots() {
    if (!this.battle) return;
    const { heroes, activeHeroIndex } = this.battle;

    // Stop existing blink tween before rebuilding slot states
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }

    this.heroSlots.forEach((slot) => {
      slot.objects.forEach((object) => object.setVisible(false));
    });

    heroes.forEach((hero, i) => {
      const slot = this.heroSlots[i];
      if (!slot) return;
      const dead = hero.hp <= 0;
      const alpha = dead ? 0.4 : 1;
      this.setHeroPose(slot.icon, hero.id, dead ? 'ko' : 'idle');
      slot.objects.forEach((object) => object.setVisible(true));
      slot.icon.setAlpha(alpha);
      slot.hpText
        .setAlpha(alpha)
        .setText(`HP ${Math.round(hero.hp)}/${hero.maxHp}`);
      slot.lbText.setAlpha(alpha).setText(`${Math.round(hero.charge)}% LB`);
    });

    this.activeHighlight.clear();
    const activeSlot = this.heroSlots[activeHeroIndex];
    if (activeSlot && this.battle.status === 'active') {
      this.activeHighlight.fillStyle(0xf97316, 1);
      this.activeHighlight.fillRect(
        activeSlot.sx - 3,
        activeSlot.sy + activeSlot.sh / 2 - 16,
        4,
        32
      );

      // Blink the active hero's icon to show it's their turn
      const activeHero = heroes[activeHeroIndex];
      if (activeHero && activeHero.hp > 0) {
        this.activeTween = this.tweens.add({
          targets: activeSlot.icon,
          alpha: { from: 1, to: 0.2 },
          duration: 520,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  private refreshButtons() {
    if (!this.battle) return;
    const active = this.battle.status === 'active';
    const activeHero = getActiveHero(this.battle);
    const skillReady = active && canUseSkill(activeHero);
    const ultReady = active && canUseUltimate(activeHero);

    if (active) {
      this.attackBtnBg.setInteractive();
    } else {
      this.attackBtnBg.disableInteractive();
    }
    this.attackBtnText.setAlpha(active ? 1 : 0.42);

    if (skillReady) {
      this.skillBtnBg.setInteractive({ useHandCursor: true });
    } else {
      this.skillBtnBg.disableInteractive();
    }
    const cooldown = activeHero?.skillCooldown ?? 0;
    this.skillBtnText.setText(
      cooldown > 0 ? `CD:${cooldown}` : 'Skill'
    );
    this.skillBtnText.setAlpha(skillReady ? 1 : 0.42);

    if (ultReady) {
      this.ultBtnBg.setInteractive({ useHandCursor: true });
    } else {
      this.ultBtnBg.disableInteractive();
    }
    this.ultBtnText.setText(ultReady ? '⚡ Limit' : 'Limit');
    this.ultBtnText.setAlpha(ultReady ? 1 : 0.42);
  }

  private refreshBattleLog() {
    if (!this.battle) return;
    const logs = this.battle.logs;
    const activeHero = getActiveHero(this.battle);
    const living = this.battle.heroes.filter((h) => h.hp > 0).length;

    this.battleLogHeader.setText(
      `BATTLE LOG  ·  ${activeHero?.name ?? '—'}  ·  ${living}/${this.battle.heroes.length} alive  ·  R${this.battle.round}`
    );

    const TONE_COLOR: Record<BattleLogEntry['tone'], string> = {
      hero: '#15803d',
      boss: '#dc2626',
      reward: '#d97706',
      system: '#6b7280',
    };

    this.battleLogLines.forEach((lt, i) => {
      const entry = logs[i];
      if (!entry) {
        lt.setText('');
        return;
      }
      lt.setText(entry.message);
      lt.setColor(TONE_COLOR[entry.tone]);
      lt.setAlpha(i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12));
    });
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
        this.lastRewards
          ? `+${this.lastRewards.gold} gold  ·  +${this.lastRewards.gems} gems  ·  +${this.lastRewards.exp} EXP`
          : ''
      );

      const showNext = won && this.profile.raidLevel <= RAID_NODES.length;
      this.resultNextBg.setVisible(showNext);
      this.resultNextIcon.setVisible(showNext);
      this.resultNextName.setVisible(showNext);
      if (showNext) {
        const next = getBossAppearance(this.profile.raidLevel);
        this.resultNextIcon.setText(next.icon);
        this.resultNextName.setText(
          `Next: ${next.name}  ·  Lv ${this.profile.raidLevel}`
        );
      }
    }
  }

  private refreshHeroes() {
    if (!this.profile) return;
    const partySize = this.profile.party.length;
    this.heroCardRefs.forEach(
      ({ heroId, levelText, rarityText, btnBg, partyBg, partyText, gemBg, gemText }) => {
        const template = HEROES.find((h) => h.id === heroId);
        const owned = this.profile!.heroes.some((hero) => hero.heroId === heroId);
        const progress = getHeroProgress(this.profile!, heroId);
        const rarity = template
          ? getEffectiveHeroRarity(this.profile!, template)
          : 'Common';
        const ready = owned && canUpgradeHero(this.profile!, heroId);
        const gemReady = owned && canUpgradeHeroWithGem(this.profile!, heroId);
        const starLevel = progress.starLevel ?? 0;
        const inParty = this.profile!.party.includes(heroId);
        const canRemove = inParty && partySize > 1;

        const rarityLabel = rarity + (starLevel > 0 ? ` +${starLevel}` : '');
        levelText.setText(
          owned ? `${template?.role ?? ''} · Lv ${progress.level}` : 'Locked'
        );
        rarityText
          .setText(rarityLabel)
          .setColor(
            '#' +
              (RARITY_COLOR[rarity] ?? COLORS.rarityCommon)
                .toString(16)
                .padStart(6, '0')
          );

        btnBg.setFillStyle(ready ? COLORS.btnPrimary : COLORS.btnDisabled);
        if (ready) {
          btnBg.setInteractive({ useHandCursor: true });
        } else {
          btnBg.disableInteractive();
        }

        gemBg.setFillStyle(gemReady ? 0x7c3aed : COLORS.btnDisabled);
        if (gemReady) {
          gemBg.setInteractive({ useHandCursor: true });
        } else {
          gemBg.disableInteractive();
        }
        const fullyMaxed = owned && isHeroFullyUpgraded(this.profile!, heroId);
        gemText.setText(fullyMaxed ? '💎 Max' : `💎 ${HERO_GEM_UPGRADE_COST}`);

        partyText.setText(
          inParty
            ? canRemove ? 'Remove' : 'In Party'
            : partySize >= 5 ? 'Swap In' : 'Add'
        );
        partyBg.setFillStyle(
          inParty
            ? canRemove ? COLORS.btnGreen : COLORS.btnDisabled
            : COLORS.btnSkill
        );
        if (!inParty || canRemove) {
          partyBg.setInteractive({ useHandCursor: true });
        } else {
          partyBg.disableInteractive();
        }
      }
    );
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
      const rowH = 46;
      const iy = i * rowH;
      const ibg = this.add.graphics();
      ibg.fillStyle(0xf5f5f4);
      ibg.fillRoundedRect(PAD, iy + PAD, W - PAD * 2, rowH - 2, 6);
      const nameT = this.add.text(PAD * 2.5, iy + PAD + 5, item.name, {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
      });
      const bonusLabel = `+${item.bonus} ${item.stat.toUpperCase()}` +
        (item.bonusLevel ? `  [+${item.bonusLevel}]` : '');
      const bonusT = this.add.text(
        PAD * 2.5,
        iy + PAD + 20,
        bonusLabel,
        {
          fontSize: '10px',
          fontFamily: FONT.sans,
          color: '#71717a',
        }
      );
      const canUpgrade = canUpgradeLootWithToken(this.profile!, item.id);
      const isMax = (item.bonusLevel ?? 0) >= LOOT_BONUS_LEVEL_MAX;
      const upgBtnW = 70;
      const upgBtnX = W - PAD - upgBtnW / 2;
      const upgBtnY = iy + PAD + rowH / 2 - 4;
      const upgBg = this.add
        .rectangle(upgBtnX, upgBtnY, upgBtnW, 22,
          isMax ? COLORS.btnDisabled : canUpgrade ? 0x0f766e : COLORS.btnDisabled)
        .setInteractive({ useHandCursor: canUpgrade });
      const upgText = this.add
        .text(upgBtnX, upgBtnY,
          isMax ? 'MAX' : `🪙${LOOT_TOKEN_UPGRADE_COST}`, {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      if (canUpgrade) {
        const capturedId = item.id;
        upgBg.on('pointerdown', () => this.handleLootUpgrade(capturedId));
      }
      this.lootItemsGroup.add([ibg, nameT, bonusT, upgBg, upgText]);
    });

    if (items.length === 0) {
      this.lootItemsGroup.add(
        this.add
          .text(W / 2, 50, 'Clear raids to earn gear.', {
            fontSize: '13px',
            fontFamily: FONT.sans,
            color: '#a1a1aa',
          })
          .setOrigin(0.5)
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
    const owned = this.profile.heroes.some((entry) => entry.heroId === heroId);

    if (!owned) {
      this.showNotification('Recruit this hero with gems first.');
      return;
    }

    const progress = getHeroProgress(this.profile, heroId);
    const stats = getScaledStats(hero, progress.level);
    const cost = getUpgradeCost(progress.level);
    const ready = canUpgradeHero(this.profile, heroId);

    this.setHeroPose(this.detailHeroIcon, hero.id, 'idle');
    this.detailHeroIcon.setScale(64 / this.getHeroSpriteConfig(hero.id).frameW);
    this.detailHeroName.setText(hero.name);
    this.detailRoleLv.setText(
      `${hero.title} · ${hero.role} · Lv ${progress.level}`
    );
    const rarity = getEffectiveHeroRarity(this.profile, hero);
    this.detailRarityText.setColor(
      '#' +
        (RARITY_COLOR[rarity] ?? COLORS.rarityCommon)
          .toString(16)
          .padStart(6, '0')
    );
    this.detailRarityText.setText(rarity);

    [stats.hp, stats.atk, stats.def, stats.mag, stats.res, stats.spd].forEach(
      (v, i) => this.detailStatValues[i]?.setText(String(v))
    );

    const skillChoices = getHeroSkillChoicesForLevel(hero, progress.level);
    const nextSkill = getNextHeroSkillUnlock(hero, progress.level);
    this.detailSkillText.setText(
      [
        ...skillChoices.map((skill, index) => `${index + 1}. ${skill.name}`),
        ...(nextSkill ? [`Lv ${nextSkill.level}: ${nextSkill.skill.name}`] : []),
      ].join('\n')
    );
    this.detailUltText.setText(
      `${hero.ultimate.name}\n${hero.ultimate.summary}`
    );
    this.detailUpgradeBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
    if (ready) {
      this.detailUpgradeBg.setInteractive({ useHandCursor: true });
    } else {
      this.detailUpgradeBg.disableInteractive();
    }
    this.detailUpgradeText.setText(
      ready ? `Upgrade · ${cost} gold` : `Need ${cost} gold`
    );

    this.detailGroup.setVisible(true);
  }

  private hideDetail() {
    this.selectedHeroId = null;
    this.detailGroup.setVisible(false);
  }

  private openSkillChoice() {
    if (!this.battle || this.battle.status !== 'active') return;
    const activeHero = getActiveHero(this.battle);

    if (!activeHero || !canUseSkill(activeHero)) return;

    this.skillChoiceHeroText.setText(`${activeHero.name} · Choose Skill`);
    const skillChoices = activeHero.skillOptions.length > 0
      ? activeHero.skillOptions
      : [activeHero.skill];

    this.skillChoiceRefs.forEach((ref, index) => {
      const skill = skillChoices[index];
      const available = Boolean(skill);
      ref.nameText
        .setText(skill ? skill.name : 'No skill')
        .setAlpha(available ? 1 : 0.35);
      ref.summaryText
        .setText(skill ? skill.summary : '')
        .setAlpha(available ? 1 : 0.35);
      ref.metaText
        .setText(skill ? skill.kind.toUpperCase() : '')
        .setAlpha(available ? 1 : 0.35);
      if (available) {
        ref.hit.setInteractive({ useHandCursor: true });
      } else {
        ref.hit.disableInteractive();
      }
    });

    this.skillChoiceGroup.setVisible(true);
  }

  private hideSkillChoice() {
    this.skillChoiceGroup.setVisible(false);
  }

  private chooseSkill(index: number) {
    if (!this.battle || this.battle.status !== 'active') return;
    const activeHero = getActiveHero(this.battle);
    const skill = activeHero?.skillOptions[index] ?? activeHero?.skill;

    if (!skill) return;

    this.hideSkillChoice();
    this.handleAction('skill', skill, index);
  }

  private showNewGameConfirm() {
    this.newGameConfirmGroup.setVisible(true);
  }

  private hideNewGameConfirm() {
    this.newGameConfirmGroup.setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Action handlers
  // ══════════════════════════════════════════════════════════════════════

  private confirmNewGame() {
    this.hideNewGameConfirm();
    this.profile = createInitialPlayerSave(this.username);
    this.selectedParty = this.profile.party.slice(0, 5);
    this.battle = null;
    this.raidRun = null;
    this.lastRewards = null;
    void persistKeeperSave(this.profile);
    this.setView('map');
    this.refreshAll();
  }

  private handleContinue() {
    if (!this.profile) {
      this.profile = createInitialPlayerSave(this.username);
    }

    this.selectedParty = this.profile.party.slice(0, 5);
    this.battle = null;
    this.raidRun = null;
    this.lastRewards = null;
    this.setView('map');
    this.refreshAll();
  }

  private openPartySelect(raidLevel: number) {
    if (!this.profile) return;
    if (raidLevel > this.profile.raidLevel) {
      this.showNotification('Clear the lower node first.');
      return;
    }

    this.selectedRaidLevel = raidLevel;
    const owned = this.getOwnedHeroIds();
    this.selectedParty = (this.profile.party.length > 0 ? this.profile.party : [])
      .filter((heroId) => owned.has(heroId))
      .slice(0, 5);

    if (this.selectedParty.length < 5) {
      HEROES.forEach((hero) => {
        if (this.selectedParty.length >= 5) return;
        if (owned.has(hero.id) && !this.selectedParty.includes(hero.id)) {
          this.selectedParty.push(hero.id);
        }
      });
    }

    this.setView('party');
  }

  private toggleSelectedPartyHero(heroId: string) {
    if (!this.profile || !this.getOwnedHeroIds().has(heroId)) return;

    if (this.selectedParty.includes(heroId)) {
      this.selectedParty = this.selectedParty.filter((id) => id !== heroId);
    } else if (this.selectedParty.length < 5) {
      this.selectedParty = [...this.selectedParty, heroId];
    } else {
      this.selectedParty = [...this.selectedParty.slice(1), heroId];
    }

    this.refreshPartySelect();
  }

  private handleAction(
    action: BattleAction,
    selectedSkill?: HeroSkill,
    skillChoiceIndex = 0
  ) {
    if (!this.profile || !this.battle || this.battle.status !== 'active')
      return;
    const activeHero = getActiveHero(this.battle);

    if (action === 'ultimate' && !canUseUltimate(activeHero)) return;
    if (action === 'skill' && !canUseSkill(activeHero)) return;

    const activeIndex = this.battle.heroes.findIndex(
      (hero) => hero.id === activeHero?.id
    );
    const prevHeroes = this.battle.heroes;
    const prevHeroHps = prevHeroes.map((h) => h.hp);
    const nextBattle = resolveHeroAction(this.battle, action, selectedSkill);
    const bossDamage = Math.max(
      0,
      Math.round(this.battle.boss.hp - nextBattle.boss.hp)
    );
    const damagedHeroSlots: Array<{ index: number; heroId: string; ko: boolean }> = [];

    // Show hero attack effect on boss
    if (activeHero) {
      const frame = this.getHeroEffectFrame(
        activeHero,
        action,
        skillChoiceIndex
      );
      this.spawnEffectSprite(frame, this.bossCX, this.bossCY);
      if (bossDamage > 0) {
        this.spawnBossFloat(bossDamage, action === 'ultimate' ? 'ultimate' : 'damage');
      }

      // Shake boss image on hit
      if (nextBattle.boss.hp < this.battle.boss.hp) {
        this.tweens.add({
          targets: this.bossImage,
          x: { from: this.bossCX - 7, to: this.bossCX + 7 },
          duration: 75,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: 2,
          onComplete: () => this.bossImage.setX(this.bossCX),
        });
      }
    }

    // Show boss attack effects on heroes that took damage
    nextBattle.heroes.forEach((nextHero, i) => {
      const prev = prevHeroes[i];
      if (!prev) return;
      const diff = Math.round(nextHero.hp) - Math.round(prev.hp);
      if (Math.abs(diff) < 1) return;

      const isActorUlt =
        action === 'ultimate' && prev.id === (activeHero?.id ?? '');
      this.spawnFloat(
        i,
        Math.abs(diff),
        diff < 0 ? (isActorUlt ? 'ultimate' : 'damage') : 'heal'
      );

      if (diff < 0) {
        // Boss hit this hero
        const slot = this.heroSlots[i];
        if (slot) {
          damagedHeroSlots.push({
            index: i,
            heroId: nextHero.id,
            ko: nextHero.hp <= 0,
          });
          const bossSpecial = nextBattle.boss.specialSkill;
          const bossFrame = bossSpecial
            ? (GameScene.BOSS_DEBUFF_FRAME[bossSpecial.effectType] ?? 9)
            : 9; // default: THUNDER col 3 (big lightning)
          this.spawnEffectSprite(bossFrame, slot.iconCX, slot.iconCY);
        }
      }
    });

    // Show boss debuff effect + center-screen skill banner if boss used special this turn
    const newLog = nextBattle.logs[0];
    const prevLog = this.battle.logs[0];
    if (
      newLog &&
      prevLog &&
      newLog.id !== prevLog.id &&
      newLog.tone === 'boss' &&
      nextBattle.boss.specialSkill &&
      prevHeroHps.some(
        (hp, i) => hp === (nextBattle.heroes[i]?.hp ?? hp)
      )
    ) {
      const skill = nextBattle.boss.specialSkill;
      const frame =
        GameScene.BOSS_DEBUFF_FRAME[skill.effectType] ?? 9;
      this.heroSlots.forEach((slot, i) => {
        if ((nextBattle.heroes[i]?.hp ?? 0) > 0) {
          this.time.delayedCall(i * 100, () =>
            this.spawnEffectSprite(frame, slot.iconCX, slot.iconCY)
          );
        }
      });
      this.showBossSkillBanner(nextBattle.boss.name, skill.icon, skill.name);
    }

    if (action === 'ultimate' && activeHero) {
      const idx = this.battle.heroes.findIndex((h) => h.id === activeHero.id);
      const had = prevHeroes[idx]
        ? Math.abs(
            Math.round(nextBattle.heroes[idx]?.hp ?? 0) -
              Math.round(prevHeroes[idx]!.hp)
          ) >= 1
        : false;
      if (!had) this.spawnFloat(idx, 0, 'ultimate');
    }

    this.battle = nextBattle;

    if (nextBattle.status === 'active') {
      this.refreshRaid();
      if (activeHero) {
        this.animateActiveHeroAction(activeIndex, activeHero.id, action);
      }
      damagedHeroSlots.forEach(({ index, heroId, ko }) =>
        this.animateHeroHit(index, heroId, ko)
      );
      return;
    }

    const run = this.raidRun ?? {
      nodeLevel: nextBattle.raidLevel,
      battleIndex: nextBattle.encounterIndex,
      battleCount: nextBattle.encounterCount,
      totalDamage: 0,
      party: this.profile.party,
    };

    if (nextBattle.status === 'won' && run.battleIndex < run.battleCount) {
      const node = getRaidNode(run.nodeLevel);
      const nextIndex = run.battleIndex + 1;
      this.raidRun = {
        ...run,
        battleIndex: nextIndex,
        totalDamage: run.totalDamage + nextBattle.totalDamage,
      };
      this.battle = createBattleState(this.profile, {
        raidLevel: node.level,
        bossId: node.bossId,
        encounterIndex: nextIndex,
        encounterCount: run.battleCount,
      });
      this.showEncounterBanner(nextIndex, run.battleCount);
      this.refreshAll();
      if (activeHero) {
        this.animateActiveHeroAction(activeIndex, activeHero.id, action);
      }
      damagedHeroSlots.forEach(({ index, heroId, ko }) =>
        this.animateHeroHit(index, heroId, ko)
      );
      return;
    }

    // Raid node ended — apply rewards and track level-ups
    const victory = nextBattle.status === 'won';
    const battlesCleared = victory
      ? run.battleCount
      : Math.max(0, run.battleIndex - 1);
    const runDamage = run.totalDamage + nextBattle.totalDamage;
    this.battle = {
      ...nextBattle,
      totalDamage: runDamage,
    };
    const prevLevels = Object.fromEntries(
      this.profile.heroes.map((h) => [h.heroId, h.level])
    );
    const rewards = createBattleRewards(
      runDamage,
      victory,
      this.profile.inventory.length,
      battlesCleared,
      run.battleCount
    );
    const nextProfile = applyBattleRewards(
      this.profile,
      rewards,
      runDamage,
      {
        victory,
        raidLevel: run.nodeLevel,
      }
    );
    this.lastRewards = rewards;
    this.profile = nextProfile;
    this.raidRun = null;

    // Add level-up entries to battle log
    const levelUpEntries: BattleLogEntry[] = [];
    nextProfile.heroes.forEach((h) => {
      const prev = prevLevels[h.heroId] ?? 1;
      if (h.level > prev) {
        const hero = HEROES.find((hero) => hero.id === h.heroId);
        if (hero) {
          levelUpEntries.push({
            id: `levelup-${h.heroId}`,
            tone: 'reward',
            message: `⭐ ${hero.name} leveled up to Lv ${h.level}!`,
          });
        }
      }
    });
    if (levelUpEntries.length > 0 && this.battle) {
      this.battle = {
        ...this.battle,
        logs: [...levelUpEntries, ...this.battle.logs].slice(0, MAX_LOGS),
      };
    }

    void persistKeeperSave(nextProfile);
    this.refreshAll();
    if (activeHero) {
      this.animateActiveHeroAction(activeIndex, activeHero.id, action);
    }
    damagedHeroSlots.forEach(({ index, heroId, ko }) =>
      this.animateHeroHit(index, heroId, ko)
    );

    if (victory) {
      this.animateBossDefeat();
    }
  }

  private showBossSkillBanner(bossName: string, icon: string, skillName: string) {
    const bannerH = 56;
    const bg = this.add
      .rectangle(W / 2, STAGE_Y + 80, W, bannerH, 0x7f1d1d, 0.88)
      .setDepth(42)
      .setAlpha(0);
    const text = this.add
      .text(W / 2, STAGE_Y + 80, `${icon}  ${bossName}: ${skillName}`, {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#fca5a5',
      })
      .setOrigin(0.5)
      .setDepth(43)
      .setAlpha(0);
    this.tweens.add({
      targets: [bg, text],
      alpha: 1,
      duration: 180,
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: [bg, text],
            alpha: 0,
            duration: 350,
            onComplete: () => { bg.destroy(); text.destroy(); },
          });
        });
      },
    });
  }

  private animateBossDefeat() {
    // Boss slowly drifts upward and fades out — FF-style defeat
    this.tweens.add({
      targets: [this.bossImage, this.bossAura],
      alpha: 0,
      y: `+=${60}`,
      duration: 1800,
      ease: 'Sine.In',
      delay: 300,
    });
  }

  private showNotification(message: string) {
    const notif = this.add
      .text(W / 2, H - 110, message, {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
        backgroundColor: '#18181b',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0);
    this.tweens.add({
      targets: notif,
      alpha: 1,
      duration: 180,
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({ targets: notif, alpha: 0, duration: 380, onComplete: () => notif.destroy() });
        });
      },
    });
  }

  private showEncounterBanner(index: number, total: number) {
    // Phase 1: black curtain slides in from left, covering the full screen
    const curtain = this.add
      .rectangle(0, H / 2, 0, H, 0x000000)
      .setDepth(44)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: curtain,
      width: W,
      duration: 260,
      ease: 'Sine.In',
      onComplete: () => {
        // Phase 2: show battle counter on top of the black screen
        const text = this.add
          .text(W / 2, H / 2, `Battle  ${index} / ${total}`, {
            fontSize: '24px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#ffffff',
          })
          .setOrigin(0.5)
          .setDepth(45);

        this.time.delayedCall(700, () => {
          // Phase 3: curtain slides out to the right, revealing new scene
          this.tweens.add({
            targets: curtain,
            x: W,
            duration: 300,
            ease: 'Sine.Out',
            onComplete: () => { curtain.destroy(); text.destroy(); },
          });
        });
      },
    });
  }

  private handleStartRaid() {
    if (!this.profile) return;
    if (this.selectedParty.length !== 5) {
      this.showNotification('Choose exactly 5 heroes.');
      return;
    }
    if (this.profile.energy < ENERGY_COST) {
      this.showNotification(`⚡ Need ${ENERGY_COST} energy to raid (have ${Math.floor(this.profile.energy)})`);
      return;
    }
    const node = getRaidNode(this.selectedRaidLevel);
    const battleCount =
      node.minBattles +
      Math.floor(Math.random() * (node.maxBattles - node.minBattles + 1));
    const nextProfile = {
      ...this.profile,
      energy: this.profile.energy - ENERGY_COST,
      party: this.selectedParty,
      updatedAt: new Date().toISOString(),
    };
    this.profile = nextProfile;
    void persistKeeperSave(nextProfile);
    this.raidRun = {
      nodeLevel: node.level,
      battleIndex: 1,
      battleCount,
      totalDamage: 0,
      party: this.selectedParty,
    };
    this.battle = createBattleState(nextProfile, {
      raidLevel: node.level,
      bossId: node.bossId,
      encounterIndex: 1,
      encounterCount: battleCount,
    });
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

  private handleToggleParty(heroId: string) {
    if (!this.profile) return;
    if (!this.profile.heroes.some((hero) => hero.heroId === heroId)) return;

    const currentParty =
      this.profile.party.length > 0
        ? this.profile.party
        : HEROES.slice(0, 5).map((hero) => hero.id);
    const inParty = currentParty.includes(heroId);
    let nextParty: string[];

    if (inParty) {
      if (currentParty.length <= 1) return;
      nextParty = currentParty.filter((id) => id !== heroId);
    } else if (currentParty.length >= 5) {
      nextParty = [...currentParty.slice(0, 4), heroId];
    } else {
      nextParty = [...currentParty, heroId];
    }

    const nextProfile = {
      ...this.profile,
      party: nextParty,
      updatedAt: new Date().toISOString(),
    };

    this.profile = nextProfile;
    this.battle = createBattleState(nextProfile);
    this.lastRewards = null;
    this.resultGroup.setVisible(false);
    void persistKeeperSave(nextProfile);
    this.refreshAll();
  }

  private handleUpgrade(heroId: string) {
    if (!this.profile) return;
    const result = upgradeHero(this.profile, heroId);
    if (!result.upgraded) return;
    this.profile = result.save;
    void persistKeeperSave(result.save);
    // Always reset stale battle/result state so the Raid Clear overlay
    // doesn't re-appear when upgrading from the heroes tab.
    if (!this.battle || this.battle.status !== 'active') {
      this.battle = createBattleState(result.save);
      this.lastRewards = null;
    }
    const heroName = HEROES.find((h) => h.id === heroId)?.name ?? heroId;
    const progress = result.save.heroes.find((h) => h.heroId === heroId);
    this.showNotification(`${heroName} → Lv ${progress?.level ?? '?'} upgraded!`);
    this.refreshAll();
  }

  private handleGemUpgrade(heroId: string) {
    if (!this.profile) return;
    const result = upgradeHeroWithGem(this.profile, heroId);
    if (!result.upgraded) {
      this.showNotification(result.message);
      return;
    }
    this.profile = result.save;
    void persistKeeperSave(result.save);
    if (!this.battle || this.battle.status !== 'active') {
      this.battle = createBattleState(result.save);
      this.lastRewards = null;
    }
    this.showNotification(result.message);
    this.refreshAll();
  }

  private handleLootUpgrade(itemId: string) {
    if (!this.profile) return;
    const result = upgradeLootWithToken(this.profile, itemId);
    if (!result.upgraded) {
      this.showNotification(result.message);
      return;
    }
    this.profile = result.save;
    void persistKeeperSave(result.save);
    this.showNotification(result.message);
    this.refreshAll();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Combat effects
  // ══════════════════════════════════════════════════════════════════════

  // damage_effect.png is stored as 6 columns x 4 rows, but column 5 is retired.
  // Use col 0 for attacks, cols 1-3 for skills, and col 4 for limit breaks.
  private static readonly EFFECT_ROW_STRIDE = 6;
  private static readonly SLASH_EFFECT_BASE = 18;
  private static readonly HERO_MAGIC_EFFECT_BASE: Record<string, number> = {
    'snoo-vanguard': 0,
    'flair-archmage': 6,
    'automod-oracle': 12,
  };

  private static readonly BOSS_DEBUFF_FRAME: Record<string, number> = {
    berserk: 4,
    daze: 9,
    silence: 16,
    confuse: 13,
    blind: 6,
  };

  private getHeroSpriteConfig(heroId: string): HeroSpriteConfig {
    const config = HERO_SPRITE_CONFIG[heroId];

    if (config) return config;

    const fallback = HERO_SPRITE_CONFIG[FALLBACK_HERO_ID];

    if (!fallback) {
      throw new Error(`Missing fallback hero sprite: ${FALLBACK_HERO_ID}`);
    }

    return fallback;
  }

  private getHeroSpriteKey(heroId: string) {
    return this.getHeroSpriteConfig(heroId).key;
  }

  private getHeroPoseColumn(heroId: string, pose: HeroPose) {
    const config = this.getHeroSpriteConfig(heroId);
    const poseMap =
      config.frameCount >= 6 ? DEVOPS_HERO_POSE_COL : COMMON_HERO_POSE_COL;

    return Math.min(poseMap[pose], config.frameCount - 1);
  }

  private setHeroPose(
    image: Phaser.GameObjects.Image,
    heroId: string,
    pose: HeroPose
  ) {
    const config = this.getHeroSpriteConfig(heroId);
    const col = this.getHeroPoseColumn(heroId, pose);
    image.setTexture(config.key, col);
    // Crop to a square from the top of the frame (head + upper body).
    // Hero frames are 256×1024 (1:4 ratio); without this crop they render
    // severely squished when displayed in a square slot.
    image.setCrop(0, 0, config.frameW, config.frameW);
  }

  private animateActiveHeroAction(
    slotIndex: number,
    heroId: string,
    action: BattleAction
  ) {
    const slot = this.heroSlots[slotIndex];
    if (!slot) return;

    this.setHeroPose(slot.icon, heroId, action === 'attack' ? 'attack' : 'cast');
    slot.icon.setX(slot.iconCX);
    this.tweens.add({
      targets: slot.icon,
      x: slot.iconCX - 20,
      duration: 200,
      ease: 'Sine.Out',
      yoyo: true,
      onComplete: () => {
        slot.icon.setX(slot.iconCX);
        this.setHeroPose(slot.icon, heroId, 'idle');
      },
    });
  }

  private animateHeroHit(slotIndex: number, heroId: string, ko: boolean) {
    const slot = this.heroSlots[slotIndex];
    if (!slot) return;

    this.setHeroPose(slot.icon, heroId, ko ? 'ko' : 'hit');
    if (!ko) slot.icon.setTint(0xffd1d1);
    this.tweens.add({
      targets: slot.icon,
      x: { from: slot.iconCX - 4, to: slot.iconCX + 4 },
      duration: 70,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        slot.icon.setX(slot.iconCX);
        slot.icon.clearTint();
        this.setHeroPose(slot.icon, heroId, ko ? 'ko' : 'idle');
      },
    });
  }

  private getHeroEffectFrame(
    hero: BattleHero,
    action: BattleAction,
    skillChoiceIndex: number
  ): number {
    const base =
      hero.atk >= hero.mag
        ? GameScene.SLASH_EFFECT_BASE
        : GameScene.HERO_MAGIC_EFFECT_BASE[hero.id] ??
          GameScene.SLASH_EFFECT_BASE;
    const col =
      action === 'ultimate'
        ? 4
        : action === 'attack'
          ? 0
          : 1 + (skillChoiceIndex % 3);

    if (col >= GameScene.EFFECT_ROW_STRIDE - 1) return base + 4;

    return base + col;
  }

  private spawnEffectSprite(frame: number, x: number, y: number) {
    if (!this.textures.exists(DAMAGE_EFFECT_KEY)) return;

    const img = this.add
      .image(x, y, DAMAGE_EFFECT_KEY, frame)
      .setDisplaySize(128, 128)
      .setOrigin(0.5)
      .setDepth(16)
      .setAlpha(0.92);

    this.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 780,
      ease: 'Cubic.Out',
      onComplete: () => img.destroy(),
    });
  }

  private spawnBossFloat(value: number, kind: 'damage' | 'ultimate') {
    const color = kind === 'ultimate' ? '#fbbf24' : '#ef4444';
    const floatText = this.add
      .text(this.bossCX, this.bossCY - 58, String(value), {
        fontSize: kind === 'ultimate' ? '28px' : '24px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(17);

    this.tweens.add({
      targets: floatText,
      y: this.bossCY - 112,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.Out',
      onComplete: () => floatText.destroy(),
    });
  }

  private spawnFloat(
    slotIndex: number,
    value: number,
    kind: 'damage' | 'heal' | 'ultimate'
  ) {
    const slot = this.heroSlots[slotIndex];
    if (!slot) return;

    const label =
      kind === 'ultimate' ? 'LIMIT' : String(value);
    const color =
      kind === 'damage' ? '#ef4444' : kind === 'heal' ? '#60a5fa' : '#fbbf24';

    const floatText = this.add
      .text(slot.iconCX, slot.iconCY - HERO_SPRITE_SIZE / 2, label, {
        fontSize: kind === 'ultimate' ? '18px' : '20px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(15);

    this.tweens.add({
      targets: floatText,
      y: slot.iconCY - HERO_SPRITE_SIZE / 2 - 52,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => floatText.destroy(),
    });
  }
}
