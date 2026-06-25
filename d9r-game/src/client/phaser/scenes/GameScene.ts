import Phaser from 'phaser';
import { context } from '@devvit/web/client';
import { COLORS, FONT, H, PAD, W } from '../constants';
import {
  EFFECT_KEYS,
  type EffectKey,
  HERO_SPRITE_CONFIG,
} from './BootScene';
import type { HeroSpriteConfig } from './BootScene';
import { loadKeeperSave, loadRaidStatus } from '../../keeper/api';
import type { RaidStatus } from '../../../shared/api';
import type {
  BattleAction,
  BattleState,
  HeroSkill,
  HeroPose,
  PlayerSave,
  RaidNode,
  RewardBundle,
} from '../../../shared/game/types';

import type { View, HeroSlotRef, HeroCardRef, MapNodeRef, PartyHeroRef, RaidRun, SkillChoiceRef, BossAttackCue } from './GameSceneTypes';
import { GAME_Y, STAGE_X, STAGE_Y, STAGE_W, STAGE_H, INFO_BAR_H, ACTION_H, BANNER_ZONE_H, BOSS_AREA_W, HERO_AREA_X, HERO_AREA_W, CONTENT_H, HERO_SLOT_H, HERO_SPRITE_SIZE, HERO_BAR_X_OFF, STATS_BAR_Y, HERO_FRAME_DISPLAY_W, HERO_FRAME_DISPLAY_H, FALLBACK_HERO_ID, ENERGY_COST, COMMON_HERO_POSE_COL, DEVOPS_HERO_POSE_COL, fmt, fmtCompact, clamp } from './GameSceneTypes';

import { buildTitleView, buildMapView } from '../builders/mapView';
import { buildPartyView, buildHelpView } from '../builders/partyHelpView';
import { buildHeader, buildSettingsPanel, toggleSettingsPanel, refreshDailyAction } from '../builders/headerSettings';
import { buildRaidView, updateStageBg } from '../builders/raidBattle';
import { buildResultOverlay, buildSkillChoiceOverlay, buildNewGameConfirmOverlay } from '../builders/overlays';
import { buildHeroesView, buildDetailSheet, buildLootView } from '../builders/heroesLoot';
import { refreshBoss, refreshHeroSlots, refreshButtons, refreshBattleLog } from '../refresh/battle';
import { refreshHeader, getOwnedHeroIds, refreshRaidPanel, refreshMap, refreshPartySelect, refreshRaid, refreshResultOverlay, refreshHeroes, refreshLoot } from '../refresh/views';
import { handleAction, spawnEffectSprite, animateBossDefeat, showHeroSkillBanner } from '../handlers/actions';
import { handleContinue, handleStartRaid, showBattleTransition, openPartySelect, toggleSelectedPartyHero, showDetail, hideDetail, openSkillChoice, hideSkillChoice, chooseSkill, showNewGameConfirm, hideNewGameConfirm, confirmNewGame, handleDailyClaim, handleToggleParty, handleUpgrade, handleGemUpgrade, handleLootUpgrade } from '../handlers/navigation';

export class GameScene extends Phaser.Scene {
  // State
  profile: PlayerSave | null = null;
  battle: BattleState | null = null;
  view: View = 'title';
  lastRewards: RewardBundle | null = null;
  selectedHeroId: string | null = null;
  username = 'player';
  settingsPanelOpen = false;
  selectedRaidLevel = 1;
  selectedParty: string[] = [];
  raidRun: RaidRun | null = null;
  bossTurnAnimating = false;
  raidStatus: RaidStatus | null = null;
  pendingResultShow = false;
  raidButtonLabel = 'Start Raid';

  // Energy regen timer
  energyUpdateAccum = 0;
  settingsEnergyTimerText!: Phaser.GameObjects.Text;
  partyEnergyTimerText!: Phaser.GameObjects.Text;

  // Result overlay loot section
  resultLootGroup!: Phaser.GameObjects.Container;

  // Map scroll state (legacy - kept for compat)
  mapScrollMin = 0;
  mapScrollMax = 0;
  mapDragStartPtrY = 0;
  mapDragStartContainerY = 0;
  mapIsDragging = false;
  mapDraggedPx = 0;

  // Carousel state
  mapCarouselContainer!: Phaser.GameObjects.Container;
  mapCarouselIndex = 0;
  mapCarouselCardW = 0;
  mapCarouselCardSpacing = 0;
  mapCarouselDragStartX = 0;
  mapCarouselDragStartContainerX = 0;
  mapCarouselIsDragging = false;

  // Community raid panel (on map view)
  raidPanelBossText!: Phaser.GameObjects.Text;
  raidPanelBarBg!: Phaser.GameObjects.Rectangle;
  raidPanelBarFill!: Phaser.GameObjects.Rectangle;
  raidPanelPctText!: Phaser.GameObjects.Text;
  raidPanelUserText!: Phaser.GameObjects.Text;
  raidPanelTopText!: Phaser.GameObjects.Text;

  // Containers
  titleGroup!: Phaser.GameObjects.Container;
  mapGroup!: Phaser.GameObjects.Container;
  partyGroup!: Phaser.GameObjects.Container;
  helpGroup!: Phaser.GameObjects.Container;
  headerGroup!: Phaser.GameObjects.Container;
  raidGroup!: Phaser.GameObjects.Container;
  heroesGroup!: Phaser.GameObjects.Container;
  lootGroup!: Phaser.GameObjects.Container;
  settingsGroup!: Phaser.GameObjects.Container;
  resultGroup!: Phaser.GameObjects.Container;
  detailGroup!: Phaser.GameObjects.Container;
  skillChoiceGroup!: Phaser.GameObjects.Container;
  newGameConfirmGroup!: Phaser.GameObjects.Container;

  // Header
  raidLvText!: Phaser.GameObjects.Text;

  // Multi-boss side sprites (hidden floor formation)
  sideBossImages: Phaser.GameObjects.Image[] = [];

  // Boss
  stageBg!: Phaser.GameObjects.Image;
  bossAura!: Phaser.GameObjects.Arc;
  bossImage!: Phaser.GameObjects.Image;
  bossTitleText!: Phaser.GameObjects.Text;
  bossNameText!: Phaser.GameObjects.Text;
  bossHpText!: Phaser.GameObjects.Text;
  bossHpFill!: Phaser.GameObjects.Rectangle;
  bossCX = 0;
  bossCY = 0;

  // Hero slots
  heroSlots: HeroSlotRef[] = [];
  activeHighlight!: Phaser.GameObjects.Graphics;
  activeTween: Phaser.Tweens.Tween | null = null;

  // Action buttons
  attackBtnBg!: Phaser.GameObjects.Rectangle;
  attackBtnText!: Phaser.GameObjects.Text;
  skillBtnBg!: Phaser.GameObjects.Rectangle;
  skillBtnText!: Phaser.GameObjects.Text;
  ultBtnBg!: Phaser.GameObjects.Rectangle;
  ultBtnText!: Phaser.GameObjects.Text;

  // Battle log
  battleLogLines: Phaser.GameObjects.Text[] = [];
  battleLogHeader!: Phaser.GameObjects.Text;

  // Settings panel
  settingsCurrTexts: Phaser.GameObjects.Text[] = [];
  settingsNavBtns: Phaser.GameObjects.Rectangle[] = [];
  dailyActBg!: Phaser.GameObjects.Graphics;
  dailyActHit!: Phaser.GameObjects.Rectangle;
  dailyActText!: Phaser.GameObjects.Text;
  dailyActSubText!: Phaser.GameObjects.Text;

  // Result overlay
  resultStatusText!: Phaser.GameObjects.Text;
  resultDamageText!: Phaser.GameObjects.Text;
  resultRewardsText!: Phaser.GameObjects.Text;
  resultNextBg!: Phaser.GameObjects.Graphics;
  resultNextIcon!: Phaser.GameObjects.Text;
  resultNextName!: Phaser.GameObjects.Text;

  // Heroes view
  heroCardRefs: HeroCardRef[] = [];
  mapNodeRefs: MapNodeRef[] = [];
  partyHeroRefs: PartyHeroRef[] = [];
  partyStartBg!: Phaser.GameObjects.Rectangle;
  partyStartText!: Phaser.GameObjects.Text;
  partyTitleText!: Phaser.GameObjects.Text;

  // Hero detail sheet
  detailHeroName!: Phaser.GameObjects.Text;
  detailRoleLv!: Phaser.GameObjects.Text;
  detailRarityText!: Phaser.GameObjects.Text;
  detailStatValues: Phaser.GameObjects.Text[] = [];
  detailSkillText!: Phaser.GameObjects.Text;
  detailUltText!: Phaser.GameObjects.Text;
  detailUpgradeBg!: Phaser.GameObjects.Rectangle;
  detailUpgradeText!: Phaser.GameObjects.Text;
  detailHeroIcon!: Phaser.GameObjects.Image;
  skillChoiceHeroText!: Phaser.GameObjects.Text;
  skillChoiceRefs: SkillChoiceRef[] = [];

  // Loot view
  lootStatTexts: Phaser.GameObjects.Text[] = [];
  lootItemsGroup!: Phaser.GameObjects.Container;

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

    const { save, communityBoost } = await loadKeeperSave(this.username);
    this.profile = save;
    this.selectedParty = this.profile.party.slice(0, 5);
    if (communityBoost) {
      this.time.delayedCall(1500, () =>
        this.showNotification('Community typed "agile"! +10 ⚡ Energy for everyone!')
      );
    }
    this.refreshAll();
  }

  // ══════════════════════════════════════════════════════════════════════
  // View switching
  // ══════════════════════════════════════════════════════════════════════

  setView(v: View) {
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
    if (v === 'map') {
      this.refreshMap();
      void loadRaidStatus().then((raid) => {
        this.raidStatus = raid;
        this.refreshRaidPanel();
      });
    }
    if (v === 'party') this.refreshPartySelect();
    if (v === 'loot') this.refreshLoot();
    if (v === 'heroes') this.refreshHeroes();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Refresh
  // ══════════════════════════════════════════════════════════════════════

  refreshAll() {
    this.refreshHeader();
    this.refreshDailyAction();
    this.refreshRaid();
    if (this.view === 'map') this.refreshMap();
    if (this.view === 'party') this.refreshPartySelect();
    if (this.view === 'heroes') this.refreshHeroes();
    if (this.view === 'loot') this.refreshLoot();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Notification / Banners
  // ══════════════════════════════════════════════════════════════════════

  showNotification(message: string) {
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

  showEncounterBanner(index: number, total: number) {
    // Phase 1: black curtain slides in from left, covering the battle field.
    const curtain = this.add
      .rectangle(STAGE_X, STAGE_Y + STAGE_H / 2, 0, STAGE_H, 0x000000)
      .setDepth(44)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: curtain,
      width: STAGE_W,
      duration: 260,
      ease: 'Sine.In',
      onComplete: () => {
        // Phase 2: show battle counter on top of the battle field curtain.
        const text = this.add
          .text(STAGE_X + STAGE_W / 2, STAGE_Y + STAGE_H / 2, `Battle  ${index} / ${total}`, {
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
            x: STAGE_X + STAGE_W,
            duration: 300,
            ease: 'Sine.Out',
            onComplete: () => { curtain.destroy(); text.destroy(); },
          });
        });
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Hero sprite helpers
  // ══════════════════════════════════════════════════════════════════════

  getHeroSpriteConfig(heroId: string): HeroSpriteConfig {
    const config = HERO_SPRITE_CONFIG[heroId];

    if (config) return config;

    const fallback = HERO_SPRITE_CONFIG[FALLBACK_HERO_ID];

    if (!fallback) {
      throw new Error(`Missing fallback hero sprite: ${FALLBACK_HERO_ID}`);
    }

    return fallback;
  }

  getHeroSpriteKey(heroId: string) {
    return this.getHeroSpriteConfig(heroId).key;
  }

  getHeroPoseColumn(heroId: string, pose: HeroPose) {
    const config = this.getHeroSpriteConfig(heroId);
    const poseMap =
      config.frameCount >= 6 ? DEVOPS_HERO_POSE_COL : COMMON_HERO_POSE_COL;

    return Math.min(poseMap[pose], config.frameCount - 1);
  }

  setHeroPose(
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

  // ══════════════════════════════════════════════════════════════════════
  // Energy regen timer
  // ══════════════════════════════════════════════════════════════════════

  update(_time: number, delta: number) {
    if (!this.profile || this.profile.energy >= 100 || !this.profile.energyRefillAt) return;
    this.energyUpdateAccum += delta;
    if (this.energyUpdateAccum >= 1000) {
      this.energyUpdateAccum -= 1000;
      this.refreshEnergyTimers();
    }
  }

  getEnergyTimerText(): string {
    if (!this.profile || this.profile.energy >= 100 || !this.profile.energyRefillAt) return '';
    const msLeft = new Date(this.profile.energyRefillAt).getTime() - Date.now();
    if (msLeft <= 0) return '⚡ +1 soon…';
    const totalSecs = Math.ceil(msLeft / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `⚡ Next energy in ${mins}:${String(secs).padStart(2, '0')}`;
  }

  refreshEnergyTimers() {
    const timerText = this.getEnergyTimerText();
    if (this.settingsEnergyTimerText && this.settingsPanelOpen) {
      this.settingsEnergyTimerText.setText(timerText);
    }
    if (this.partyEnergyTimerText && this.view === 'party' && this.profile) {
      this.partyEnergyTimerText
        .setText(timerText)
        .setVisible(this.profile.energy < ENERGY_COST && timerText.length > 0);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Thin stubs — delegate to builder/refresh/handler files
  // ══════════════════════════════════════════════════════════════════════

  // Builders — private: called once from create(), must not be called externally
  private buildTitleView() { buildTitleView(this); }
  private buildMapView() { buildMapView(this); }
  private buildPartyView() { buildPartyView(this); }
  private buildHelpView() { buildHelpView(this); }
  private buildHeader() { buildHeader(this); }
  private buildSettingsPanel() { buildSettingsPanel(this); }
  toggleSettingsPanel() { toggleSettingsPanel(this); }
  refreshDailyAction() { refreshDailyAction(this); }
  private buildRaidView() { buildRaidView(this); }
  updateStageBg(raidLevel: number) { updateStageBg(this, raidLevel); }
  private buildResultOverlay() { buildResultOverlay(this); }
  private buildSkillChoiceOverlay() { buildSkillChoiceOverlay(this); }
  private buildNewGameConfirmOverlay() { buildNewGameConfirmOverlay(this); }
  private buildHeroesView() { buildHeroesView(this); }
  private buildDetailSheet() { buildDetailSheet(this); }
  private buildLootView() { buildLootView(this); }

  // Refresh
  refreshHeader() { refreshHeader(this); }
  getOwnedHeroIds() { return getOwnedHeroIds(this); }
  refreshRaidPanel() { refreshRaidPanel(this); }
  refreshMap() { refreshMap(this); }
  refreshPartySelect() { refreshPartySelect(this); }
  refreshRaid() { refreshRaid(this); }
  refreshBoss() { refreshBoss(this); }
  refreshHeroSlots() { refreshHeroSlots(this); }
  refreshButtons() { refreshButtons(this); }
  refreshBattleLog() { refreshBattleLog(this); }
  refreshResultOverlay() { refreshResultOverlay(this); }
  refreshHeroes() { refreshHeroes(this); }
  refreshLoot() { refreshLoot(this); }

  // Handlers — actions
  handleAction(action: BattleAction, selectedSkill?: HeroSkill, skillChoiceIndex = 0) {
    handleAction(this, action, selectedSkill, skillChoiceIndex);
  }
  showHeroSkillBanner(skillName: string, onComplete: () => void) {
    showHeroSkillBanner(this, skillName, onComplete);
  }
  animateBossDefeat() { animateBossDefeat(this); }
  spawnEffectSprite(effectKey: EffectKey, x: number, y: number, size?: number) {
    spawnEffectSprite(this, effectKey, x, y, size);
  }

  // Handlers — navigation
  handleContinue() { handleContinue(this); }
  confirmNewGame() { confirmNewGame(this); }
  openPartySelect(raidLevel: number) { openPartySelect(this, raidLevel); }
  toggleSelectedPartyHero(heroId: string) { toggleSelectedPartyHero(this, heroId); }
  showDetail(heroId: string) { showDetail(this, heroId); }
  hideDetail() { hideDetail(this); }
  openSkillChoice() { openSkillChoice(this); }
  hideSkillChoice() { hideSkillChoice(this); }
  chooseSkill(index: number) { chooseSkill(this, index); }
  showNewGameConfirm() { showNewGameConfirm(this); }
  hideNewGameConfirm() { hideNewGameConfirm(this); }
  handleDailyClaim() { handleDailyClaim(this); }
  handleToggleParty(heroId: string) { handleToggleParty(this, heroId); }
  handleUpgrade(heroId: string) { handleUpgrade(this, heroId); }
  handleGemUpgrade(heroId: string) { handleGemUpgrade(this, heroId); }
  handleLootUpgrade(itemId: string) { handleLootUpgrade(this, itemId); }
  handleStartRaid() { handleStartRaid(this); }
  showBattleTransition(node: RaidNode, battle: BattleState, onComplete: () => void) {
    showBattleTransition(this, node, battle, onComplete);
  }
}
