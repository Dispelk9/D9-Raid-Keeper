import type { BattleHero } from '../../shared/game/types';
import { FloatEvent, StatTile, getHpPercent, getRoleSpriteClassName } from './uiComponents';

export const HeroSprite = ({
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

export const BossSprite = ({ hpPercent, icon }: { hpPercent: number; icon: string }) => (
  <div className="boss-sprite-wrap">
    <div className="boss-aura" />
    <div className="boss-sprite">
      <span className="boss-icon select-none">{icon}</span>
    </div>
    <div className="boss-shadow" />
    <p className="boss-percent">{hpPercent}%</p>
  </div>
);

export const ActiveHeroStats = ({ hero }: { hero: BattleHero | null }) => {
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
