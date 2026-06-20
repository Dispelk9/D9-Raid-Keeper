import type { BossSpecialSkill } from '../types';

type BossAppearance = {
  name: string;
  title: string;
  icon: string;
  spriteKey: string;
};

// 10 bosses ordered by difficulty — one new sprite unlocks every ~3 raid levels
export const getBossAppearance = (raidLevel: number): BossAppearance => {
  if (raidLevel <= 2)  return { name: 'Goo Spawner',     title: 'Primordial Ooze',    icon: '🟢', spriteKey: 'boss-goo'        };
  if (raidLevel <= 4)  return { name: 'Talon Hawk',       title: 'Sky Predator',       icon: '🦅', spriteKey: 'boss-bird'       };
  if (raidLevel <= 7)  return { name: 'Flame Beast',      title: 'Infernal Salamander',icon: '🔥', spriteKey: 'boss-salamander' };
  if (raidLevel <= 10) return { name: 'Shell Knight',     title: 'Armored Warlord',    icon: '🛡️', spriteKey: 'boss-shello'     };
  if (raidLevel <= 13) return { name: 'Corsair Captain',  title: 'Pirate Overlord',    icon: '🏴', spriteKey: 'boss-pirate'     };
  if (raidLevel <= 16) return { name: 'Dark Witch',       title: 'Hex Mistress',       icon: '🧙', spriteKey: 'boss-witch'      };
  if (raidLevel <= 20) return { name: 'Wailing Prince',   title: 'Undead Sovereign',   icon: '💀', spriteKey: 'boss-prince'     };
  if (raidLevel <= 24) return { name: 'Laser Drone',      title: 'Autonomous Weapon',  icon: '🤖', spriteKey: 'boss-drone'      };
  if (raidLevel <= 28) return { name: 'Scout Machine',    title: 'Recon Spider',       icon: '🕷️', spriteKey: 'boss-scout'      };
  return               { name: 'Shadow Outlaw',    title: 'Primordial Entity',  icon: '☠️', spriteKey: 'boss-outlaw'     };
};

// All boss texture keys → sprite file mapping (used in BootScene to preload)
export const BOSS_SPRITE_MAP: Record<string, string> = {
  'boss-goo':        'assets/sprites/bosses/World01_001_GreenGoo.png',
  'boss-bird':       'assets/sprites/bosses/World01_003_Bird.png',
  'boss-salamander': 'assets/sprites/bosses/World01_002_Salamander.png',
  'boss-shello':     'assets/sprites/bosses/World01_005_Shello.png',
  'boss-pirate':     'assets/sprites/bosses/World01_007_Pirate.png',
  'boss-witch':      'assets/sprites/bosses/World01_006_Witch.png',
  'boss-prince':     'assets/sprites/bosses/World01_004_WailingPrince.png',
  'boss-drone':      'assets/sprites/bosses/World04_001_ LaserDrone.png',
  'boss-scout':      'assets/sprites/bosses/World04_002_ ScoutMachine.png',
  'boss-outlaw':     'assets/sprites/bosses/World04_003_ Outlaw.png',
};

// Elite bosses appear every 5 levels starting at level 5
export const isEliteBoss = (raidLevel: number): boolean =>
  raidLevel >= 5 && raidLevel % 5 === 0;

const ELITE_SKILLS: BossSpecialSkill[] = [
  {
    name: 'Blinding Flash',
    icon: '👁️',
    effectType: 'blind',
    target: 'party',
    duration: 3,
  },
  {
    name: 'Mind Warp',
    icon: '🌀',
    effectType: 'confuse',
    target: 'single',
    duration: 2,
  },
  {
    name: 'Blood Rage',
    icon: '🔴',
    effectType: 'berserk',
    target: 'single',
    duration: 2,
  },
  {
    name: 'Void Silence',
    icon: '🔇',
    effectType: 'silence',
    target: 'party',
    duration: 2,
  },
  {
    name: 'Concussion',
    icon: '💫',
    effectType: 'daze',
    target: 'single',
    duration: 1,
  },
];

export const getEliteSkill = (raidLevel: number): BossSpecialSkill => {
  const idx = (Math.floor(raidLevel / 5) - 1) % ELITE_SKILLS.length;
  return ELITE_SKILLS[idx] ?? ELITE_SKILLS[0]!;
};

export const RAID_BOSS_TEMPLATE = {
  id: 'raid-boss',
  hp: 520,
  atk: 26,
  def: 14,
  mag: 22,
  res: 14,
  spd: 18,
  countdown: 4,
};
