import { HEROES } from '../../shared/game/data/heroes';
import {
  canUpgradeHero,
  getHeroProgress,
  getScaledStats,
  getUpgradeCost,
} from '../../shared/game/logic/progression';
import {
  canUseSkill,
  canUseUltimate,
} from '../../shared/game/logic/combat';
import type {
  BattleAction,
  BattleHero,
  BattleState,
  PlayerSave,
  RewardBundle,
} from '../../shared/game/types';
import { FloatEvent, StatTile, formatNumber, getRarityClassName } from './uiComponents';
import { ActiveHeroStats, BossSprite, HeroSprite } from './battleComponents';
import { CompactHeroCard, HeroDetailSheet } from './heroComponents';
import { getBossAppearance } from '../../shared/game/data/raidBosses';

const RAID_ENERGY_COST = 10;

// ─── Raid View ──────────────────────────────────────────────────────────────

type RaidViewProps = {
  battle: BattleState;
  profile: PlayerSave;
  activeHero: BattleHero | null;
  bossHpPercent: number;
  floatEvents: FloatEvent[];
  livingHeroes: number;
  lastRewards: RewardBundle | null;
  statsExpanded: boolean;
  onSetStatsExpanded: (fn: (s: boolean) => boolean) => void;
  onAction: (action: BattleAction) => void;
  onStartRaid: () => void;
};

export const RaidView = ({
  battle,
  profile,
  activeHero,
  bossHpPercent,
  floatEvents,
  livingHeroes,
  lastRewards,
  statsExpanded,
  onSetStatsExpanded,
  onAction,
  onStartRaid,
}: RaidViewProps) => {
  const nextBossAppearance = getBossAppearance(profile.raidLevel);

  return (
    <section className="flex h-full flex-col gap-2">

      {/* Battle Stage */}
      <div className="battle-stage relative flex-1 overflow-hidden rounded-lg border border-zinc-300 bg-[#dbe7dd] shadow-sm">
        <div className="absolute inset-0 raid-field" />

        {/* Boss info bar */}
        <div className="absolute left-2 right-2 top-2 z-10 rounded-md bg-white/92 px-2 py-1 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase text-red-700">
                {battle.boss.title}
              </p>
              <h2 className="truncate text-sm font-black">
                {battle.boss.icon} {battle.boss.name}
              </h2>
            </div>
            <p className="shrink-0 text-xs font-black">
              {formatNumber(battle.boss.hp)}/{formatNumber(battle.boss.maxHp)}
            </p>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${bossHpPercent}%` }}
            />
          </div>
        </div>

        {/* Boss sprite */}
        <div className="absolute bottom-16 left-3 top-16 flex w-[52%] items-center justify-center">
          <BossSprite hpPercent={bossHpPercent} icon={battle.boss.icon} />
        </div>

        {/* Hero sprites */}
        <div className="absolute bottom-3 right-3 top-14 flex w-[34%] flex-col justify-between">
          {battle.heroes.map((hero) => (
            <HeroSprite
              key={hero.id}
              hero={hero}
              active={activeHero?.id === hero.id}
              floats={floatEvents.filter((f) => f.heroId === hero.id)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-3 left-3 right-[40%] z-20 grid grid-cols-3 gap-1.5">
          <button
            className="h-8 rounded-md bg-zinc-950 text-[11px] font-black text-white disabled:bg-zinc-300"
            onClick={() => onAction('attack')}
            disabled={battle.status !== 'active' || !activeHero}
          >
            Attack
          </button>
          <button
            className={`h-8 rounded-md text-[11px] font-black text-white disabled:bg-zinc-300 ${
              canUseSkill(activeHero) ? 'bg-orange-500' : 'bg-zinc-400'
            }`}
            onClick={() => onAction('skill')}
            disabled={battle.status !== 'active' || !canUseSkill(activeHero)}
          >
            {activeHero && activeHero.skillCooldown > 0
              ? `CD:${activeHero.skillCooldown}`
              : 'Skill'}
          </button>
          <button
            className={`h-8 rounded-md text-[11px] font-black text-white disabled:bg-zinc-300 ${
              canUseUltimate(activeHero) ? 'bg-indigo-600' : 'bg-zinc-400'
            }`}
            onClick={() => onAction('ultimate')}
            disabled={battle.status !== 'active' || !canUseUltimate(activeHero)}
          >
            {canUseUltimate(activeHero) ? '⚡ Ult' : 'Ult'}
          </button>
        </div>

        {/* Victory / defeat overlay */}
        {battle.status !== 'active' ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 px-5 backdrop-blur-[2px]">
            <div className="w-full rounded-lg bg-white p-4 text-center shadow-xl">
              <p className="text-xs font-black uppercase text-orange-700">
                {battle.status === 'won' ? 'Raid cleared' : 'Raid failed'}
              </p>
              <h2 className="mt-1 text-3xl font-black">
                {formatNumber(battle.totalDamage)}
              </h2>
              {lastRewards ? (
                <p className="mt-1 text-xs font-bold text-zinc-600">
                  +{lastRewards.gold} gold · +{lastRewards.exp} EXP
                </p>
              ) : null}
              {battle.status === 'won' && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-md bg-zinc-50 px-3 py-2">
                  <span className="text-2xl">{nextBossAppearance.icon}</span>
                  <div className="text-left">
                    <p className="text-xs font-black">{nextBossAppearance.name}</p>
                    <p className="text-[10px] font-bold text-zinc-500">
                      Next · Lv {profile.raidLevel}
                    </p>
                  </div>
                </div>
              )}
              <button
                className="mt-3 h-10 w-full rounded-md bg-zinc-950 font-black text-white"
                onClick={onStartRaid}
              >
                Next raid
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Collapsible active hero stats */}
      <div className="shrink-0 rounded-lg border border-zinc-200 bg-[#efe7d7] px-2 py-1.5 shadow-sm">
        <button
          className="flex w-full items-center justify-between gap-2"
          onClick={() => onSetStatsExpanded((s) => !s)}
        >
          <p className="truncate text-xs font-black uppercase text-zinc-600">
            {activeHero?.name ?? 'No active hero'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-xs font-black text-zinc-500">
              {livingHeroes}/5 · R{battle.round}
            </p>
            <span className="text-[10px] text-zinc-400">
              {statsExpanded ? '▲' : '▼'}
            </span>
          </div>
        </button>
        {statsExpanded && <ActiveHeroStats hero={activeHero} />}
      </div>

    </section>
  );
};

// ─── Heroes View ─────────────────────────────────────────────────────────────

type HeroesViewProps = {
  profile: PlayerSave;
  selectedHeroId: string | null;
  dailyAvailable: boolean;
  onSetSelectedHeroId: (id: string | null) => void;
  onUpgradeHero: (heroId: string) => void;
  onDailyClaim: () => void;
  onStartRaid: () => void;
};

export const HeroesView = ({
  profile,
  selectedHeroId,
  dailyAvailable,
  onSetSelectedHeroId,
  onUpgradeHero,
  onDailyClaim,
  onStartRaid,
}: HeroesViewProps) => (
  <section className="relative grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2">
    <div className="grid grid-cols-2 gap-2">
      <button
        className="h-10 rounded-md bg-emerald-600 text-sm font-black text-white disabled:bg-zinc-300"
        onClick={onDailyClaim}
        disabled={!dailyAvailable}
      >
        {dailyAvailable ? 'Claim daily' : 'Daily done'}
      </button>
      <button
        className="h-10 rounded-md bg-zinc-950 text-sm font-black text-white disabled:bg-zinc-300"
        onClick={onStartRaid}
        disabled={profile.energy < RAID_ENERGY_COST}
      >
        New raid
      </button>
    </div>

    <div className="grid min-h-0 grid-cols-2 grid-rows-3 gap-2">
      {HEROES.map((hero) => {
        const progress = getHeroProgress(profile, hero.id);
        const upgradeReady = canUpgradeHero(profile, hero.id);

        return (
          <CompactHeroCard
            key={hero.id}
            hero={hero}
            level={progress.level}
            upgradeReady={upgradeReady}
            onUpgrade={() => onUpgradeHero(hero.id)}
            onClick={() => onSetSelectedHeroId(hero.id)}
          />
        );
      })}
    </div>

    {/* Hero detail sheet */}
    {selectedHeroId && (() => {
      const heroTemplate = HEROES.find((h) => h.id === selectedHeroId);
      if (!heroTemplate) return null;
      const progress = getHeroProgress(profile, heroTemplate.id);
      const stats = getScaledStats(heroTemplate, progress.level);
      const cost = getUpgradeCost(progress.level);
      const upgradeReady = canUpgradeHero(profile, heroTemplate.id);

      return (
        <HeroDetailSheet
          hero={heroTemplate}
          stats={stats}
          level={progress.level}
          exp={progress.exp}
          cost={cost}
          upgradeReady={upgradeReady}
          onUpgrade={() => {
            onUpgradeHero(heroTemplate.id);
            onSetSelectedHeroId(null);
          }}
          onClose={() => onSetSelectedHeroId(null)}
        />
      );
    })()}
  </section>
);

// ─── Loot View ───────────────────────────────────────────────────────────────

type LootViewProps = {
  profile: PlayerSave;
  dailyAvailable: boolean;
  onDailyClaim: () => void;
  onStartRaid: () => void;
};

export const LootView = ({
  profile,
  dailyAvailable,
  onDailyClaim,
  onStartRaid,
}: LootViewProps) => (
  <section className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-2">
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Best" value={formatNumber(profile.bestRaidDamage)} />
      <StatTile label="Total" value={formatNumber(profile.totalRaidDamage)} />
      <StatTile label="Raid Lv" value={profile.raidLevel} />
      <StatTile label="Items" value={profile.inventory.length} />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <button
        className="h-10 rounded-md bg-emerald-600 text-sm font-black text-white disabled:bg-zinc-300"
        onClick={onDailyClaim}
        disabled={!dailyAvailable}
      >
        {dailyAvailable ? 'Daily' : 'Claimed'}
      </button>
      <button
        className="h-10 rounded-md bg-zinc-950 text-sm font-black text-white disabled:bg-zinc-300"
        onClick={onStartRaid}
        disabled={profile.energy < RAID_ENERGY_COST}
      >
        Raid
      </button>
    </div>

    <div className="min-h-0 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
      <p className="text-xs font-black uppercase text-zinc-500">
        Recent loot
      </p>
      <div className="mt-2 grid gap-1.5">
        {profile.inventory.length > 0 ? (
          profile.inventory
            .slice(-6)
            .reverse()
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black">{item.name}</h3>
                  <p className="text-[11px] font-bold uppercase text-zinc-500">
                    +{item.bonus} {item.stat}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${getRarityClassName(
                    item.rarity
                  )}`}
                >
                  {item.rarity}
                </span>
              </div>
            ))
        ) : (
          <p className="rounded-md bg-zinc-50 px-3 py-5 text-center text-sm font-bold text-zinc-500">
            Clear raids to earn gear.
          </p>
        )}
      </div>
    </div>
  </section>
);
