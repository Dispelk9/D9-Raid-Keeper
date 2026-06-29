import type { GameScene } from '../scenes/GameScene';
import { persistKeeperSave } from '../../keeper/api';
import {
  HEROES,
  getHeroSkillChoicesForLevel,
  getNextHeroSkillUnlock,
} from '../../../shared/game/data/heroes';
import { RAID_NODES, getRaidNode } from '../../../shared/game/data/raidBosses';
import {
  ENERGY_REGEN_MS,
  claimDailyReward,
  DAILY_REWARD,
  createInitialPlayerSave,
  upgradeHero,
  upgradeHeroWithGem,
  upgradeLootWithToken,
  canUpgradeHero,
  getEffectiveHeroRarity,
  getHeroProgress,
  getScaledStats,
  getUpgradeCost,
  sellLoot,
  equipLoot,
  unequipLoot,
  getEquippedHeroId,
  canUpgradeLootWithToken,
  LOOT_TOKEN_UPGRADE_COST,
  LOOT_BONUS_LEVEL_MAX,
} from '../../../shared/game/logic/progression';
import {
  canUseSkill,
  getActiveHero,
  createBattleState,
} from '../../../shared/game/logic/combat';
import { ENERGY_COST } from '../scenes/GameSceneTypes';
import { COLORS, FONT, RARITY_COLOR, W, H, PAD } from '../constants';
import { getEquipmentIcon } from '../builders/heroesLoot';
import { showBattleTransition } from './transition';
export { showBattleTransition };

export function handleContinue(scene: GameScene): void {
  if (!scene.profile) {
    scene.profile = createInitialPlayerSave(scene.username);
  }

  scene.selectedParty = scene.profile.party.slice(0, 4);
  scene.battle = null;
  scene.raidRun = null;
  scene.lastRewards = null;
  scene.mapSelectedLevel = -1;
  scene.setView('map');
  scene.refreshAll();
}

export function confirmNewGame(scene: GameScene): void {
  scene.hideNewGameConfirm();
  scene.profile = createInitialPlayerSave(scene.username);
  scene.selectedParty = scene.profile.party.slice(0, 4);
  scene.battle = null;
  scene.raidRun = null;
  scene.lastRewards = null;
  scene.mapSelectedLevel = -1;
  void persistKeeperSave(scene.profile);
  scene.setView('map');
  scene.refreshAll();
}

const DEPLOY_LABELS = [
  'Start Refinement',
  'Join Daily Standup',
  'Start Alignment Sync',
  'Join Quick Sync',
];

export function openPartySelect(scene: GameScene, raidLevel: number): void {
  if (!scene.profile) return;
  if (raidLevel > scene.profile.raidLevel) {
    scene.showNotification('Clear the floor below first.');
    return;
  }

  scene.raidButtonLabel =
    DEPLOY_LABELS[Math.floor(Math.random() * DEPLOY_LABELS.length)] ??
    'Start Raid';
  scene.selectedRaidLevel = raidLevel;
  scene.mapSelectedLevel = raidLevel; // persist after battle so hero returns here
  const owned = scene.getOwnedHeroIds();
  scene.selectedParty = (
    scene.profile.party.length > 0 ? scene.profile.party : []
  )
    .filter((heroId) => owned.has(heroId))
    .slice(0, 4);

  if (scene.selectedParty.length < 4) {
    HEROES.forEach((hero) => {
      if (scene.selectedParty.length >= 4) return;
      if (owned.has(hero.id) && !scene.selectedParty.includes(hero.id)) {
        scene.selectedParty.push(hero.id);
      }
    });
  }

  scene.setView('party');
}

export function toggleSelectedPartyHero(
  scene: GameScene,
  heroId: string
): void {
  if (!scene.profile || !scene.getOwnedHeroIds().has(heroId)) return;

  if (scene.selectedParty.includes(heroId)) {
    scene.selectedParty = scene.selectedParty.filter((id) => id !== heroId);
  } else if (scene.selectedParty.length < 4) {
    scene.selectedParty = [...scene.selectedParty, heroId];
  } else {
    scene.selectedParty = [...scene.selectedParty.slice(1), heroId];
  }

  scene.refreshPartySelect();
}

export function showDetail(scene: GameScene, heroId: string): void {
  scene.selectedHeroId = heroId;
  const hero = HEROES.find((h) => h.id === heroId);
  if (!hero || !scene.profile) return;
  const owned = scene.profile.heroes.some((entry) => entry.heroId === heroId);

  if (!owned) {
    scene.showNotification(
      'Hero roster refreshed. This hero unlocks automatically.'
    );
    return;
  }

  const progress = getHeroProgress(scene.profile, heroId);
  const stats = getScaledStats(hero, progress.level);
  const cost = getUpgradeCost(progress.level);
  const ready = canUpgradeHero(scene.profile, heroId);

  scene.setHeroPose(scene.detailHeroIcon, hero.id, 'idle');
  scene.detailHeroIcon.setDisplaySize(64, 64);
  scene.detailHeroName.setText(hero.name);
  scene.detailRoleLv.setText(
    `${hero.title} · ${hero.role} · Lv ${progress.level}`
  );
  const rarity = getEffectiveHeroRarity(scene.profile, hero);
  scene.detailRarityText.setColor(
    '#' +
      (RARITY_COLOR[rarity] ?? COLORS.rarityCommon)
        .toString(16)
        .padStart(6, '0')
  );
  scene.detailRarityText.setText(rarity);

  [stats.hp, stats.atk, stats.def, stats.mag, stats.res, stats.spd].forEach(
    (v, i) => scene.detailStatValues[i]?.setText(String(v))
  );

  const skillChoices = getHeroSkillChoicesForLevel(hero, progress.level);
  const nextSkill = getNextHeroSkillUnlock(hero, progress.level);
  scene.detailSkillText.setText(
    [
      ...skillChoices.map((skill, index) => `${index + 1}. ${skill.name}`),
      ...(nextSkill ? [`Lv ${nextSkill.level}: ${nextSkill.skill.name}`] : []),
    ].join('\n')
  );
  scene.detailUltText.setText(
    `${hero.ultimate.name}\n${hero.ultimate.summary}`
  );
  scene.detailUpgradeBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
  if (ready) {
    scene.detailUpgradeBg.setInteractive({ useHandCursor: true });
  } else {
    scene.detailUpgradeBg.disableInteractive();
  }
  scene.detailUpgradeText.setText(
    ready ? `Upgrade · ${cost} gold` : `Need ${cost} gold`
  );

  scene.detailGroup.setVisible(true);
}

export function hideDetail(scene: GameScene): void {
  scene.selectedHeroId = null;
  scene.detailGroup.setVisible(false);
}

export function openSkillChoice(scene: GameScene, heroIndex?: number): void {
  if (scene.bossTurnAnimating) return;
  if (!scene.battle || scene.battle.status !== 'active') return;

  // Resolve which hero is choosing a skill
  const resolvedIndex = heroIndex ?? scene.battle.activeHeroIndex;
  const activeHero =
    heroIndex !== undefined
      ? (scene.battle.heroes[heroIndex] ?? null)
      : getActiveHero(scene.battle);

  if (!activeHero || !canUseSkill(activeHero)) return;

  // Store for chooseSkill to retrieve
  scene.pendingSkillHeroIndex = resolvedIndex;

  scene.skillChoiceHeroText.setText(`${activeHero.name} · Choose Skill`);
  const skillChoices =
    activeHero.skillOptions.length > 0
      ? activeHero.skillOptions
      : [activeHero.skill];

  scene.skillChoiceRefs.forEach((ref, index) => {
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

  scene.skillChoiceGroup.setVisible(true);
}

export function hideSkillChoice(scene: GameScene): void {
  scene.skillChoiceGroup.setVisible(false);
}

export function chooseSkill(scene: GameScene, index: number): void {
  if (!scene.battle || scene.battle.status !== 'active') return;
  const pendingIdx = scene.pendingSkillHeroIndex;
  const hero =
    pendingIdx >= 0
      ? (scene.battle.heroes[pendingIdx] ?? getActiveHero(scene.battle))
      : getActiveHero(scene.battle);
  const skill = hero?.skillOptions[index] ?? hero?.skill;

  if (!skill) return;

  hideSkillChoice(scene);
  scene.showHeroSkillBanner(skill.name, () => {
    if (pendingIdx >= 0) {
      scene.handleHeroAction(pendingIdx, 'skill', skill);
    } else {
      scene.handleAction('skill', skill, index);
    }
  });
  scene.pendingSkillHeroIndex = -1;
}

export function showNewGameConfirm(scene: GameScene): void {
  scene.newGameConfirmGroup.setVisible(true);
}

export function hideNewGameConfirm(scene: GameScene): void {
  scene.newGameConfirmGroup.setVisible(false);
}

function showDailyRewardToast(scene: GameScene): void {
  const D = 60;
  const toastW = W - PAD * 6;
  const toastH = 80;
  const tx = W / 2;
  const ty = 120;

  const bg = scene.add.graphics().setDepth(D).setAlpha(0);
  bg.fillStyle(0x14532d, 0.97);
  bg.fillRoundedRect(tx - toastW / 2, ty - toastH / 2, toastW, toastH, 10);
  bg.lineStyle(2, 0x4ade80, 1);
  bg.strokeRoundedRect(tx - toastW / 2, ty - toastH / 2, toastW, toastH, 10);

  const title = scene.add
    .text(tx, ty - 20, '☀  Daily Reward Claimed!', {
      fontSize: '13px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#bbf7d0',
    })
    .setOrigin(0.5)
    .setDepth(D)
    .setAlpha(0);

  const detail = scene.add
    .text(
      tx,
      ty + 8,
      `💰 +${DAILY_REWARD.gold} Gold   💎 +${DAILY_REWARD.gems} Gems   ⚡ +${DAILY_REWARD.energy} Energy`,
      { fontSize: '11px', fontFamily: FONT.sans, color: '#ffffff' }
    )
    .setOrigin(0.5)
    .setDepth(D)
    .setAlpha(0);

  const objs = [bg, title, detail];
  scene.tweens.add({
    targets: objs,
    alpha: 1,
    duration: 280,
    ease: 'Cubic.Out',
    onComplete: () => {
      scene.time.delayedCall(2200, () => {
        scene.tweens.add({
          targets: objs,
          alpha: 0,
          duration: 480,
          ease: 'Cubic.In',
          onComplete: () => objs.forEach((o) => o.destroy()),
        });
      });
    },
  });
}

export function handleDailyClaim(scene: GameScene): void {
  if (!scene.profile) return;
  const result = claimDailyReward(scene.profile);
  if (!result.claimed) return;
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  showDailyRewardToast(scene);
  scene.refreshAll();
}

export function handleToggleParty(scene: GameScene, heroId: string): void {
  if (!scene.profile) return;
  if (!scene.profile.heroes.some((hero) => hero.heroId === heroId)) return;

  const currentParty =
    scene.profile.party.length > 0
      ? scene.profile.party
      : HEROES.slice(0, 4).map((hero) => hero.id);
  const inParty = currentParty.includes(heroId);
  let nextParty: string[];

  if (inParty) {
    if (currentParty.length <= 1) return;
    nextParty = currentParty.filter((id) => id !== heroId);
  } else if (currentParty.length >= 4) {
    nextParty = [...currentParty.slice(0, 3), heroId];
  } else {
    nextParty = [...currentParty, heroId];
  }

  const nextProfile = {
    ...scene.profile,
    party: nextParty,
    updatedAt: new Date().toISOString(),
  };

  scene.profile = nextProfile;
  scene.battle = createBattleState(nextProfile);
  scene.lastRewards = null;
  scene.resultGroup.setVisible(false);
  void persistKeeperSave(nextProfile);
  scene.refreshAll();
}

export function handleUpgrade(scene: GameScene, heroId: string): void {
  if (!scene.profile) return;
  const result = upgradeHero(scene.profile, heroId);
  if (!result.upgraded) return;
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  // Always reset stale battle/result state so the Raid Clear overlay
  // doesn't re-appear when upgrading from the heroes tab.
  if (!scene.battle || scene.battle.status !== 'active') {
    scene.battle = createBattleState(result.save);
    scene.lastRewards = null;
  }
  const heroName = HEROES.find((h) => h.id === heroId)?.name ?? heroId;
  const progress = result.save.heroes.find((h) => h.heroId === heroId);
  scene.showNotification(
    `${heroName} → Lv ${progress?.level ?? '?'} upgraded!`
  );
  scene.refreshAll();
}

export function handleGemUpgrade(scene: GameScene, heroId: string): void {
  if (!scene.profile) return;
  const result = upgradeHeroWithGem(scene.profile, heroId);
  if (!result.upgraded) {
    scene.showNotification(result.message);
    return;
  }
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  if (!scene.battle || scene.battle.status !== 'active') {
    scene.battle = createBattleState(result.save);
    scene.lastRewards = null;
  }
  scene.showNotification(result.message);
  scene.refreshAll();
}

export function handleLootUpgrade(scene: GameScene, itemId: string): void {
  if (!scene.profile) return;
  const result = upgradeLootWithToken(scene.profile, itemId);
  if (!result.upgraded) {
    scene.showNotification(result.message);
    return;
  }
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  scene.showNotification(result.message);
  scene.refreshAll();
}

export function handleSellLoot(scene: GameScene, itemId: string): void {
  if (!scene.profile) return;
  const result = sellLoot(scene.profile, itemId);
  if (!result.sold) return;
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  scene.showNotification(`Sold for ${result.gold ?? 0} gold.`);
  scene.refreshAll();
}

export function handleEquipLoot(
  scene: GameScene,
  heroId: string,
  itemId: string
): void {
  if (!scene.profile) return;
  const result = equipLoot(scene.profile, heroId, itemId);
  if (!result.equipped) {
    scene.showNotification(result.message ?? 'Cannot equip.');
    return;
  }
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  scene.refreshAll();
}

export function handleUnequipLoot(scene: GameScene, itemId: string): void {
  if (!scene.profile) return;
  const save = unequipLoot(scene.profile, itemId);
  scene.profile = save;
  void persistKeeperSave(save);
  scene.refreshAll();
}

export function moveMapSelection(scene: GameScene, dir: number): void {
  if (!scene.profile) return;
  const maxLevel = Math.min(scene.profile.raidLevel, RAID_NODES.length);
  const newLevel = Math.max(
    1,
    Math.min(maxLevel, scene.mapSelectedLevel + dir)
  );
  if (newLevel === scene.mapSelectedLevel) return;
  scene.mapSelectedLevel = newLevel;
  scene.refreshMap();
}

export function handleStartRaid(scene: GameScene): void {
  if (!scene.profile) return;
  if (scene.selectedParty.length !== 4) {
    scene.showNotification('Choose exactly 4 heroes.');
    return;
  }
  if (scene.profile.energy < ENERGY_COST) {
    scene.showNotification(
      `⚡ Need ${ENERGY_COST} energy to raid (have ${Math.floor(scene.profile.energy)})`
    );
    return;
  }
  const node = getRaidNode(scene.selectedRaidLevel);
  const battleCount =
    node.minBattles +
    Math.floor(Math.random() * (node.maxBattles - node.minBattles + 1));
  const wasAtMax = scene.profile.energy >= 100;
  const nextProfile = {
    ...scene.profile,
    energy: scene.profile.energy - ENERGY_COST,
    energyRefillAt:
      wasAtMax || !scene.profile.energyRefillAt
        ? new Date(Date.now() + ENERGY_REGEN_MS).toISOString()
        : scene.profile.energyRefillAt,
    party: scene.selectedParty,
    updatedAt: new Date().toISOString(),
  };
  scene.profile = nextProfile;
  void persistKeeperSave(nextProfile);
  scene.raidRun = {
    nodeLevel: node.level,
    battleIndex: 1,
    battleCount,
    totalDamage: 0,
    party: scene.selectedParty,
  };
  scene.battle = createBattleState(nextProfile, {
    raidLevel: node.level,
    bossId: node.bossId,
    encounterIndex: 1,
    encounterCount: battleCount,
  });
  scene.lastRewards = null;
  scene.resultGroup.setVisible(false);

  showBattleTransition(scene, node, scene.battle, () => {
    scene.setView('raid');
    scene.updateStageBg(node.level);
    scene.refreshAll();
  });
}

// ── Loot detail sheet ─────────────────────────────────────────────────────

export function showLootDetail(scene: GameScene, itemId: string): void {
  if (!scene.profile) return;
  const item = scene.profile.inventory.find((itm) => itm.id === itemId);
  if (!item) return;

  scene.selectedLootItemId = itemId;
  scene.lootDetailGroup.removeAll(true);

  const objs: Phaser.GameObjects.GameObject[] = [];
  const sheetH = 220;
  const sheetY = H - sheetH;

  // Dim overlay
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
    .setInteractive();
  overlay.on('pointerdown', () => scene.hideLootDetail());
  objs.push(overlay);

  // Sheet BG (rounded top corners, bleeds off-screen at bottom)
  const sheetBg = scene.add.graphics();
  sheetBg.fillStyle(COLORS.white);
  sheetBg.fillRoundedRect(0, sheetY, W, sheetH + 24, {
    tl: 16,
    tr: 16,
    bl: 0,
    br: 0,
  });
  objs.push(sheetBg);

  // Drag handle
  const handle = scene.add.graphics();
  handle.fillStyle(0xd4d4d8);
  handle.fillRoundedRect(W / 2 - 20, sheetY + 8, 40, 4, 2);
  objs.push(handle);

  // Close button
  const closeHit = scene.add
    .rectangle(W - PAD * 2 - 14, sheetY + 22, 32, 32, 0, 0)
    .setInteractive({ useHandCursor: true });
  closeHit.on('pointerdown', () => scene.hideLootDetail());
  objs.push(closeHit);
  objs.push(
    scene.add
      .text(W - PAD * 2 - 14, sheetY + 22, '✕', {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#52525b',
      })
      .setOrigin(0.5)
  );

  // Item icon
  objs.push(
    scene.add
      .text(PAD * 2 + 20, sheetY + 36, getEquipmentIcon(item.id), {
        fontSize: '28px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(0.5)
  );

  // Name, rarity+slot, bonus
  const textX = PAD * 2 + 44;
  objs.push(
    scene.add
      .text(textX, sheetY + 20, item.name, {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: W - textX - PAD * 4 - 32 },
      })
      .setOrigin(0, 0)
  );

  const rarityHex =
    '#' +
    (RARITY_COLOR[item.rarity] ?? COLORS.rarityCommon)
      .toString(16)
      .padStart(6, '0');
  const statLabel =
    (
      {
        hp: 'HP',
        atk: 'ATK',
        def: 'DEF',
        mag: 'MAG',
        res: 'RES',
        spd: 'SPD',
      } as Record<string, string>
    )[item.stat] ?? item.stat.toUpperCase();
  objs.push(
    scene.add
      .text(
        textX,
        sheetY + 36,
        `${item.rarity} · ${item.slot} · +${statLabel}`,
        {
          fontSize: '10px',
          fontFamily: FONT.sans,
          color: rarityHex,
        }
      )
      .setOrigin(0, 0)
  );

  const bonusLevel = item.bonusLevel ?? 0;
  objs.push(
    scene.add
      .text(
        textX,
        sheetY + 50,
        `DMG +${item.bonus}  ·  Tier ${bonusLevel}/${LOOT_BONUS_LEVEL_MAX}`,
        {
          fontSize: '11px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#059669',
        }
      )
      .setOrigin(0, 0)
  );

  // Separator 1
  const sep1 = scene.add.graphics();
  sep1.lineStyle(1, COLORS.border, 1);
  sep1.lineBetween(PAD, sheetY + 68, W - PAD, sheetY + 68);
  objs.push(sep1);

  // ── Equip section ──────────────────────────────────────────────────────
  const equippedHeroId = getEquippedHeroId(scene.profile, item.id);

  if (equippedHeroId) {
    const equippedHero = HEROES.find((h) => h.id === equippedHeroId);
    objs.push(
      scene.add
        .text(
          PAD * 2,
          sheetY + 78,
          `⚔ Equipped: ${equippedHero?.name ?? equippedHeroId}`,
          {
            fontSize: '12px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#0369a1',
          }
        )
        .setOrigin(0, 0)
    );

    const unequipBg = scene.add
      .rectangle(W / 2, sheetY + 110, W - PAD * 4, 32, 0x374151)
      .setInteractive({ useHandCursor: true });
    unequipBg.on('pointerdown', () => {
      scene.handleUnequipLoot(itemId);
      scene.hideLootDetail();
    });
    objs.push(unequipBg);
    objs.push(
      scene.add
        .text(W / 2, sheetY + 110, '✕  Unequip', {
          fontSize: '12px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );
  } else {
    objs.push(
      scene.add
        .text(PAD * 2, sheetY + 76, 'EQUIP TO HERO', {
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        })
        .setOrigin(0, 0)
    );
    buildHeroEquipButtons(scene, objs, itemId, sheetY + 88);
  }

  // Separator 2
  const sep2 = scene.add.graphics();
  sep2.lineStyle(1, COLORS.border, 1);
  sep2.lineBetween(PAD, sheetY + 136, W - PAD, sheetY + 136);
  objs.push(sep2);

  // ── Action buttons ─────────────────────────────────────────────────────
  const half = (W - PAD * 3) / 2;
  const btnY = sheetY + 164;
  const btnH = 44;

  const canUpgrade = canUpgradeLootWithToken(scene.profile, item.id);
  const isMax = bonusLevel >= LOOT_BONUS_LEVEL_MAX;
  const upgBg = scene.add
    .rectangle(
      PAD + half / 2,
      btnY,
      half,
      btnH,
      isMax ? COLORS.btnDisabled : canUpgrade ? 0x0f766e : COLORS.btnDisabled
    )
    .setInteractive({ useHandCursor: canUpgrade });
  if (canUpgrade) {
    upgBg.on('pointerdown', () => {
      scene.handleLootUpgrade(itemId);
      scene.hideLootDetail();
    });
  }
  objs.push(upgBg);
  objs.push(
    scene.add
      .text(
        PAD + half / 2,
        btnY,
        isMax ? 'MAX' : `⬆  ${LOOT_TOKEN_UPGRADE_COST} Tokens`,
        {
          fontSize: '12px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        }
      )
      .setOrigin(0.5)
  );

  const sellBg = scene.add
    .rectangle(PAD * 2 + half + half / 2, btnY, half, btnH, 0xdc2626)
    .setInteractive({ useHandCursor: true });
  sellBg.on('pointerdown', () => {
    scene.handleSellLoot(itemId);
    scene.hideLootDetail();
  });
  objs.push(sellBg);
  objs.push(
    scene.add
      .text(PAD * 2 + half + half / 2, btnY, '💰  Sell', {
        fontSize: '12px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5)
  );

  scene.lootDetailGroup.add(objs);
  scene.lootDetailGroup.setVisible(true);
}

function buildHeroEquipButtons(
  scene: GameScene,
  objs: Phaser.GameObjects.GameObject[],
  itemId: string,
  baseY: number
): void {
  if (!scene.profile) return;
  const party = scene.profile.party.slice(0, 4);
  const equippedLoot = scene.profile.equippedLoot ?? {};
  const n = party.length;
  if (n === 0) return;

  const gap = 4;
  const btnW = Math.floor((W - PAD * 2 - gap * (n - 1)) / n);
  const btnH = 36;

  party.forEach((heroId, i) => {
    const hero = HEROES.find((h) => h.id === heroId);
    const slots = equippedLoot[heroId]?.length ?? 0;
    const isFull = slots >= 3;
    const bx = PAD + i * (btnW + gap);

    const bg = scene.add
      .rectangle(
        bx + btnW / 2,
        baseY + btnH / 2,
        btnW,
        btnH,
        isFull ? COLORS.btnDisabled : 0x374151
      )
      .setInteractive({ useHandCursor: !isFull });
    if (!isFull) {
      bg.on('pointerdown', () => {
        scene.handleEquipLoot(heroId, itemId);
        scene.hideLootDetail();
      });
    }
    objs.push(bg);

    const firstName = (hero?.name ?? heroId).split(' ')[0] ?? heroId;
    objs.push(
      scene.add
        .text(bx + btnW / 2, baseY + 6, firstName, {
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#ffffff',
        })
        .setOrigin(0.5, 0)
    );

    objs.push(
      scene.add
        .text(bx + btnW / 2, baseY + 20, isFull ? 'Full' : `${slots}/3`, {
          fontSize: '9px',
          fontFamily: FONT.sans,
          color: isFull ? '#fca5a5' : '#86efac',
        })
        .setOrigin(0.5, 0)
    );
  });
}

export function hideLootDetail(scene: GameScene): void {
  scene.selectedLootItemId = null;
  scene.lootDetailGroup.removeAll(true);
  scene.lootDetailGroup.setVisible(false);
}
