import type { HeroTemplate, StatBlock } from '../../shared/game/types';
import { StatTile, getRarityClassName, getRoleSpriteClassName } from './uiComponents';

export const CompactHeroCard = ({
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

export const HeroDetailSheet = ({
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
