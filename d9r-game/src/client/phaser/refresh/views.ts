import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD, RARITY_COLOR } from '../constants';
import { HEROES, getHeroSkillChoicesForLevel } from '../../../shared/game/data/heroes';
import { RAID_NODES, getBossAppearance, getRaidNode } from '../../../shared/game/data/raidBosses';
import {
  HERO_GEM_UPGRADE_COST, LOOT_BONUS_LEVEL_MAX, LOOT_TOKEN_UPGRADE_COST,
  canUpgradeHero, canUpgradeHeroWithGem, canUpgradeLootWithToken,
  getEffectiveHeroRarity, getHeroProgress, getLootDamageBonus, getScaledStats, getUpgradeCost,
  isHeroFullyUpgraded
} from '../../../shared/game/logic/progression';
import { fmt, fmtCompact, ENERGY_COST } from '../scenes/GameSceneTypes';

// Equipment icon map (inlined from GameScene static property)
const EQUIPMENT_ICONS: Record<string, string> = {
  'usb-debug-stick':        '💾',
  'mechanical-keyboard':    '⌨️',
  'company-macbook':        '💻',
  'standing-desk':          '🪑',
  'noise-canceling-hoodie': '🧥',
  'lucky-deploy-pen':       '✒️',
  'root-access-yubikey':    '🔑',
};

function getEquipmentIcon(itemId: string): string {
  const baseId = itemId.replace(/-\d+$/, '');
  return EQUIPMENT_ICONS[baseId] ?? '📦';
}

export function refreshHeader(scene: GameScene): void {
  if (!scene.profile) return;
  scene.raidLvText.setText(
    scene.profile.raidLevel > RAID_NODES.length ? 'MAX' : String(scene.profile.raidLevel)
  );
}

export function getOwnedHeroIds(scene: GameScene): Set<string> {
  return new Set(scene.profile?.heroes.map((hero) => hero.heroId) ?? []);
}

export function refreshRaidPanel(scene: GameScene): void {
  const raid = scene.raidStatus;
  const barW = W - PAD * 2;

  if (!raid) {
    scene.raidPanelBossText.setText('🔥 Loading community raid…');
    scene.raidPanelUserText.setText('');
    scene.raidPanelBarFill.setDisplaySize(0, 10);
    scene.raidPanelPctText.setText('');
    scene.raidPanelTopText.setText('');
    return;
  }

  const pct     = raid.hpMax > 0 ? raid.hpRemaining / raid.hpMax : 0;
  const fillW   = Math.max(1, Math.round(barW * pct));
  const pctStr  = `${Math.round(pct * 100)}% HP remaining`;
  const topStr  = raid.top10.length === 0
    ? 'No contributors yet — be the first!'
    : raid.top10
        .slice(0, 3)
        .map((e, i) => `${['🥇','🥈','🥉'][i] ?? ''}${e.username}: ${fmtCompact(e.damage)}`)
        .join('  ');

  scene.raidPanelBossText.setText(`🔥 ${raid.bossName}  ·  Week ${raid.week.split('-')[1] ?? ''}`);
  scene.raidPanelUserText.setText(`Your dmg: ${fmtCompact(raid.userDamage)}`);
  scene.raidPanelBarFill.setPosition(PAD, scene.raidPanelBarFill.y).setDisplaySize(fillW, 10);
  scene.raidPanelPctText.setText(pctStr);
  scene.raidPanelTopText.setText(topStr);
}

export function refreshMap(scene: GameScene): void {
  if (!scene.profile) return;

  scene.mapNodeRefs.forEach((ref) => {
    const completed = ref.level < scene.profile!.raidLevel;
    const unlocked = ref.level <= scene.profile!.raidLevel;
    const current = ref.level === Math.min(scene.profile!.raidLevel, RAID_NODES.length);
    const fill = completed ? 0xdcfce7 : unlocked ? 0xffffff : 0xe5e7eb;
    const stroke = completed ? 0x16a34a : current ? 0xf97316 : 0x94a3b8;

    ref.bg.setFillStyle(fill, unlocked ? 1 : 0.72);
    ref.ring.clear();
    ref.ring.lineStyle(current ? 4 : 2, stroke, unlocked ? 1 : 0.45);
    ref.ring.strokeCircle(ref.bg.x, ref.bg.y, current ? 39 : 36);
    ref.label.setAlpha(unlocked ? 1 : 0.35);
    ref.subLabel
      .setText(completed ? '✓ Done' : unlocked ? ref.name : '🔒')
      .setColor(completed ? '#15803d' : unlocked ? '#374151' : '#94a3b8');

    if (unlocked) {
      ref.hit.setInteractive({ useHandCursor: true });
    } else {
      ref.hit.disableInteractive();
    }
  });
}

export function refreshPartySelect(scene: GameScene): void {
  if (!scene.profile) return;

  const owned = getOwnedHeroIds(scene);
  scene.selectedParty = scene.selectedParty
    .filter((heroId) => owned.has(heroId))
    .slice(0, 5);

  const node = getRaidNode(scene.selectedRaidLevel);
  scene.partyTitleText.setText(`Floor ${node.level}: ${node.name}`);

  scene.partyHeroRefs.forEach((ref) => {
    const hero = HEROES.find((candidate) => candidate.id === ref.heroId);
    const isOwned = owned.has(ref.heroId);
    const selected = scene.selectedParty.includes(ref.heroId);
    const rarity = hero && scene.profile ? getEffectiveHeroRarity(scene.profile, hero) : null;

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
    const rarityHex = rarity
      ? '#' + (RARITY_COLOR[rarity] ?? COLORS.rarityCommon).toString(16).padStart(6, '0')
      : '#71717a';
    ref.subLabel
      .setText(isOwned ? `${hero?.role ?? ''} · ${rarity ?? ''}` : 'Locked')
      .setAlpha(isOwned ? 1 : 0.5)
      .setColor(isOwned ? rarityHex : '#94a3b8');
    ref.check.setText(selected ? 'OK' : '');

    if (isOwned) {
      ref.bg.setInteractive({ useHandCursor: true });
    } else {
      ref.bg.disableInteractive();
    }
  });

  const ready = scene.selectedParty.length === 5 && scene.profile.energy >= ENERGY_COST;
  scene.partyStartBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
  scene.partyStartText.setText(
    scene.selectedParty.length < 5
      ? `Choose ${5 - scene.selectedParty.length} more`
      : scene.profile.energy < ENERGY_COST
        ? `Need ${ENERGY_COST} energy`
        : `Start Raid · ${ENERGY_COST} energy`
  );
  if (ready) {
    scene.partyStartBg.setInteractive({ useHandCursor: true });
  } else {
    scene.partyStartBg.disableInteractive();
  }
  const timerStr = scene.getEnergyTimerText();
  scene.partyEnergyTimerText
    .setText(timerStr)
    .setVisible(scene.profile.energy < ENERGY_COST && timerStr.length > 0);
}

export function refreshRaid(scene: GameScene): void {
  if (!scene.battle || !scene.profile) return;
  scene.refreshBoss();
  scene.refreshHeroSlots();
  scene.refreshButtons();
  scene.refreshBattleLog();
  scene.refreshResultOverlay();
}

export function refreshResultOverlay(scene: GameScene): void {
  if (!scene.battle || !scene.profile) return;
  const done = scene.battle.status !== 'active';
  scene.resultGroup.setVisible(done && !scene.pendingResultShow && scene.view === 'raid');

  if (done) {
    const won = scene.battle.status === 'won';
    scene.resultStatusText.setText(won ? 'RAID CLEARED' : 'RAID FAILED');
    scene.resultDamageText.setText(fmt(scene.battle.totalDamage));
    scene.resultRewardsText.setText(
      scene.lastRewards
        ? `+${scene.lastRewards.gold} gold  ·  +${scene.lastRewards.gems} gems  ·  +${scene.lastRewards.exp} EXP`
        : ''
    );

    // Rebuild loot section
    scene.resultLootGroup.removeAll(true);
    const panelY = H / 2 - 300 / 2;
    const equipment = scene.lastRewards?.equipment ?? [];
    if (equipment.length > 0) {
      const lootHeaderY = panelY + 102;
      const header = scene.add.text(PAD * 5, lootHeaderY, 'LOOT FOUND', {
        fontSize: '8px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#a1a1aa',
      });
      scene.resultLootGroup.add(header);
      equipment.slice(0, 2).forEach((item, idx) => {
        const itemY = lootHeaderY + 14 + idx * 34;
        const rowBg = scene.add.graphics();
        rowBg.fillStyle(0xf5f5f4);
        rowBg.fillRoundedRect(PAD * 5, itemY, W - PAD * 10, 28, 5);
        const iconT = scene.add.text(PAD * 6, itemY + 14, getEquipmentIcon(item.id), {
          fontSize: '16px', fontFamily: FONT.emoji,
        }).setOrigin(0, 0.5);
        const nameT = scene.add.text(PAD * 6 + 22, itemY + 6, item.name, {
          fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#18181b',
        }).setOrigin(0, 0);
        const rarityColor = '#' + (RARITY_COLOR[item.rarity] ?? COLORS.rarityCommon).toString(16).padStart(6, '0');
        const rarityT = scene.add.text(PAD * 6 + 22, itemY + 17, item.rarity, {
          fontSize: '9px', fontFamily: FONT.sans, color: rarityColor,
        }).setOrigin(0, 0);
        const dmgT = scene.add.text(W - PAD * 6, itemY + 14, `DMG +${item.bonus}`, {
          fontSize: '10px', fontStyle: 'bold', fontFamily: FONT.sans, color: '#059669',
        }).setOrigin(1, 0.5);
        scene.resultLootGroup.add([rowBg, iconT, nameT, rarityT, dmgT]);
      });
    }

    const showNext = won && scene.profile.raidLevel <= RAID_NODES.length;
    scene.resultNextBg.setVisible(showNext);
    scene.resultNextIcon.setVisible(showNext);
    scene.resultNextName.setVisible(showNext);
    if (showNext) {
      const next = getBossAppearance(scene.profile.raidLevel);
      scene.resultNextIcon.setText('>');
      scene.resultNextName.setText(
        `Next: ${next.name}  ·  Lv ${scene.profile.raidLevel}`
      );
    }
  }
}

export function refreshHeroes(scene: GameScene): void {
  if (!scene.profile) return;
  const partySize = scene.profile.party.length;
  scene.heroCardRefs.forEach(
    ({ heroId, levelText, rarityText, btnBg, partyBg, partyText, gemBg, gemText }) => {
      const template = HEROES.find((h) => h.id === heroId);
      const owned = scene.profile!.heroes.some((hero) => hero.heroId === heroId);
      const progress = getHeroProgress(scene.profile!, heroId);
      const rarity = template
        ? getEffectiveHeroRarity(scene.profile!, template)
        : 'Common';
      const ready = owned && canUpgradeHero(scene.profile!, heroId);
      const gemReady = owned && canUpgradeHeroWithGem(scene.profile!, heroId);
      const starLevel = progress.starLevel ?? 0;
      const inParty = scene.profile!.party.includes(heroId);
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
      const fullyMaxed = owned && isHeroFullyUpgraded(scene.profile!, heroId);
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

export function refreshLoot(scene: GameScene): void {
  if (!scene.profile) return;
  const vals = [
    fmt(scene.profile.bestRaidDamage),
    fmt(scene.profile.totalRaidDamage),
    `+${fmt(getLootDamageBonus(scene.profile))}`,
    String(scene.profile.inventory.length),
  ];
  vals.forEach((v, i) => scene.lootStatTexts[i]?.setText(v));

  scene.lootItemsGroup.removeAll(true);
  const items = scene.profile.inventory.slice(-8).reverse();
  items.forEach((item, i) => {
    const rowH = 46;
    const iy = i * rowH;
    const ibg = scene.add.graphics();
    ibg.fillStyle(0xf5f5f4);
    ibg.fillRoundedRect(PAD, iy + PAD, W - PAD * 2, rowH - 2, 6);
    const iconT = scene.add.text(PAD + 6, iy + PAD + rowH / 2 - 4, getEquipmentIcon(item.id), {
      fontSize: '18px',
      fontFamily: FONT.emoji,
    }).setOrigin(0, 0.5);
    const nameT = scene.add.text(PAD + 28, iy + PAD + 5, item.name, {
      fontSize: '11px',
      fontStyle: 'bold',
      fontFamily: FONT.sans,
      color: '#18181b',
    });
    const bonusLevel = item.bonusLevel ?? 0;
    const bonusLabel =
      `DMG +${item.bonus}` +
      (bonusLevel ? `  Upgrade +${bonusLevel}/${LOOT_BONUS_LEVEL_MAX}` : '');
    const bonusT = scene.add.text(
      PAD + 28,
      iy + PAD + 20,
      bonusLabel,
      {
        fontSize: '10px',
        fontFamily: FONT.sans,
        color: '#71717a',
      }
    );
    const canUpgrade = canUpgradeLootWithToken(scene.profile!, item.id);
    const isMax = (item.bonusLevel ?? 0) >= LOOT_BONUS_LEVEL_MAX;
    const upgBtnW = 70;
    const upgBtnX = W - PAD - upgBtnW / 2;
    const upgBtnY = iy + PAD + rowH / 2 - 4;
    const upgBg = scene.add
      .rectangle(upgBtnX, upgBtnY, upgBtnW, 22,
        isMax ? COLORS.btnDisabled : canUpgrade ? 0x0f766e : COLORS.btnDisabled)
      .setInteractive({ useHandCursor: canUpgrade });
    const upgText = scene.add
      .text(upgBtnX, upgBtnY,
        isMax ? 'MAX' : `+10  ${LOOT_TOKEN_UPGRADE_COST}T`, {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    if (canUpgrade) {
      const capturedId = item.id;
      upgBg.on('pointerdown', () => scene.handleLootUpgrade(capturedId));
    }
    scene.lootItemsGroup.add([ibg, iconT, nameT, bonusT, upgBg, upgText]);
  });

  if (items.length === 0) {
    scene.lootItemsGroup.add(
      scene.add
        .text(W / 2, 50, 'Clear raids to earn gear.', {
          fontSize: '13px',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        })
        .setOrigin(0.5)
    );
  }
}
