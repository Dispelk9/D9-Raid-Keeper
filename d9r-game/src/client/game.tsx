import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HEROES, getHeroTemplate } from '../shared/game/data/heroes';
import {
  applyBattleRewards,
  canClaimDailyReward,
  canUpgradeHero,
  claimDailyReward,
  createBattleRewards,
  getHeroProgress,
  getScaledStats,
  getUpgradeCost,
  upgradeHero,
} from '../shared/game/logic/progression';
import {
  canUseUltimate,
  createBattleState,
  getActiveHero,
  getBossHpPercent,
  resolveHeroAction,
} from '../shared/game/logic/combat';
import type {
  BattleAction,
  BattleHero,
  BattleState,
  HeroTemplate,
  PlayerSave,
  RewardBundle,
} from '../shared/game/types';
import { loadKeeperSave, persistKeeperSave } from './keeper/api';

type ViewId = 'raid' | 'heroes' | 'loot';

const RAID_ENERGY_COST = 10;

const formatNumber = (value: number) => Math.round(value).toLocaleString();

const getHpPercent = (hero: BattleHero) =>
  Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));

const getRarityClassName = (rarity: HeroTemplate['rarity']) => {
  if (rarity === 'Legendary') return 'bg-amber-100 text-amber-900';
  if (rarity === 'Epic') return 'bg-indigo-100 text-indigo-900';
  if (rarity === 'Rare') return 'bg-sky-100 text-sky-900';
  if (rarity === 'Mythic') return 'bg-rose-100 text-rose-900';

  return 'bg-zinc-100 text-zinc-700';
};

const getLogToneClassName = (tone: string) => {
  if (tone === 'boss') return 'border-red-200 bg-red-50 text-red-900';
  if (tone === 'reward') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (tone === 'hero') return 'border-sky-200 bg-sky-50 text-sky-900';

  return 'border-zinc-200 bg-white text-zinc-700';
};

const StatLine = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-zinc-50 px-3 py-2">
    <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
    <p className="text-lg font-black text-zinc-950">{formatNumber(value)}</p>
  </div>
);

const CurrencyPill = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border border-zinc-200 bg-white px-3 py-2">
    <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
    <p className="text-base font-black text-zinc-950">{formatNumber(value)}</p>
  </div>
);

export const App = () => {
  const fallbackUsername = context.username ?? 'player';
  const [view, setView] = useState<ViewId>('raid');
  const [profile, setProfile] = useState<PlayerSave | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading raid records.');
  const [lastRewards, setLastRewards] = useState<RewardBundle | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loadedSave = await loadKeeperSave(fallbackUsername);

      if (cancelled) return;

      setProfile(loadedSave);
      setBattle(createBattleState(loadedSave));
      setMessage(`Welcome back, u/${loadedSave.username}.`);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fallbackUsername]);

  const commitProfile = useCallback((nextProfile: PlayerSave) => {
    setProfile(nextProfile);
    void persistKeeperSave(nextProfile);
  }, []);

  const activeHero = battle ? getActiveHero(battle) : null;
  const bossHpPercent = battle ? getBossHpPercent(battle.boss) : 0;
  const dailyAvailable = profile ? canClaimDailyReward(profile) : false;

  const livingHeroes = useMemo(
    () => battle?.heroes.filter((hero) => hero.hp > 0).length ?? 0,
    [battle]
  );

  const handleAction = useCallback(
    (action: BattleAction) => {
      if (!profile || !battle || battle.status !== 'active') return;

      if (action === 'ultimate' && !canUseUltimate(activeHero)) {
        setMessage('Ultimate charge is not ready.');
        return;
      }

      const nextBattle = resolveHeroAction(battle, action);
      setBattle(nextBattle);

      if (nextBattle.status === 'active') {
        setMessage('The raid turn advanced.');
        return;
      }

      const victory = nextBattle.status === 'won';
      const rewards = createBattleRewards(
        nextBattle.totalDamage,
        victory,
        profile.inventory.length
      );
      const nextProfile = applyBattleRewards(
        profile,
        rewards,
        nextBattle.totalDamage
      );

      setLastRewards(rewards);
      commitProfile(nextProfile);
      setMessage(victory ? 'Raid boss defeated.' : 'Party defeated. Rewards kept.');
    },
    [activeHero, battle, commitProfile, profile]
  );

  const startRaid = useCallback(() => {
    if (!profile) return;

    if (profile.energy < RAID_ENERGY_COST) {
      setMessage('Not enough energy for a raid.');
      return;
    }

    const nextProfile = {
      ...profile,
      energy: profile.energy - RAID_ENERGY_COST,
      updatedAt: new Date().toISOString(),
    };

    commitProfile(nextProfile);
    setBattle(createBattleState(nextProfile));
    setLastRewards(null);
    setMessage('Raid started.');
    setView('raid');
  }, [commitProfile, profile]);

  const handleDailyClaim = useCallback(() => {
    if (!profile) return;

    const result = claimDailyReward(profile);

    if (!result.claimed) {
      setMessage('Daily reward already claimed.');
      return;
    }

    commitProfile(result.save);
    setMessage('Daily reward claimed.');
  }, [commitProfile, profile]);

  const handleUpgradeHero = useCallback(
    (heroId: string) => {
      if (!profile) return;

      const result = upgradeHero(profile, heroId);

      if (!result.upgraded) {
        setMessage('Need more gold for that upgrade.');
        return;
      }

      commitProfile(result.save);

      if (!battle || battle.status !== 'active') {
        setBattle(createBattleState(result.save));
      }

      const template = getHeroTemplate(heroId);
      setMessage(`${template?.name ?? 'Hero'} upgraded.`);
    },
    [battle, commitProfile, profile]
  );

  if (loading || !profile || !battle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-4 text-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 text-center shadow-sm">
          <img
            className="mx-auto h-16 w-16 rounded-full bg-zinc-50 p-1"
            src="/snoo.png"
            alt="Snoo"
          />
          <h1 className="mt-3 text-2xl font-black">Reddit Raid Keeper</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-5">
        <header className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <img
              className="h-14 w-14 shrink-0 rounded-full bg-orange-50 p-1"
              src="/snoo.png"
              alt="Snoo"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-orange-700">
                u/{profile.username}
              </p>
              <h1 className="truncate text-2xl font-black sm:text-4xl">
                Reddit Raid Keeper
              </h1>
              <p className="text-sm font-semibold text-zinc-600">{message}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <CurrencyPill label="Gold" value={profile.gold} />
            <CurrencyPill label="Gems" value={profile.gems} />
            <CurrencyPill label="Energy" value={profile.energy} />
            <CurrencyPill label="Tokens" value={profile.raidTokens} />
          </div>
        </header>

        <nav className="grid grid-cols-3 gap-2">
          {(['raid', 'heroes', 'loot'] as ViewId[]).map((item) => (
            <button
              key={item}
              className={`h-11 rounded-md border px-3 text-sm font-black capitalize transition ${
                view === item
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
              }`}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {view === 'raid' ? (
          <section className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-zinc-200 bg-[#dbe7dd] p-4 shadow-sm">
              <div className="absolute inset-0 raid-field" />
              <div className="relative grid gap-4">
                <div className="rounded-lg border border-red-200 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-red-700">
                        {battle.boss.title}
                      </p>
                      <h2 className="text-2xl font-black">{battle.boss.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase text-zinc-500">
                        Round
                      </p>
                      <p className="text-2xl font-black">{battle.round}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${bossHpPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-bold text-zinc-600">
                    {formatNumber(battle.boss.hp)} /{' '}
                    {formatNumber(battle.boss.maxHp)} HP
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {battle.heroes.map((hero) => (
                    <div
                      key={hero.id}
                      className={`rounded-lg border bg-white/90 p-3 shadow-sm ${
                        activeHero?.id === hero.id
                          ? 'border-orange-400'
                          : 'border-zinc-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-zinc-500">
                            {hero.role}
                          </p>
                          <h3 className="text-base font-black leading-tight">
                            {hero.name}
                          </h3>
                        </div>
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-black ${getRarityClassName(
                            hero.rarity
                          )}`}
                        >
                          Lv {hero.level}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${getHpPercent(hero)}%` }}
                        />
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full bg-sky-500"
                          style={{ width: `${hero.charge}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold text-zinc-600">
                        {Math.round(hero.hp)} / {hero.maxHp} HP
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {battle.status !== 'active' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/65 px-4 backdrop-blur-[2px]">
                  <div className="w-full max-w-md rounded-lg bg-white p-5 text-center shadow-xl">
                    <p className="text-sm font-bold uppercase text-orange-700">
                      {battle.status === 'won' ? 'Raid cleared' : 'Raid failed'}
                    </p>
                    <h2 className="mt-2 text-3xl font-black">
                      {formatNumber(battle.totalDamage)} damage
                    </h2>
                    {lastRewards ? (
                      <p className="mt-2 text-sm font-semibold text-zinc-600">
                        +{lastRewards.gold} gold, +{lastRewards.exp} EXP, +
                        {lastRewards.raidTokens} tokens
                      </p>
                    ) : null}
                    <button
                      className="mt-5 h-12 w-full rounded-md bg-zinc-950 px-4 font-black text-white transition hover:bg-zinc-800"
                      onClick={startRaid}
                    >
                      Start next raid
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="grid content-start gap-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Active turn
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {activeHero?.name ?? 'No hero'}
                </h2>
                <p className="text-sm font-semibold text-zinc-600">
                  {livingHeroes} heroes standing
                </p>

                <div className="mt-4 grid gap-2">
                  <button
                    className="h-11 rounded-md bg-zinc-950 px-3 font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    onClick={() => handleAction('attack')}
                    disabled={battle.status !== 'active'}
                  >
                    Attack
                  </button>
                  <button
                    className="h-11 rounded-md bg-orange-500 px-3 font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    onClick={() => handleAction('skill')}
                    disabled={battle.status !== 'active'}
                  >
                    {activeHero?.skill.name ?? 'Skill'}
                  </button>
                  <button
                    className="h-11 rounded-md bg-indigo-600 px-3 font-black text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    onClick={() => handleAction('ultimate')}
                    disabled={battle.status !== 'active' || !canUseUltimate(activeHero)}
                  >
                    {activeHero?.ultimate.name ?? 'Ultimate'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      Daily
                    </p>
                    <p className="text-lg font-black">
                      {dailyAvailable ? 'Ready' : 'Claimed'}
                    </p>
                  </div>
                  <button
                    className="h-10 rounded-md bg-emerald-600 px-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    onClick={handleDailyClaim}
                    disabled={!dailyAvailable}
                  >
                    Claim
                  </button>
                </div>
                <button
                  className="mt-3 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-black text-zinc-950 transition hover:border-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
                  onClick={startRaid}
                  disabled={profile.energy < RAID_ENERGY_COST}
                >
                  New raid, {RAID_ENERGY_COST} energy
                </button>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Battle log
                </p>
                <div className="mt-3 grid gap-2">
                  {battle.logs.map((entry) => (
                    <p
                      key={entry.id}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold ${getLogToneClassName(
                        entry.tone
                      )}`}
                    >
                      {entry.message}
                    </p>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        ) : null}

        {view === 'heroes' ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {HEROES.map((hero) => {
              const progress = getHeroProgress(profile, hero.id);
              const stats = getScaledStats(hero, progress.level);
              const cost = getUpgradeCost(progress.level);
              const upgradeReady = canUpgradeHero(profile, hero.id);

              return (
                <article
                  key={hero.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-zinc-500">
                        {hero.role}
                      </p>
                      <h2 className="text-xl font-black">{hero.name}</h2>
                      <p className="text-sm font-semibold text-zinc-600">
                        {hero.title}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ${getRarityClassName(
                        hero.rarity
                      )}`}
                    >
                      {hero.rarity}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatLine label="HP" value={stats.hp} />
                    <StatLine label="ATK" value={stats.atk} />
                    <StatLine label="DEF" value={stats.def} />
                    <StatLine label="MAG" value={stats.mag} />
                    <StatLine label="RES" value={stats.res} />
                    <StatLine label="SPD" value={stats.spd} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-zinc-500">
                        Level {progress.level}
                      </p>
                      <p className="text-sm font-semibold text-zinc-600">
                        {progress.exp} EXP banked
                      </p>
                    </div>
                    <button
                      className="h-10 rounded-md bg-zinc-950 px-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                      onClick={() => handleUpgradeHero(hero.id)}
                      disabled={!upgradeReady}
                    >
                      Upgrade {cost}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {view === 'loot' ? (
          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-zinc-500">
                Raid record
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {formatNumber(profile.bestRaidDamage)} best damage
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatLine label="Total" value={profile.totalRaidDamage} />
                <StatLine label="Items" value={profile.inventory.length} />
                <StatLine label="Party" value={profile.party.length} />
                <StatLine label="Energy" value={profile.energy} />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-zinc-500">
                Equipment
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {profile.inventory.length > 0 ? (
                  profile.inventory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{item.name}</h3>
                          <p className="text-sm font-semibold text-zinc-600">
                            {item.slot} · +{item.bonus} {item.stat.toUpperCase()}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-black ${getRarityClassName(
                            item.rarity
                          )}`}
                        >
                          {item.rarity}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm font-semibold text-zinc-600">
                    Clear a raid to earn equipment.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
