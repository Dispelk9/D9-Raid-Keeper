import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HEROES, getHeroTemplate } from '../shared/game/data/heroes';
import { getBossAppearance } from '../shared/game/data/raidBosses';
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
  canUseSkill,
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
  HeroRole,
  HeroTemplate,
  PlayerSave,
  RewardBundle,
  StatBlock,
} from '../shared/game/types';
import { loadKeeperSave, persistKeeperSave } from './keeper/api';

type ViewId = 'raid' | 'heroes' | 'loot';

type FloatEvent = {
  id: string;
  heroId: string;
  value: number;
  kind: 'damage' | 'heal' | 'ultimate';
};

const RAID_ENERGY_COST = 10;
const VIEW_ITEMS: ViewId[] = ['raid', 'heroes', 'loot'];

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

const getRoleSpriteClassName = (role: HeroRole) => {
  if (role === 'Tank') return 'hero-tank';
  if (role === 'Warrior') return 'hero-warrior';
  if (role === 'Mage') return 'hero-mage';
  if (role === 'Ranger') return 'hero-ranger';
  if (role === 'Support') return 'hero-support';

  return 'hero-healer';
};

const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div className="min-h-0 rounded-md bg-white/90 px-2 py-1 shadow-sm">
    <p className="text-[10px] font-black uppercase leading-none text-zinc-500">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-black leading-none text-zinc-950">
      {value}
    </p>
  </div>
);

const CurrencyTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-white/90 px-2 py-1 shadow-sm">
    <p className="text-[10px] font-black uppercase leading-none text-zinc-500">
      {label}
    </p>
    <p className="mt-1 truncate text-xs font-black leading-none">
      {formatNumber(value)}
    </p>
  </div>
);

const HeroSprite = ({
  hero,
  active,
  floats,
}: {
  hero: BattleHero;
  active: boolean;
  floats: FloatEvent[];
}) => (
  <div
    className={`hero-slot ${active ? 'hero-slot-active' : ''} ${
      hero.hp <= 0 ? 'opacity-40 grayscale' : ''
    }`}
  >
    <div className={`hero-sprite ${getRoleSpriteClassName(hero.role)}`} style={{ position: 'relative' }}>
      <span className="text-lg leading-none select-none">{hero.icon}</span>
      {floats.map((f) => (
        <span
          key={f.id}
          className={`float-number ${
            f.kind === 'damage'
              ? 'text-red-500'
              : f.kind === 'heal'
              ? 'text-blue-400'
              : 'text-yellow-400'
          }`}
        >
          {f.kind === 'damage'
            ? `-${f.value}`
            : f.kind === 'heal'
            ? `+${f.value}`
            : '⚡'}
        </span>
      ))}
    </div>
    <div className="flex-1 min-w-0">
      <div className="hero-hp">
        <div style={{ width: `${getHpPercent(hero)}%` }} />
      </div>
      <div className="hero-charge">
        <div style={{ width: `${hero.charge}%` }} />
      </div>
    </div>
  </div>
);

const BossSprite = ({ hpPercent, icon }: { hpPercent: number; icon: string }) => (
  <div className="boss-sprite-wrap">
    <div className="boss-aura" />
    <div className="boss-sprite">
      <span className="boss-icon select-none">{icon}</span>
    </div>
    <div className="boss-shadow" />
    <p className="boss-percent">{hpPercent}%</p>
  </div>
);

const ActiveHeroStats = ({ hero }: { hero: BattleHero | null }) => {
  if (!hero) {
    return (
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        <StatTile label="HP" value="-" />
        <StatTile label="ATK" value="-" />
        <StatTile label="DEF" value="-" />
        <StatTile label="MAG" value="-" />
        <StatTile label="RES" value="-" />
        <StatTile label="SPD" value="-" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2">
      <StatTile label="HP" value={`${Math.round(hero.hp)}/${hero.maxHp}`} />
      <StatTile label="ATK" value={hero.atk} />
      <StatTile label="DEF" value={hero.def} />
      <StatTile label="MAG" value={hero.mag} />
      <StatTile label="RES" value={hero.res} />
      <StatTile label="SPD" value={hero.spd} />
    </div>
  );
};

const CompactHeroCard = ({
  hero,
  level,
  upgradeReady,
  onUpgrade,
  onClick,
}: {
  hero: HeroTemplate;
  level: number;
  upgradeReady: boolean;
  onUpgrade: () => void;
  onClick: () => void;
}) => (
  <article
    className="grid min-h-0 grid-cols-[48px_1fr] gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm cursor-pointer active:bg-zinc-50"
    onClick={onClick}
  >
    <div className={`hero-card-sprite ${getRoleSpriteClassName(hero.role)}`}>
      <span className="text-2xl leading-none select-none">{hero.icon}</span>
    </div>
    <div className="min-w-0 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-1">
          <h2 className="truncate text-sm font-black leading-tight">{hero.name}</h2>
          <span
            className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-black ${getRarityClassName(hero.rarity)}`}
          >
            {hero.rarity[0]}
          </span>
        </div>
        <p className="text-[10px] font-black uppercase text-zinc-500">
          {hero.role} · Lv {level}
        </p>
      </div>
      <button
        className="mt-1 h-6 w-full rounded bg-zinc-950 text-[10px] font-black text-white disabled:bg-zinc-300"
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade();
        }}
        disabled={!upgradeReady}
      >
        Upgrade
      </button>
    </div>
  </article>
);

const HeroDetailSheet = ({
  hero,
  stats,
  level,
  exp,
  cost,
  upgradeReady,
  onUpgrade,
  onClose,
}: {
  hero: HeroTemplate;
  stats: StatBlock;
  level: number;
  exp: number;
  cost: number;
  upgradeReady: boolean;
  onUpgrade: () => void;
  onClose: () => void;
}) => (
  <div
    className="absolute inset-0 z-50 flex items-end bg-black/60"
    onClick={onClose}
  >
    <div
      className="w-full rounded-t-2xl bg-white p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`hero-card-sprite ${getRoleSpriteClassName(hero.role)}`} style={{ width: 56, height: 56 }}>
          <span className="text-3xl leading-none select-none">{hero.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black truncate">{hero.name}</h2>
          <p className="text-[11px] font-bold text-zinc-500">{hero.title} · {hero.role}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${getRarityClassName(hero.rarity)}`}>
              {hero.rarity}
            </span>
            <span className="text-xs font-bold text-zinc-500">Lv {level}</span>
            <span className="text-xs font-bold text-zinc-400">{exp} EXP</span>
          </div>
        </div>
        <button
          className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 text-zinc-600 font-black text-sm"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="HP" value={stats.hp} />
        <StatTile label="ATK" value={stats.atk} />
        <StatTile label="DEF" value={stats.def} />
        <StatTile label="MAG" value={stats.mag} />
        <StatTile label="RES" value={stats.res} />
        <StatTile label="SPD" value={stats.spd} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-md border border-orange-200 bg-orange-50 p-2">
          <p className="text-[10px] font-black uppercase text-orange-700">Skill</p>
          <p className="text-sm font-black leading-tight">{hero.skill.name}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{hero.skill.summary}</p>
        </div>
        <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
          <p className="text-[10px] font-black uppercase text-indigo-700">Ultimate</p>
          <p className="text-sm font-black leading-tight">{hero.ultimate.name}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{hero.ultimate.summary}</p>
        </div>
      </div>

      <button
        className="h-11 w-full rounded-lg bg-zinc-950 font-black text-white disabled:bg-zinc-300"
        onClick={onUpgrade}
        disabled={!upgradeReady}
      >
        {upgradeReady ? `Upgrade · ${cost} gold` : `Need ${cost} gold`}
      </button>
    </div>
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

  const nextBossAppearance = getBossAppearance(profile.raidLevel);

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

          {/* RAID VIEW */}
          {view === 'raid' ? (
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
                    onClick={() => handleAction('attack')}
                    disabled={battle.status !== 'active' || !activeHero}
                  >
                    Attack
                  </button>
                  <button
                    className={`h-8 rounded-md text-[11px] font-black text-white disabled:bg-zinc-300 ${
                      canUseSkill(activeHero) ? 'bg-orange-500' : 'bg-zinc-400'
                    }`}
                    onClick={() => handleAction('skill')}
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
                    onClick={() => handleAction('ultimate')}
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
                        onClick={startRaid}
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
                  onClick={() => setStatsExpanded((s) => !s)}
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
          ) : null}

          {/* HEROES VIEW */}
          {view === 'heroes' ? (
            <section className="relative grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="h-10 rounded-md bg-emerald-600 text-sm font-black text-white disabled:bg-zinc-300"
                  onClick={handleDailyClaim}
                  disabled={!dailyAvailable}
                >
                  {dailyAvailable ? 'Claim daily' : 'Daily done'}
                </button>
                <button
                  className="h-10 rounded-md bg-zinc-950 text-sm font-black text-white disabled:bg-zinc-300"
                  onClick={startRaid}
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
                      onUpgrade={() => handleUpgradeHero(hero.id)}
                      onClick={() => setSelectedHeroId(hero.id)}
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
                      handleUpgradeHero(heroTemplate.id);
                      setSelectedHeroId(null);
                    }}
                    onClose={() => setSelectedHeroId(null)}
                  />
                );
              })()}
            </section>
          ) : null}

          {/* LOOT VIEW */}
          {view === 'loot' ? (
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
                  onClick={handleDailyClaim}
                  disabled={!dailyAvailable}
                >
                  {dailyAvailable ? 'Daily' : 'Claimed'}
                </button>
                <button
                  className="h-10 rounded-md bg-zinc-950 text-sm font-black text-white disabled:bg-zinc-300"
                  onClick={startRaid}
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
          ) : null}
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
