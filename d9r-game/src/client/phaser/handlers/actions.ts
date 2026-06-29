import type { GameScene } from '../scenes/GameScene';
import { submitRaidDamage } from '../../keeper/api';
import { HEROES } from '../../../shared/game/data/heroes';
import { getRaidNode } from '../../../shared/game/data/raidBosses';
import {
  MAX_LOGS, canUseSkill, canUseUltimate, createBattleState, getActiveHero,
  resolveHeroAction, resolvePartyAttack, resolveSpecificHeroAction, resolveBossTurnPhase,
} from '../../../shared/game/logic/combat';
import { applyBattleRewards, createBattleRewards } from '../../../shared/game/logic/progression';
import type { BattleAction, BattleLogEntry, BattleState, HeroSkill } from '../../../shared/game/types';
import type { BossAttackCue } from '../scenes/GameSceneTypes';
import { persistKeeperSave } from '../../keeper/api';
import {
  showBossAttackBanner, showHeroSkillBanner, animateBossDefeat,
  spawnEffectSprite, spawnEffectSequence, spawnBossFloat, spawnFloat,
  animateActiveHeroAction, animateHeroHit,
  getHeroEffectSeq, getBossStrikeSeq, BOSS_DEBUFF_EFFECT, spawnChainCounter
} from './animations';

// Re-export animation helpers that GameScene.ts delegates to
export { showHeroSkillBanner, animateBossDefeat, spawnEffectSprite };

// ms per frame in spawnEffectSequence; keep in sync with that function.
const SEQ_MS_PER_FRAME = 55;
// Impact point within a sequence where the "hit" visually lands (~2 frames in).
const SEQ_IMPACT_OFFSET = SEQ_MS_PER_FRAME * 2;
// Gap between successive hero hits in a party attack.
const PARTY_HIT_OFFSET_MS = 80;

// ms that boss defeat animation takes (delay + duration from animateBossDefeat)
const BOSS_DEFEAT_MS = 300 + 1800 + 150;

// ── Shared end-of-battle logic ────────────────────────────────────────────────
// onMidRunTransition: if provided, called with a trigger fn instead of immediately
// showing the encounter banner (lets the caller sequence it after boss animation).
function handleBattleEnd(
  scene: GameScene,
  nextBattle: BattleState,
  onMidRunTransition?: (trigger: () => void) => void
): void {
  const run = scene.raidRun ?? {
    nodeLevel: nextBattle.raidLevel,
    battleIndex: nextBattle.encounterIndex,
    battleCount: nextBattle.encounterCount,
    totalDamage: 0,
    party: scene.profile!.party,
  };

  if (nextBattle.status === 'won' && run.battleIndex < run.battleCount) {
    const node = getRaidNode(run.nodeLevel);
    const nextIdx = run.battleIndex + 1;
    const nextRun = { ...run, battleIndex: nextIdx, totalDamage: run.totalDamage + nextBattle.totalDamage };
    const nextBattleState = createBattleState(scene.profile!, {
      raidLevel: node.level,
      bossId: node.bossId,
      encounterIndex: nextIdx,
      encounterCount: run.battleCount,
    });

    const triggerTransition = () => {
      scene.showEncounterBanner(nextIdx, run.battleCount, () => {
        scene.pendingResultShow = false;
        scene.setView('raid');
        scene.raidRun = nextRun;
        scene.battle = nextBattleState;
        scene.heroActedThisRound = [false, false, false, false];
        scene.refreshAll();
      });
    };

    if (onMidRunTransition) {
      onMidRunTransition(triggerTransition);
    } else {
      triggerTransition();
    }
    return;
  }

  const victory = nextBattle.status === 'won';
  const battlesCleared = victory ? run.battleCount : Math.max(0, run.battleIndex - 1);
  const runDamage = run.totalDamage + nextBattle.totalDamage;
  scene.battle = { ...nextBattle, totalDamage: runDamage };

  const prevLevels = Object.fromEntries(scene.profile!.heroes.map((h) => [h.heroId, h.level]));
  const rewards = createBattleRewards(runDamage, victory, scene.profile!.inventory.length, battlesCleared, run.battleCount);
  const nextProfile = applyBattleRewards(scene.profile!, rewards, runDamage, { victory, raidLevel: run.nodeLevel });
  scene.lastRewards = rewards;
  scene.profile = nextProfile;
  scene.raidRun = null;

  const levelUpEntries: BattleLogEntry[] = [];
  nextProfile.heroes.forEach((h) => {
    const prev = prevLevels[h.heroId] ?? 1;
    if (h.level > prev) {
      const hero = HEROES.find((hd) => hd.id === h.heroId);
      if (hero) levelUpEntries.push({ id: `levelup-${h.heroId}`, tone: 'reward', message: `⭐ ${hero.name} leveled up to Lv ${h.level}!` });
    }
  });
  if (levelUpEntries.length > 0 && scene.battle) {
    scene.battle = { ...scene.battle, logs: [...levelUpEntries, ...scene.battle.logs].slice(0, MAX_LOGS) };
  }

  void persistKeeperSave(nextProfile);
  if (victory) scene.pendingResultShow = true;
  scene.refreshAll();

  if (victory) {
    scene.time.delayedCall(1800, () => {
      scene.pendingResultShow = false;
      scene.refreshResultOverlay();
    });
    void submitRaidDamage(runDamage).then((res) => {
      if (!res) return;
      scene.raidStatus = res.raid;
      if (res.bossKilled) scene.showNotification(`🏆 Community defeated ${res.raid.bossName}!`);
    });
  }
}

// ── Party attack / legacy single-hero action ──────────────────────────────────
export function handleAction(
  scene: GameScene,
  action: BattleAction,
  selectedSkill?: HeroSkill,
  _skillChoiceIndex = 0
): void {
  if (scene.bossTurnAnimating) return;
  if (!scene.profile || !scene.battle || scene.battle.status !== 'active') return;

  const activeHero = getActiveHero(scene.battle);
  if (action === 'ultimate' && !canUseUltimate(activeHero)) return;
  if (action === 'skill'   && !canUseSkill(activeHero))    return;

  const activeIndex = scene.battle.heroes.findIndex((h) => h.id === activeHero?.id);
  const prevHeroes  = scene.battle.heroes;
  const prevBossHp  = scene.battle.boss.hp;
  const prevTopLogId = scene.battle.logs[0]?.id;

  // ── Resolve game state ────────────────────────────────────────────────
  const nextBattle = action === 'attack'
    ? resolvePartyAttack(scene.battle)
    : resolveHeroAction(scene.battle, action, selectedSkill);

  const bossDamage = Math.max(0, Math.round(prevBossHp - nextBattle.boss.hp));

  // Boss log entries that should be revealed progressively
  const newBossLogEntries: BattleLogEntry[] = [];
  for (const entry of nextBattle.logs) {
    if (entry.id === prevTopLogId) break;
    if (entry.tone === 'boss') newBossLogEntries.push(entry);
  }
  newBossLogEntries.reverse();
  const newBossLogIdSet = new Set(newBossLogEntries.map((e) => e.id));
  const logsWithoutBossAttacks = nextBattle.logs.filter((l) => !newBossLogIdSet.has(l.id));

  const bossAttackCues = getNewBossAttackCues(nextBattle.logs, prevTopLogId);

  // ── Collect hero-side HP changes ──────────────────────────────────────
  const damagedHeroSlots: Array<{ index: number; heroId: string; value: number; ko: boolean }> = [];
  const healingFloats:    Array<{ index: number; value: number; kind: 'heal' | 'ultimate' }> = [];

  nextBattle.heroes.forEach((nextHero, i) => {
    const prev = prevHeroes[i];
    if (!prev) return;
    const diff = Math.round(nextHero.hp) - Math.round(prev.hp);
    if (Math.abs(diff) < 1) return;
    const isActorUlt = action === 'ultimate' && prev.id === (activeHero?.id ?? '');
    if (diff < 0) {
      damagedHeroSlots.push({ index: i, heroId: nextHero.id, value: Math.abs(diff), ko: nextHero.hp <= 0 });
    } else {
      healingFloats.push({ index: i, value: Math.abs(diff), kind: isActorUlt ? 'ultimate' : 'heal' });
    }
  });

  const heroIndexMap = new Map<string, number>(prevHeroes.map((h, i) => [h.id, i]));

  // ── Hero visual effects ───────────────────────────────────────────────
  let bossAttackDelay = 0; // ms to wait before starting boss attack sequence

  if (action === 'attack') {
    // ── Party simultaneous attack ──────────────────────────────────────
    const livingHeroes = prevHeroes
      .map((h, i) => ({ hero: h, slotIdx: i }))
      .filter(({ hero }) => hero.hp > 0);

    // Impact offsets for chain counter (one per hero)
    const impactOffsets = livingHeroes.map((_, ci) =>
      ci * PARTY_HIT_OFFSET_MS + SEQ_IMPACT_OFFSET
    );

    livingHeroes.forEach(({ hero, slotIdx }, chainIdx) => {
      scene.time.delayedCall(chainIdx * PARTY_HIT_OFFSET_MS, () => {
        const seq = getHeroEffectSeq(hero, 'attack');
        spawnEffectSequence(scene, seq, scene.bossCX, scene.bossCY);
        animateActiveHeroAction(scene, slotIdx, hero.id, 'attack');
      });
    });

    // Chain counter (2+ heroes)
    spawnChainCounter(scene, impactOffsets, scene.bossCX, scene.bossCY - 80);

    // Total damage float after last hero effect lands
    const lastFireMs = (livingHeroes.length - 1) * PARTY_HIT_OFFSET_MS;
    const seqDuration = (6 - 1) * SEQ_MS_PER_FRAME + Math.round(SEQ_MS_PER_FRAME * 2.8); // 6-frame basic atk
    const damageFloatMs = lastFireMs + seqDuration - 60;

    if (bossDamage > 0) {
      scene.time.delayedCall(damageFloatMs, () => {
        spawnBossFloat(scene, bossDamage, 'damage');
        if (bossDamage > 0) {
          scene.tweens.add({
            targets: scene.bossImage,
            x: { from: scene.bossCX - 7, to: scene.bossCX + 7 },
            duration: 75, ease: 'Sine.InOut', yoyo: true, repeat: 2,
            onComplete: () => scene.bossImage.setX(scene.bossCX),
          });
        }
      });
    }

    bossAttackDelay = lastFireMs + seqDuration + 140;

  } else {
    // ── Single-hero action (skill / ultimate) ──────────────────────────
    if (activeHero) {
      const seq = getHeroEffectSeq(activeHero, action, selectedSkill);
      const seqDuration = spawnEffectSequence(scene, seq, scene.bossCX, scene.bossCY);
      bossAttackDelay = seqDuration + 120;

      if (bossDamage > 0) {
        spawnBossFloat(scene, bossDamage, action === 'ultimate' ? 'ultimate' : 'damage');
      } else if (nextBattle.status === 'active') {
        const latestHeroLog = nextBattle.logs.find((l) => l.tone === 'hero');
        if (latestHeroLog?.message.includes('missed')) spawnBossFloat(scene, 0, 'miss');
      }

      if (nextBattle.boss.hp < prevBossHp) {
        scene.tweens.add({
          targets: scene.bossImage,
          x: { from: scene.bossCX - 7, to: scene.bossCX + 7 },
          duration: 75, ease: 'Sine.InOut', yoyo: true, repeat: 2,
          onComplete: () => scene.bossImage.setX(scene.bossCX),
        });
      }

      animateActiveHeroAction(scene, activeIndex, activeHero.id, action);
    }

    if (action === 'ultimate' && activeHero) {
      const idx = scene.battle.heroes.findIndex((h) => h.id === activeHero.id);
      const had = prevHeroes[idx]
        ? Math.abs(Math.round(nextBattle.heroes[idx]?.hp ?? 0) - Math.round(prevHeroes[idx]!.hp)) >= 1
        : false;
      if (!had) spawnFloat(scene, idx, 0, 'ultimate');
    }
  }

  // ── Deferred boss attacks (waits for hero effects to finish) ──────────
  const fireBossAttacks = () => {
    healingFloats.forEach(({ index, value, kind }) => spawnFloat(scene, index, value, kind));

    scene.time.delayedCall(bossAttackDelay, () => {
      playBossAttackCues(scene, bossAttackCues, damagedHeroSlots, heroIndexMap, newBossLogEntries, (handledIds) => {
        damagedHeroSlots.forEach(({ index, heroId, value, ko }) => {
          if (handledIds.has(heroId)) return;
          const slot = scene.heroSlots[index];
          spawnFloat(scene, index, value, 'damage');
          if (slot) spawnEffectSequence(scene, getBossStrikeSeq(0), slot.iconCX, slot.iconCY, 112);
          animateHeroHit(scene, index, heroId, ko);
        });
      });
    });
  };

  // ── Apply state & trigger effects ─────────────────────────────────────
  if (nextBattle.status === 'active') {
    scene.battle = { ...nextBattle, logs: logsWithoutBossAttacks };
    scene.refreshRaid();
    fireBossAttacks();
    return;
  }

  if (nextBattle.status === 'won') {
    const _run = scene.raidRun ?? { battleIndex: nextBattle.encounterIndex, battleCount: nextBattle.encounterCount };
    if (_run.battleIndex < _run.battleCount) {
      handleBattleEnd(scene, nextBattle, (triggerTransition) => {
        animateBossDefeat(scene);
        nextBattle.heroes.forEach((hero, i) => {
          if (hero.hp > 0) {
            const slot = scene.heroSlots[i];
            if (slot) scene.setHeroPose(slot.icon, hero.id, 'victory');
          }
        });
        scene.time.delayedCall(BOSS_DEFEAT_MS, triggerTransition);
      });
    } else {
      handleBattleEnd(scene, nextBattle);
      animateBossDefeat(scene);
      nextBattle.heroes.forEach((hero, i) => {
        if (hero.hp > 0) {
          const slot = scene.heroSlots[i];
          if (slot) scene.setHeroPose(slot.icon, hero.id, 'victory');
        }
      });
    }
  } else {
    handleBattleEnd(scene, nextBattle);
  }
  fireBossAttacks();
}

// ── Per-hero free-order action (2×2 grid buttons) ─────────────────────────────
export function handleHeroAction(
  scene: GameScene,
  heroIndex: number,
  action: BattleAction,
  selectedSkill?: HeroSkill,
): void {
  if (scene.bossTurnAnimating) return;
  if (!scene.profile || !scene.battle || scene.battle.status !== 'active') return;
  if (scene.heroActedThisRound[heroIndex]) return;

  const hero = scene.battle.heroes[heroIndex];
  if (!hero || hero.hp <= 0) return;
  if (action === 'ultimate' && !canUseUltimate(hero)) return;
  if (action === 'skill'   && !canUseSkill(hero))    return;

  const prevBossHp = scene.battle.boss.hp;

  // Resolve this hero's action without boss phase
  const nextState = resolveSpecificHeroAction(scene.battle, heroIndex, action, selectedSkill);

  // Mark hero as acted
  scene.heroActedThisRound[heroIndex] = true;

  const bossDamage = Math.max(0, Math.round(prevBossHp - nextState.boss.hp));

  // Visual effects for this hero (defend has no sequence)
  const seq = action === 'defend' ? [] : getHeroEffectSeq(hero, action, selectedSkill);
  const seqDuration = spawnEffectSequence(scene, seq, scene.bossCX, scene.bossCY);
  animateActiveHeroAction(scene, heroIndex, hero.id, action);

  if (bossDamage > 0) {
    spawnBossFloat(scene, bossDamage, action === 'ultimate' ? 'ultimate' : 'damage');
    scene.tweens.add({
      targets: scene.bossImage,
      x: { from: scene.bossCX - 7, to: scene.bossCX + 7 },
      duration: 75, ease: 'Sine.InOut', yoyo: true, repeat: 2,
      onComplete: () => scene.bossImage.setX(scene.bossCX),
    });
  }

  // Update state for this hero's action
  const run = scene.raidRun ?? {
    battleIndex: nextState.encounterIndex, battleCount: nextState.encounterCount,
  };
  const isMidRun = nextState.status === 'won' && run.battleIndex < run.battleCount;
  // Suppress result overlay during mid-run so it doesn't flash before the encounter banner
  if (isMidRun) scene.pendingResultShow = true;

  scene.battle = nextState;
  scene.refreshRaid();

  // Boss died from this hit — no boss phase needed
  if (nextState.status !== 'active') {
    scene.heroActedThisRound = [false, false, false, false];

    if (isMidRun) {
      // Boss defeat animation plays first, then transition to next battle
      handleBattleEnd(scene, nextState, (triggerTransition) => {
        animateBossDefeat(scene);
        nextState.heroes.forEach((h, i) => {
          if (h.hp > 0) {
            const slot = scene.heroSlots[i];
            if (slot) scene.setHeroPose(slot.icon, h.id, 'victory');
          }
        });
        scene.time.delayedCall(BOSS_DEFEAT_MS, triggerTransition);
      });
    } else {
      handleBattleEnd(scene, nextState);
      if (nextState.status === 'won') {
        animateBossDefeat(scene);
        nextState.heroes.forEach((h, i) => {
          if (h.hp > 0) {
            const slot = scene.heroSlots[i];
            if (slot) scene.setHeroPose(slot.icon, h.id, 'victory');
          }
        });
      }
    }
    return;
  }

  // Check if all living heroes have now acted
  const allActed = nextState.heroes.every((h, i) => h.hp <= 0 || scene.heroActedThisRound[i]);
  if (!allActed) return;

  // All heroes acted — run boss phase after this animation finishes
  const bossDelay = seqDuration + 140;
  const heroesBeforeBoss = nextState.heroes;
  const heroIndexMap = new Map<string, number>(heroesBeforeBoss.map((h, i) => [h.id, i]));
  const prevTopLogId = nextState.logs[0]?.id;

  const afterBoss = resolveBossTurnPhase({
    ...nextState,
    round: nextState.round + 1,
  });

  // Extract boss attack cues and log entries
  const bossAttackCues = getNewBossAttackCues(afterBoss.logs, prevTopLogId);
  const newBossLogEntries: BattleLogEntry[] = [];
  for (const entry of afterBoss.logs) {
    if (entry.id === prevTopLogId) break;
    if (entry.tone === 'boss') newBossLogEntries.push(entry);
  }
  newBossLogEntries.reverse();
  const newBossLogIdSet = new Set(newBossLogEntries.map((e) => e.id));
  const logsWithoutBossAttacks = afterBoss.logs.filter((l) => !newBossLogIdSet.has(l.id));

  // Hero HP changes from boss phase
  const damagedHeroSlots: Array<{ index: number; heroId: string; value: number; ko: boolean }> = [];
  afterBoss.heroes.forEach((nextHero, i) => {
    const prev = heroesBeforeBoss[i];
    if (!prev) return;
    const diff = Math.round(nextHero.hp) - Math.round(prev.hp);
    if (diff < 0) {
      damagedHeroSlots.push({ index: i, heroId: nextHero.id, value: Math.abs(diff), ko: nextHero.hp <= 0 });
    }
  });

  // Reset acted flags for next round
  scene.heroActedThisRound = [false, false, false, false];

  // Update state (boss logs revealed progressively via playBossAttackCues)
  scene.battle = { ...afterBoss, logs: logsWithoutBossAttacks };
  scene.refreshRaid();

  if (afterBoss.status === 'lost') {
    handleBattleEnd(scene, afterBoss);
  }

  // Play boss attack animations after delay
  scene.time.delayedCall(bossDelay, () => {
    playBossAttackCues(scene, bossAttackCues, damagedHeroSlots, heroIndexMap, newBossLogEntries, (handledIds) => {
      damagedHeroSlots.forEach(({ index, heroId, value, ko }) => {
        if (handledIds.has(heroId)) return;
        const slot = scene.heroSlots[index];
        spawnFloat(scene, index, value, 'damage');
        if (slot) spawnEffectSequence(scene, getBossStrikeSeq(0), slot.iconCX, slot.iconCY, 112);
        animateHeroHit(scene, index, heroId, ko);
      });
    });
  });
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
  bossLogEntries: BattleLogEntry[],
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

    // Reveal this attack's log entry before the banner appears
    const logEntry = bossLogEntries[i];
    if (logEntry && scene.battle && !scene.battle.logs.some(l => l.id === logEntry.id)) {
      scene.battle = {
        ...scene.battle,
        logs: [logEntry, ...scene.battle.logs].slice(0, MAX_LOGS),
      };
      scene.refreshBattleLog();
    }

    const frozenCue = cue;
    const isSelfBuff = frozenCue.effectType
      && ['rage', 'fortify', 'precision', 'evade'].includes(frozenCue.effectType)
      && !(frozenCue.targetHeroIds?.length);

    // Banner shows first; when it fully fades out, advance to the next cue
    showBossAttackBanner(scene, frozenCue.attackName ?? 'Attack', () => playNext(i + 1));

    if (isSelfBuff && frozenCue.effectType) {
      // Self-buff: spawn effect on boss 200ms after banner appears (no hero damage)
      scene.time.delayedCall(200, () => {
        spawnEffectSprite(
          scene,
          BOSS_DEBUFF_EFFECT[frozenCue.effectType!],
          scene.bossCX,
          scene.bossCY,
          140
        );
      });
      return;
    }

    const targetIds = frozenCue.targetHeroIds?.length
      ? frozenCue.targetHeroIds
      : damagedSlots.filter((s) => !handledIds.has(s.heroId)).map((s) => s.heroId);

    // Pick a unique sequential strike pattern per attack to give variety
    const strikeSeq = getBossStrikeSeq(i);

    // Step 1 — sequential effect frames land at 200ms (banner just became fully visible)
    scene.time.delayedCall(200, () => {
      targetIds.forEach((heroId) => {
        const s = slotByHeroId.get(heroId);
        const idx = s?.index ?? heroIndexMap.get(heroId);
        const heroSlot = idx !== undefined ? scene.heroSlots[idx] : undefined;
        if (heroSlot) {
          spawnEffectSequence(scene, strikeSeq, heroSlot.iconCX, heroSlot.iconCY, 112);
        }
      });
    });

    // Step 2 — damage number + hit reaction at 360ms (effect visible, banner still holding)
    scene.time.delayedCall(360, () => {
      targetIds.forEach((heroId) => {
        const s = slotByHeroId.get(heroId);
        if (!s) {
          const idx = heroIndexMap.get(heroId);
          if (idx !== undefined) spawnFloat(scene, idx, 0, 'miss');
          return;
        }
        if (!handledIds.has(heroId)) {
          spawnFloat(scene, s.index, s.value, 'damage');
          handledIds.add(heroId);
        }
        animateHeroHit(scene, s.index, heroId, s.ko);
      });
    });
  };

  playNext(0);
}
