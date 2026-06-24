import type { GameScene } from '../scenes/GameScene';
import { submitRaidDamage } from '../../keeper/api';
import { HEROES } from '../../../shared/game/data/heroes';
import { getRaidNode } from '../../../shared/game/data/raidBosses';
import {
  MAX_LOGS, canUseSkill, canUseUltimate, createBattleState, getActiveHero, resolveHeroAction
} from '../../../shared/game/logic/combat';
import { applyBattleRewards, createBattleRewards } from '../../../shared/game/logic/progression';
import type { BattleAction, BattleLogEntry, BattleState, HeroSkill } from '../../../shared/game/types';
import type { BossAttackCue } from '../scenes/GameSceneTypes';
import { persistKeeperSave } from '../../keeper/api';
import {
  showBossAttackBanner, showHeroSkillBanner, animateBossDefeat,
  spawnEffectSprite, spawnBossStatusEffects, spawnBossFloat, spawnFloat,
  animateActiveHeroAction, animateHeroHit,
  getHeroEffectKey, getBossImpactEffectKey, BOSS_DEBUFF_EFFECT
} from './animations';

// Re-export animation helpers that GameScene.ts delegates to
export { showHeroSkillBanner, animateBossDefeat, spawnEffectSprite };

export function handleAction(
  scene: GameScene,
  action: BattleAction,
  selectedSkill?: HeroSkill,
  _skillChoiceIndex = 0
): void {
  if (scene.bossTurnAnimating) return;
  if (!scene.profile || !scene.battle || scene.battle.status !== 'active')
    return;
  const activeHero = getActiveHero(scene.battle);

  if (action === 'ultimate' && !canUseUltimate(activeHero)) return;
  if (action === 'skill' && !canUseSkill(activeHero)) return;

  const activeIndex = scene.battle.heroes.findIndex(
    (hero) => hero.id === activeHero?.id
  );
  const prevHeroes = scene.battle.heroes;
  const nextBattle = resolveHeroAction(scene.battle, action, selectedSkill);
  const bossDamage = Math.max(
    0,
    Math.round(scene.battle.boss.hp - nextBattle.boss.hp)
  );
  const bossAttackCues = getNewBossAttackCues(
    nextBattle.logs,
    scene.battle.logs[0]?.id
  );
  const damagedHeroSlots: Array<{
    index: number;
    heroId: string;
    value: number;
    ko: boolean;
  }> = [];
  const healingFloats: Array<{ index: number; value: number; kind: 'heal' | 'ultimate' }> = [];

  // Show hero attack effect on boss
  if (activeHero) {
    const effectKey = getHeroEffectKey(activeHero, action, selectedSkill);
    spawnEffectSprite(scene, effectKey, scene.bossCX, scene.bossCY);
    if (bossDamage > 0) {
      spawnBossFloat(scene, bossDamage, action === 'ultimate' ? 'ultimate' : 'damage');
    } else if (nextBattle.status === 'active') {
      const latestHeroLog = nextBattle.logs.find((l) => l.tone === 'hero');
      if (latestHeroLog?.message.includes('missed')) {
        spawnBossFloat(scene, 0, 'miss');
      }
    }

    // Shake boss image on hit
    if (nextBattle.boss.hp < scene.battle.boss.hp) {
      scene.tweens.add({
        targets: scene.bossImage,
        x: { from: scene.bossCX - 7, to: scene.bossCX + 7 },
        duration: 75,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: 2,
        onComplete: () => scene.bossImage.setX(scene.bossCX),
      });
    }
  }

  // Collect hero-side effects
  nextBattle.heroes.forEach((nextHero, i) => {
    const prev = prevHeroes[i];
    if (!prev) return;
    const diff = Math.round(nextHero.hp) - Math.round(prev.hp);
    if (Math.abs(diff) < 1) return;

    const isActorUlt =
      action === 'ultimate' && prev.id === (activeHero?.id ?? '');

    if (diff < 0) {
      damagedHeroSlots.push({
        index: i,
        heroId: nextHero.id,
        value: Math.abs(diff),
        ko: nextHero.hp <= 0,
      });
      return;
    }

    healingFloats.push({
      index: i,
      value: Math.abs(diff),
      kind: isActorUlt ? 'ultimate' : 'heal',
    });
  });

  if (action === 'ultimate' && activeHero) {
    const idx = scene.battle.heroes.findIndex((h) => h.id === activeHero.id);
    const had = prevHeroes[idx]
      ? Math.abs(
          Math.round(nextBattle.heroes[idx]?.hp ?? 0) -
            Math.round(prevHeroes[idx]!.hp)
        ) >= 1
      : false;
    if (!had) spawnFloat(scene, idx, 0, 'ultimate');
  }

  const heroIndexMap = new Map<string, number>(prevHeroes.map((h, i) => [h.id, i]));

  const playCollectedEffects = () => {
    healingFloats.forEach(({ index, value, kind }) =>
      spawnFloat(scene, index, value, kind)
    );

    playBossAttackCues(scene, bossAttackCues, damagedHeroSlots, heroIndexMap, (handledIds) => {
      damagedHeroSlots.forEach(({ index, heroId, value, ko }) => {
        if (handledIds.has(heroId)) return;
        const slot = scene.heroSlots[index];
        spawnFloat(scene, index, value, 'damage');
        if (slot) {
          spawnEffectSprite(
            scene,
            getBossImpactEffectKey(bossAttackCues),
            slot.iconCX,
            slot.iconCY
          );
        }
        animateHeroHit(scene, index, heroId, ko);
      });

      spawnBossStatusEffects(scene, bossAttackCues, nextBattle);
    });
  };

  scene.battle = nextBattle;

  if (nextBattle.status === 'active') {
    scene.refreshRaid();
    if (activeHero) {
      animateActiveHeroAction(scene, activeIndex, activeHero.id, action);
    }
    playCollectedEffects();
    return;
  }

  const run = scene.raidRun ?? {
    nodeLevel: nextBattle.raidLevel,
    battleIndex: nextBattle.encounterIndex,
    battleCount: nextBattle.encounterCount,
    totalDamage: 0,
    party: scene.profile.party,
  };

  if (nextBattle.status === 'won' && run.battleIndex < run.battleCount) {
    const node = getRaidNode(run.nodeLevel);
    const nextIndex = run.battleIndex + 1;
    scene.raidRun = {
      ...run,
      battleIndex: nextIndex,
      totalDamage: run.totalDamage + nextBattle.totalDamage,
    };
    scene.battle = createBattleState(scene.profile, {
      raidLevel: node.level,
      bossId: node.bossId,
      encounterIndex: nextIndex,
      encounterCount: run.battleCount,
    });
    scene.showEncounterBanner(nextIndex, run.battleCount);
    scene.refreshAll();
    if (activeHero) {
      animateActiveHeroAction(scene, activeIndex, activeHero.id, action);
    }
    playCollectedEffects();
    return;
  }

  // Raid node ended — apply rewards and track level-ups
  const victory = nextBattle.status === 'won';
  const battlesCleared = victory
    ? run.battleCount
    : Math.max(0, run.battleIndex - 1);
  const runDamage = run.totalDamage + nextBattle.totalDamage;
  scene.battle = {
    ...nextBattle,
    totalDamage: runDamage,
  };
  const prevLevels = Object.fromEntries(
    scene.profile.heroes.map((h) => [h.heroId, h.level])
  );
  const rewards = createBattleRewards(
    runDamage,
    victory,
    scene.profile.inventory.length,
    battlesCleared,
    run.battleCount
  );
  const nextProfile = applyBattleRewards(
    scene.profile,
    rewards,
    runDamage,
    {
      victory,
      raidLevel: run.nodeLevel,
    }
  );
  scene.lastRewards = rewards;
  scene.profile = nextProfile;
  scene.raidRun = null;

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
  if (levelUpEntries.length > 0 && scene.battle) {
    scene.battle = {
      ...scene.battle,
      logs: [...levelUpEntries, ...scene.battle.logs].slice(0, MAX_LOGS),
    };
  }

  void persistKeeperSave(nextProfile);
  if (victory) scene.pendingResultShow = true;
  scene.refreshAll();
  if (activeHero) {
    animateActiveHeroAction(scene, activeIndex, activeHero.id, action);
  }
  playCollectedEffects();

  if (victory) {
    animateBossDefeat(scene);

    const livingBattle = scene.battle;
    if (livingBattle) {
      livingBattle.heroes.forEach((hero, i) => {
        if (hero.hp > 0) {
          const slot = scene.heroSlots[i];
          if (slot) scene.setHeroPose(slot.icon, hero.id, 'victory');
        }
      });
    }
    scene.time.delayedCall(1800, () => {
      scene.pendingResultShow = false;
      scene.refreshResultOverlay();
    });

    void submitRaidDamage(runDamage).then((res) => {
      if (!res) return;
      scene.raidStatus = res.raid;
      if (res.bossKilled) {
        scene.showNotification(`🏆 Community defeated ${res.raid.bossName}!`);
      }
    });
  }
}

export function getNewBossAttackCues(
  nextLogs: BattleLogEntry[],
  previousTopLogId?: string
): BossAttackCue[] {
  const fresh: BossAttackCue[] = [];

  for (const entry of nextLogs) {
    if (entry.id === previousTopLogId) break;
    if (entry.tone === 'boss' && entry.attackName) {
      fresh.push({
        attackName: entry.attackName,
        ...(entry.effectType ? { effectType: entry.effectType } : {}),
        ...(entry.targetHeroIds ? { targetHeroIds: entry.targetHeroIds } : {}),
      });
    }
  }

  return fresh.reverse();
}

export function playBossAttackCues(
  scene: GameScene,
  cues: BossAttackCue[],
  damagedSlots: Array<{ index: number; heroId: string; value: number; ko: boolean }>,
  heroIndexMap: Map<string, number>,
  onComplete: (handledIds: Set<string>) => void
): void {
  if (cues.length === 0) {
    onComplete(new Set());
    return;
  }

  scene.bossTurnAnimating = true;
  scene.refreshButtons();

  const slotByHeroId = new Map(damagedSlots.map((s) => [s.heroId, s]));
  const handledIds = new Set<string>();

  const playNext = (i: number) => {
    if (i >= cues.length) {
      scene.bossTurnAnimating = false;
      onComplete(handledIds);
      scene.refreshButtons();
      return;
    }

    const cue = cues[i];
    if (!cue) { playNext(i + 1); return; }

    const frozenCue = cue;
    const isSelfBuff = frozenCue.effectType
      && ['rage', 'fortify', 'precision', 'evade'].includes(frozenCue.effectType)
      && !(frozenCue.targetHeroIds?.length);
    scene.time.delayedCall(500, () => {
      if (isSelfBuff && frozenCue.effectType) {
        spawnEffectSprite(
          scene,
          BOSS_DEBUFF_EFFECT[frozenCue.effectType],
          scene.bossCX,
          scene.bossCY,
          140
        );
        return;
      }

      const targetIds = frozenCue.targetHeroIds?.length
        ? frozenCue.targetHeroIds
        : damagedSlots.filter((s) => !handledIds.has(s.heroId)).map((s) => s.heroId);

      targetIds.forEach((heroId) => {
        const s = slotByHeroId.get(heroId);
        if (!s) {
          const slotIndex = heroIndexMap.get(heroId);
          if (slotIndex !== undefined) {
            spawnFloat(scene, slotIndex, 0, 'miss');
          }
          return;
        }
        const heroSlot = scene.heroSlots[s.index];
        if (heroSlot) {
          spawnEffectSprite(
            scene,
            getBossImpactEffectKey([frozenCue]),
            heroSlot.iconCX,
            heroSlot.iconCY
          );
        }
        if (!handledIds.has(heroId)) {
          spawnFloat(scene, s.index, s.value, 'damage');
          handledIds.add(heroId);
        }
        animateHeroHit(scene, s.index, heroId, s.ko);
      });
    });

    showBossAttackBanner(scene, cue.attackName ?? 'Attack', () => playNext(i + 1));
  };

  playNext(0);
}
