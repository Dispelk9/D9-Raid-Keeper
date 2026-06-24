import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getHeroTemplate } from '../shared/game/data/heroes';
import {
  applyBattleRewards,
  canClaimDailyReward,
  claimDailyReward,
  createBattleRewards,
  upgradeHero,
} from '../shared/game/logic/progression';
import {
  canUseSkill,
  canUseUltimate,
  createBattleState,
  getActiveHero,
  getBossHpPercent,
  resolveHeroAction,
} from '../shared/game/logic/combat';
import type {
  BattleAction,
  BattleState,
  PlayerSave,
  RewardBundle,
} from '../shared/game/types';
import { loadKeeperSave, persistKeeperSave } from './keeper/api';
import { CurrencyTile, FloatEvent } from './components/uiComponents';
import { RaidView, HeroesView, LootView } from './components/viewComponents';

type ViewId = 'raid' | 'heroes' | 'loot';

const RAID_ENERGY_COST = 10;
const VIEW_ITEMS: ViewId[] = ['raid', 'heroes', 'loot'];

export const App = () => {
  const fallbackUsername = context.username ?? 'player';
  const [view, setView] = useState<ViewId>('raid');
  const [profile, setProfile] = useState<PlayerSave | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading raid records.');
  const [lastRewards, setLastRewards] = useState<RewardBundle | null>(null);

  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [floatEvents, setFloatEvents] = useState<FloatEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loadedSave = await loadKeeperSave(fallbackUsername);

      if (cancelled) return;

      setProfile(loadedSave);
      setBattle(createBattleState(loadedSave));
      setMessage(`u/${loadedSave.username}`);
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

  const addFloatEvents = useCallback((events: FloatEvent[]) => {
    if (events.length === 0) return;
    setFloatEvents((prev) => [...prev, ...events]);
    const ids = events.map((e) => e.id);
    setTimeout(() => {
      setFloatEvents((prev) => prev.filter((e) => !ids.includes(e.id)));
    }, 1400);
  }, []);

  const handleAction = useCallback(
    (action: BattleAction) => {
      if (!profile || !battle || battle.status !== 'active') return;

      if (action === 'ultimate' && !canUseUltimate(activeHero)) {
        setMessage('Ultimate not ready');
        return;
      }

      if (action === 'skill' && !canUseSkill(activeHero)) {
        setMessage(`Skill cooldown: ${activeHero?.skillCooldown ?? 0}`);
        return;
      }

      const prevHeroes = battle.heroes;
      const nextBattle = resolveHeroAction(battle, action);

      // Compute floating combat numbers by comparing HP changes
      const newFloats: FloatEvent[] = [];
      nextBattle.heroes.forEach((nextHero, i) => {
        const prevHero = prevHeroes[i];
        if (!prevHero) return;
        const diff = Math.round(nextHero.hp) - Math.round(prevHero.hp);
        if (Math.abs(diff) < 1) return;
        const isActorUlt =
          action === 'ultimate' && prevHero.id === (activeHero?.id ?? '');
        newFloats.push({
          id: `${Date.now()}-${nextHero.id}-${i}`,
          heroId: nextHero.id,
          value: Math.abs(diff),
          kind: diff < 0 ? (isActorUlt ? 'ultimate' : 'damage') : 'heal',
        });
      });

      // Yellow indicator on the hero who used their ultimate
      if (action === 'ultimate' && activeHero) {
        const existing = newFloats.find((f) => f.heroId === activeHero.id);
        if (existing) {
          existing.kind = 'ultimate';
        } else {
          newFloats.push({
            id: `${Date.now()}-ult-${activeHero.id}`,
            heroId: activeHero.id,
            value: 0,
            kind: 'ultimate',
          });
        }
      }

      addFloatEvents(newFloats);
      setBattle(nextBattle);

      if (nextBattle.status === 'active') {
        setMessage(activeHero ? `${activeHero.name} acted` : 'Turn advanced');
        return;
      }

      const victory = nextBattle.status === 'won';
      const rewards = createBattleRewards(
        nextBattle.totalDamage,
        victory,
        profile.inventory.length,
        victory ? 1 : 0,
        1
      );
      const nextProfile = applyBattleRewards(
        profile,
        rewards,
        nextBattle.totalDamage,
        {
          victory,
          raidLevel: profile.raidLevel,
        }
      );

      setLastRewards(rewards);
      commitProfile(nextProfile);
      setMessage(victory ? 'Raid cleared' : 'Party defeated');
    },
    [activeHero, addFloatEvents, battle, commitProfile, profile]
  );

  const startRaid = useCallback(() => {
    if (!profile) return;

    if (profile.energy < RAID_ENERGY_COST) {
      setMessage('Need energy');
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
    setFloatEvents([]);
    setMessage(`Raid Lv ${nextProfile.raidLevel}`);
    setView('raid');
  }, [commitProfile, profile]);

  const handleDailyClaim = useCallback(() => {
    if (!profile) return;

    const result = claimDailyReward(profile);

    if (!result.claimed) {
      setMessage('Daily claimed');
      return;
    }

    commitProfile(result.save);
    setMessage('Daily reward');
  }, [commitProfile, profile]);

  const handleUpgradeHero = useCallback(
    (heroId: string) => {
      if (!profile) return;

      const result = upgradeHero(profile, heroId);

      if (!result.upgraded) {
        setMessage('Need gold');
        return;
      }

      commitProfile(result.save);

      if (!battle || battle.status !== 'active') {
        setBattle(createBattleState(result.save));
      }

      const template = getHeroTemplate(heroId);
      setMessage(`${template?.name ?? 'Hero'} up`);
    },
    [battle, commitProfile, profile]
  );

  if (loading || !profile || !battle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-950">
        <section className="w-full max-w-[430px] rounded-lg bg-[#f4f1ea] p-5 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
            👹
          </div>
          <h1 className="mt-3 text-2xl font-black">Reddit Raid Keeper</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-zinc-950">
      <section className="relative mx-auto flex h-screen min-h-[640px] max-h-[920px] w-full max-w-[430px] flex-col overflow-hidden bg-[#f4f1ea]">

        {/* Collapsible Header */}
        <header className="shrink-0 border-b border-zinc-200 bg-[#fffaf2] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              className="flex min-w-0 items-center gap-1.5"
              onClick={() => setHeaderExpanded((h) => !h)}
            >
              <p className="truncate text-[11px] font-black uppercase text-orange-700">
                {message}
              </p>
              <span className="shrink-0 text-[10px] text-zinc-400">
                {headerExpanded ? '▲' : '▼'}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-zinc-500">
                ⚡{profile.energy}
              </span>
              <div className="rounded-md bg-zinc-950 px-2 py-1 text-right text-white">
                <p className="text-[10px] font-black uppercase leading-none">Raid</p>
                <p className="mt-1 text-sm font-black leading-none">
                  {profile.raidLevel}
                </p>
              </div>
            </div>
          </div>

          {headerExpanded && (
            <>
              <h1 className="mt-2 truncate text-xl font-black leading-tight">
                Reddit Raid Keeper
              </h1>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <CurrencyTile label="Gold" value={profile.gold} />
                <CurrencyTile label="Gems" value={profile.gems} />
                <CurrencyTile label="EN" value={profile.energy} />
                <CurrencyTile label="Tok" value={profile.raidTokens} />
              </div>
            </>
          )}
        </header>

        <nav className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-zinc-200 bg-[#fffaf2] px-3 py-2">
          {VIEW_ITEMS.map((item) => (
            <button
              key={item}
              className={`h-9 rounded-md border text-sm font-black capitalize transition ${
                view === item
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700'
              }`}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 p-2">
          {view === 'raid' && (
            <RaidView
              battle={battle}
              profile={profile}
              activeHero={activeHero}
              bossHpPercent={bossHpPercent}
              floatEvents={floatEvents}
              livingHeroes={livingHeroes}
              lastRewards={lastRewards}
              statsExpanded={statsExpanded}
              onSetStatsExpanded={setStatsExpanded}
              onAction={handleAction}
              onStartRaid={startRaid}
            />
          )}
          {view === 'heroes' && (
            <HeroesView
              profile={profile}
              selectedHeroId={selectedHeroId}
              dailyAvailable={dailyAvailable}
              onSetSelectedHeroId={setSelectedHeroId}
              onUpgradeHero={handleUpgradeHero}
              onDailyClaim={handleDailyClaim}
              onStartRaid={startRaid}
            />
          )}
          {view === 'loot' && (
            <LootView
              profile={profile}
              dailyAvailable={dailyAvailable}
              onDailyClaim={handleDailyClaim}
              onStartRaid={startRaid}
            />
          )}
        </div>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
