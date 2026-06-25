import type { GameScene } from '../scenes/GameScene';
import { persistKeeperSave } from '../../keeper/api';
import { HEROES, getHeroSkillChoicesForLevel, getNextHeroSkillUnlock } from '../../../shared/game/data/heroes';
import { getRaidNode } from '../../../shared/game/data/raidBosses';
import {
  ENERGY_REGEN_MS, claimDailyReward, createInitialPlayerSave, upgradeHero,
  upgradeHeroWithGem, upgradeLootWithToken, canUpgradeHero,
  getEffectiveHeroRarity, getHeroProgress, getScaledStats, getUpgradeCost
} from '../../../shared/game/logic/progression';
import { canUseSkill, getActiveHero, createBattleState } from '../../../shared/game/logic/combat';
import { fmt, ENERGY_COST } from '../scenes/GameSceneTypes';
import { COLORS, RARITY_COLOR } from '../constants';
import { showBattleTransition } from './transition';
export { showBattleTransition };

export function handleContinue(scene: GameScene): void {
  if (!scene.profile) {
    scene.profile = createInitialPlayerSave(scene.username);
  }

  scene.selectedParty = scene.profile.party.slice(0, 5);
  scene.battle = null;
  scene.raidRun = null;
  scene.lastRewards = null;
  scene.setView('map');
  scene.refreshAll();
}

export function confirmNewGame(scene: GameScene): void {
  scene.hideNewGameConfirm();
  scene.profile = createInitialPlayerSave(scene.username);
  scene.selectedParty = scene.profile.party.slice(0, 5);
  scene.battle = null;
  scene.raidRun = null;
  scene.lastRewards = null;
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

  scene.raidButtonLabel = DEPLOY_LABELS[Math.floor(Math.random() * DEPLOY_LABELS.length)] ?? 'Start Raid';
  scene.selectedRaidLevel = raidLevel;
  const owned = scene.getOwnedHeroIds();
  scene.selectedParty = (scene.profile.party.length > 0 ? scene.profile.party : [])
    .filter((heroId) => owned.has(heroId))
    .slice(0, 5);

  if (scene.selectedParty.length < 5) {
    HEROES.forEach((hero) => {
      if (scene.selectedParty.length >= 5) return;
      if (owned.has(hero.id) && !scene.selectedParty.includes(hero.id)) {
        scene.selectedParty.push(hero.id);
      }
    });
  }

  scene.setView('party');
}

export function toggleSelectedPartyHero(scene: GameScene, heroId: string): void {
  if (!scene.profile || !scene.getOwnedHeroIds().has(heroId)) return;

  if (scene.selectedParty.includes(heroId)) {
    scene.selectedParty = scene.selectedParty.filter((id) => id !== heroId);
  } else if (scene.selectedParty.length < 5) {
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
    scene.showNotification('Hero roster refreshed. This hero unlocks automatically.');
    return;
  }

  const progress = getHeroProgress(scene.profile, heroId);
  const stats = getScaledStats(hero, progress.level);
  const cost = getUpgradeCost(progress.level);
  const ready = canUpgradeHero(scene.profile, heroId);

  scene.setHeroPose(scene.detailHeroIcon, hero.id, 'idle');
  scene.detailHeroIcon.setScale(64 / scene.getHeroSpriteConfig(hero.id).frameW);
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

export function openSkillChoice(scene: GameScene): void {
  if (scene.bossTurnAnimating) return;
  if (!scene.battle || scene.battle.status !== 'active') return;
  const activeHero = getActiveHero(scene.battle);

  if (!activeHero || !canUseSkill(activeHero)) return;

  scene.skillChoiceHeroText.setText(`${activeHero.name} · Choose Skill`);
  const skillChoices = activeHero.skillOptions.length > 0
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
  const activeHero = getActiveHero(scene.battle);
  const skill = activeHero?.skillOptions[index] ?? activeHero?.skill;

  if (!skill) return;

  hideSkillChoice(scene);
  scene.showHeroSkillBanner(skill.name, () => {
    scene.handleAction('skill', skill, index);
  });
}

export function showNewGameConfirm(scene: GameScene): void {
  scene.newGameConfirmGroup.setVisible(true);
}

export function hideNewGameConfirm(scene: GameScene): void {
  scene.newGameConfirmGroup.setVisible(false);
}

export function handleDailyClaim(scene: GameScene): void {
  if (!scene.profile) return;
  const result = claimDailyReward(scene.profile);
  if (!result.claimed) return;
  scene.profile = result.save;
  void persistKeeperSave(result.save);
  scene.refreshAll();
}

export function handleToggleParty(scene: GameScene, heroId: string): void {
  if (!scene.profile) return;
  if (!scene.profile.heroes.some((hero) => hero.heroId === heroId)) return;

  const currentParty =
    scene.profile.party.length > 0
      ? scene.profile.party
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
  scene.showNotification(`${heroName} → Lv ${progress?.level ?? '?'} upgraded!`);
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

export function handleStartRaid(scene: GameScene): void {
  if (!scene.profile) return;
  if (scene.selectedParty.length !== 5) {
    scene.showNotification('Choose exactly 5 heroes.');
    return;
  }
  if (scene.profile.energy < ENERGY_COST) {
    scene.showNotification(`⚡ Need ${ENERGY_COST} energy to raid (have ${Math.floor(scene.profile.energy)})`);
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
    energyRefillAt: (wasAtMax || !scene.profile.energyRefillAt)
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

