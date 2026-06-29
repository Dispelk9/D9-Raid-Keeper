import type { BattleHero, HeroTemplate, HeroRole } from '../../shared/game/types';

export type FloatEvent = {
  id: string;
  heroId: string;
  value: number;
  kind: 'damage' | 'heal' | 'ultimate';
};

export const formatNumber = (value: number) => Math.round(value).toLocaleString();

export const getHpPercent = (hero: BattleHero) =>
  Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));

export const getRarityClassName = (rarity: HeroTemplate['rarity']) => {
  if (rarity === 'Legendary') return 'bg-amber-100 text-amber-900';
  if (rarity === 'Epic') return 'bg-indigo-100 text-indigo-900';
  if (rarity === 'Rare') return 'bg-sky-100 text-sky-900';
  if (rarity === 'Mythic') return 'bg-rose-100 text-rose-900';

  return 'bg-zinc-100 text-zinc-700';
};

export const getRoleSpriteClassName = (role: HeroRole) => {
  if (role === 'Backend' || role === 'Security') return 'hero-warrior';
  if (role === 'DevOps') return 'hero-tank';
  if (role === 'Frontend' || role === 'QA') return 'hero-mage';
  return 'hero-healer';
};

export const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div className="min-h-0 rounded-md bg-white/90 px-2 py-1 shadow-sm">
    <p className="text-[10px] font-black uppercase leading-none text-zinc-500">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-black leading-none text-zinc-950">
      {value}
    </p>
  </div>
);

export const CurrencyTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-white/90 px-2 py-1 shadow-sm">
    <p className="text-[10px] font-black uppercase leading-none text-zinc-500">
      {label}
    </p>
    <p className="mt-1 truncate text-xs font-black leading-none">
      {formatNumber(value)}
    </p>
  </div>
);
