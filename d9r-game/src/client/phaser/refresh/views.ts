import type { GameScene } from '../scenes/GameScene';
import { COLORS, FONT, H, W, PAD, RARITY_COLOR } from '../constants';
import { HEROES } from '../../../shared/game/data/heroes';
import {
  RAID_NODES,
  getBossAppearance,
  getRaidNode,
} from '../../../shared/game/data/raidBosses';
import { HERO_SPRITE_CONFIG } from '../scenes/BootScene';
import { FALLBACK_HERO_ID } from '../scenes/GameSceneTypes';
import {
  drawMapPath,
  getMapNodePositions,
  MAP_TILE_SZ,
  MAP_HERO_SZ,
} from '../builders/mapView';
import { getEquipmentIcon } from '../builders/heroesLoot';
import {
  HERO_GEM_UPGRADE_COST,
  canUpgradeHero,
  canUpgradeHeroWithGem,
  getEffectiveHeroRarity,
  getHeroProgress,
  getLootStatBonuses,
  isHeroFullyUpgraded,
  getEquippedHeroId,
} from '../../../shared/game/logic/progression';
import { fmt, fmtCompact, ENERGY_COST } from '../scenes/GameSceneTypes';

export function refreshHeader(scene: GameScene): void {
  if (!scene.profile) return;
  scene.raidLvText.setText(
    scene.profile.raidLevel > RAID_NODES.length
      ? 'MAX'
      : String(scene.profile.raidLevel)
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

  const pct = raid.hpMax > 0 ? raid.hpRemaining / raid.hpMax : 0;
  const fillW = Math.max(1, Math.round(barW * pct));
  const pctStr = `${Math.round(pct * 100)}% HP remaining`;
  const topStr =
    raid.top10.length === 0
      ? 'No contributors yet — be the first!'
      : raid.top10
          .slice(0, 3)
          .map(
            (e, i) =>
              `${['🥇', '🥈', '🥉'][i] ?? ''}${e.username}: ${fmtCompact(e.damage)}`
          )
          .join('  ');

  scene.raidPanelBossText.setText(
    `🔥 ${raid.bossName}  ·  Week ${raid.week.split('-')[1] ?? ''}`
  );
  scene.raidPanelUserText.setText(`Your dmg: ${fmtCompact(raid.userDamage)}`);
  scene.raidPanelBarFill
    .setPosition(PAD, scene.raidPanelBarFill.y)
    .setDisplaySize(fillW, 10);
  scene.raidPanelPctText.setText(pctStr);
  scene.raidPanelTopText.setText(topStr);
}

export function refreshMap(scene: GameScene): void {
  if (!scene.profile) return;

  const totalFloors = RAID_NODES.length;

  // Auto-initialise to the active floor when first entering map view
  if (scene.mapSelectedLevel < 1) {
    scene.mapSelectedLevel = Math.min(scene.profile.raidLevel, totalFloors);
  }

  scene.mapNodeRefs.forEach((ref) => {
    const node = RAID_NODES.find((n) => n.level === ref.level);
    const isHidden = node?.isHiddenFloor ?? false;
    const completed = ref.level < scene.profile!.raidLevel;
    const current =
      ref.level === Math.min(scene.profile!.raidLevel, totalFloors);
    const selected = ref.level === scene.mapSelectedLevel;
    const accessible = isHidden
      ? scene.profile!.raidLevel > 6
      : ref.level <= scene.profile!.raidLevel;

    // Obstacle block fill
    const fill = completed
      ? 0x14532d
      : current
        ? 0x7c2d12
        : accessible
          ? 0x1e293b
          : 0x0f172a;
    ref.bg.setFillStyle(fill, accessible ? 1 : 0.45);

    // Obstacle ring border — selected (amber) overrides current (orange) overrides completed (green)
    ref.ring.clear();
    const strokeColor = selected
      ? 0xfbbf24
      : completed
        ? 0x22c55e
        : current
          ? 0xf97316
          : 0x334155;
    const strokeW = selected ? 2 : current ? 2 : 1;
    ref.ring.lineStyle(strokeW, strokeColor, accessible ? 0.9 : 0.2);
    ref.ring.strokeRect(ref.floorX, ref.floorY, ref.floorW, ref.floorH);

    // Status icon
    ref.label
      .setText(completed ? '✓' : current ? '▶' : isHidden ? '?' : '🔒')
      .setAlpha(accessible ? 1 : 0.35);

    // Boss name color
    ref.subLabel
      .setText(isHidden && !accessible ? '???' : ref.name)
      .setColor(
        completed
          ? '#22c55e'
          : current
            ? '#fb923c'
            : accessible
              ? '#64748b'
              : '#1e293b'
      );

    // Boss mini-sprite visibility
    const bossImg = (scene as any)[`_bossMini_${ref.level}`] as
      | Phaser.GameObjects.Image
      | undefined;
    if (bossImg) {
      bossImg.setAlpha(isHidden && !accessible ? 0 : accessible ? 1 : 0.2);
    }

    if (accessible) {
      ref.hit.setInteractive({ useHandCursor: true });
    } else {
      ref.hit.disableInteractive();
    }
  });

  // ── Redraw path with current unlock state ────────────────────────────────
  const pathGfx = (scene as any)._mapPathGfx as
    | Phaser.GameObjects.Graphics
    | undefined;
  if (pathGfx) {
    drawMapPath(pathGfx, getMapNodePositions(), scene.profile.raidLevel);
  }

  // ── Place hero at the current raidLevel node ──────────────────────────────
  if (scene.mapRunnerHeroImg) {
    const nodePos = getMapNodePositions();
    const targetLevel = Math.min(scene.profile.raidLevel, totalFloors);
    const targetPos =
      nodePos.find((p) => p.level === targetLevel) ?? nodePos[0]!;
    const heroTopY = targetPos.cy - Math.floor(MAP_TILE_SZ / 2) - 4;

    scene.tweens.add({
      targets: scene.mapRunnerHeroImg,
      x: targetPos.cx,
      y: heroTopY,
      duration: 350,
      ease: 'Cubic.Out',
    });

    const firstHeroId = scene.profile.party[0] ?? FALLBACK_HERO_ID;
    const heroConfig =
      HERO_SPRITE_CONFIG[firstHeroId] ?? HERO_SPRITE_CONFIG[FALLBACK_HERO_ID]!;
    scene.mapRunnerHeroImg
      .setTexture(heroConfig.key)
      .setDisplaySize(MAP_HERO_SZ, MAP_HERO_SZ);
    scene.setHeroPose(scene.mapRunnerHeroImg, firstHeroId, 'idle');
  }
}

export function refreshPartySelect(scene: GameScene): void {
  if (!scene.profile) return;

  const owned = getOwnedHeroIds(scene);
  scene.selectedParty = scene.selectedParty
    .filter((heroId) => owned.has(heroId))
    .slice(0, 4);

  const node = getRaidNode(scene.selectedRaidLevel);
  scene.partyTitleText.setText(`Floor ${node.level}: ${node.name}`);

  scene.partyHeroRefs.forEach((ref) => {
    const hero = HEROES.find((candidate) => candidate.id === ref.heroId);
    const isOwned = owned.has(ref.heroId);
    const selected = scene.selectedParty.includes(ref.heroId);
    const rarity =
      hero && scene.profile
        ? getEffectiveHeroRarity(scene.profile, hero)
        : null;

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
      ? '#' +
        (RARITY_COLOR[rarity] ?? COLORS.rarityCommon)
          .toString(16)
          .padStart(6, '0')
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

  const ready =
    scene.selectedParty.length === 4 && scene.profile.energy >= ENERGY_COST;
  scene.partyStartBg.setFillStyle(ready ? COLORS.ink : COLORS.btnDisabled);
  scene.partyStartText.setText(
    scene.selectedParty.length < 4
      ? `Choose ${4 - scene.selectedParty.length} more`
      : scene.profile.energy < ENERGY_COST
        ? `⚡ Need ${ENERGY_COST} energy`
        : `${scene.raidButtonLabel} · ⚡${ENERGY_COST}`
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
  scene.resultGroup.setVisible(
    done && !scene.pendingResultShow && scene.view === 'raid'
  );

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
        fontSize: '8px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#a1a1aa',
      });
      scene.resultLootGroup.add(header);
      equipment.slice(0, 2).forEach((item, idx) => {
        const itemY = lootHeaderY + 14 + idx * 34;
        const rowBg = scene.add.graphics();
        rowBg.fillStyle(0xf5f5f4);
        rowBg.fillRoundedRect(PAD * 5, itemY, W - PAD * 10, 28, 5);
        const iconT = scene.add
          .text(PAD * 6, itemY + 14, getEquipmentIcon(item.id), {
            fontSize: '16px',
            fontFamily: FONT.emoji,
          })
          .setOrigin(0, 0.5);
        const nameT = scene.add
          .text(PAD * 6 + 22, itemY + 6, item.name, {
            fontSize: '10px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#18181b',
          })
          .setOrigin(0, 0);
        const rarityColor =
          '#' +
          (RARITY_COLOR[item.rarity] ?? COLORS.rarityCommon)
            .toString(16)
            .padStart(6, '0');
        const rarityT = scene.add
          .text(PAD * 6 + 22, itemY + 17, item.rarity, {
            fontSize: '9px',
            fontFamily: FONT.sans,
            color: rarityColor,
          })
          .setOrigin(0, 0);
        const dmgT = scene.add
          .text(W - PAD * 6, itemY + 14, `DMG +${item.bonus}`, {
            fontSize: '10px',
            fontStyle: 'bold',
            fontFamily: FONT.sans,
            color: '#059669',
          })
          .setOrigin(1, 0.5);
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
    ({
      heroId,
      levelText,
      rarityText,
      btnBg,
      partyBg,
      partyText,
      gemBg,
      gemText,
    }) => {
      const template = HEROES.find((h) => h.id === heroId);
      const owned = scene.profile!.heroes.some(
        (hero) => hero.heroId === heroId
      );
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
      levelText.setText(owned ? `Lv ${progress.level}` : 'Locked');
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
          ? canRemove
            ? 'Remove'
            : 'In Party'
          : partySize >= 5
            ? 'Swap In'
            : 'Add'
      );
      partyBg.setFillStyle(
        inParty
          ? canRemove
            ? COLORS.btnGreen
            : COLORS.btnDisabled
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
  const lootBonuses = getLootStatBonuses(scene.profile);
  const totalBonus = Object.values(lootBonuses).reduce((s, v) => s + (v ?? 0), 0);
  const vals = [
    fmt(scene.profile.bestRaidDamage),
    fmt(scene.profile.totalRaidDamage),
    `+${fmt(totalBonus)}`,
    String(scene.profile.inventory.length),
  ];
  vals.forEach((v, i) => scene.lootStatTexts[i]?.setText(v));

  scene.lootItemsGroup.removeAll(true);
  const items = [...scene.profile.inventory].reverse(); // newest first

  const COLS = 3;
  const GAP = 6;
  const tileW = Math.floor((W - PAD * 2 - GAP * (COLS - 1)) / COLS); // ≈134
  const tileH = 72;

  items.forEach((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tx = PAD + col * (tileW + GAP);
    const ty = row * (tileH + GAP);

    const equippedHeroId = getEquippedHeroId(scene.profile!, item.id);
    const rarityColor = RARITY_COLOR[item.rarity] ?? COLORS.rarityCommon;

    const bg = scene.add.graphics();
    bg.fillStyle(equippedHeroId ? 0xf0f9ff : 0xfafafa);
    bg.fillRoundedRect(tx, ty, tileW, tileH, 8);
    bg.lineStyle(2, rarityColor, equippedHeroId ? 1 : 0.55);
    bg.strokeRoundedRect(tx, ty, tileW, tileH, 8);

    const iconT = scene.add
      .text(tx + tileW / 2, ty + 22, getEquipmentIcon(item.id), {
        fontSize: '20px',
        fontFamily: FONT.emoji,
      })
      .setOrigin(0.5);

    const shortName =
      item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name;
    const nameT = scene.add
      .text(tx + tileW / 2, ty + 41, shortName, {
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: FONT.sans,
        color: '#18181b',
        wordWrap: { width: tileW - 6 },
      })
      .setOrigin(0.5, 0);

    const rarityHex = '#' + rarityColor.toString(16).padStart(6, '0');
    const rarityT = scene.add
      .text(tx + tileW / 2, ty + 56, item.rarity, {
        fontSize: '8px',
        fontFamily: FONT.sans,
        color: rarityHex,
      })
      .setOrigin(0.5, 0);

    const hit = scene.add
      .rectangle(tx + tileW / 2, ty + tileH / 2, tileW, tileH, 0, 0)
      .setInteractive({ useHandCursor: true });
    const capturedId = item.id;
    hit.on('pointerdown', () => scene.showLootDetail(capturedId));

    const tileObjs: Phaser.GameObjects.GameObject[] = [
      bg,
      iconT,
      nameT,
      rarityT,
      hit,
    ];

    // Equipped badge (⚔ overlay, top-right corner)
    if (equippedHeroId) {
      const badgeBg = scene.add.graphics();
      badgeBg.fillStyle(0x0369a1, 0.9);
      badgeBg.fillRoundedRect(tx + tileW - 20, ty + 4, 16, 14, 4);
      const badgeT = scene.add
        .text(tx + tileW - 12, ty + 11, '⚔', {
          fontSize: '8px',
          fontFamily: FONT.emoji,
        })
        .setOrigin(0.5);
      tileObjs.push(badgeBg, badgeT);
    }

    // Token-upgrade badge (bottom-right corner, green dot)
    if ((item.bonusLevel ?? 0) > 0) {
      const lvBadge = scene.add
        .text(tx + tileW - 4, ty + tileH - 4, `T${item.bonusLevel}`, {
          fontSize: '7px',
          fontStyle: 'bold',
          fontFamily: FONT.sans,
          color: '#059669',
        })
        .setOrigin(1, 1);
      tileObjs.push(lvBadge);
    }

    scene.lootItemsGroup.add(tileObjs);
  });

  if (items.length === 0) {
    scene.lootItemsGroup.add(
      scene.add
        .text((W - PAD * 2) / 2, 60, 'Clear raids to earn gear.', {
          fontSize: '13px',
          fontFamily: FONT.sans,
          color: '#a1a1aa',
        })
        .setOrigin(0.5)
    );
  }

  // Update scroll bounds so wheel handler can clamp correctly
  const rows = Math.ceil(Math.max(1, items.length) / COLS);
  const contentH = rows * (tileH + GAP);
  const availableH = H - scene.lootItemsGroupBaseY - PAD * 2;
  scene.lootScrollMax = Math.max(0, contentH - availableH);
  scene.lootScrollY = Math.min(scene.lootScrollY, scene.lootScrollMax);
  scene.lootItemsGroup.setY(scene.lootItemsGroupBaseY - scene.lootScrollY);
}
