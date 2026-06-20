import type { HeroSkill, HeroSkillUnlock, HeroTemplate } from '../types';

export const HEROES: HeroTemplate[] = [
  {
    id: 'snoo-vanguard',
    name: 'Snoo Vanguard',
    title: 'Front Tank',
    role: 'Tank',
    rarity: 'Rare',
    icon: '🛡️',
    spriteFrame: 0, // top-left: Viking/Tank
    stats: { hp: 188, atk: 22, def: 31, mag: 10, res: 22, spd: 14 },
    skill: {
      id: 'shield-bash',
      name: 'Shield Bash',
      summary: 'DEF-scaled strike',
      power: 1.15,
      kind: 'strike',
    },
    skillUnlocks: [
      {
        level: 6,
        skill: {
          id: 'shield-glare',
          name: 'Shield Glare',
          summary: 'DEF strike, lowers boss accuracy',
          power: 1.25,
          kind: 'strike',
          effect: {
            target: 'boss',
            accuracyModifier: -0.12,
            duration: 2,
          },
        },
      },
      {
        level: 17,
        skill: {
          id: 'bulwark-taunt',
          name: 'Bulwark Taunt',
          summary: 'Guard strike, party evade up',
          power: 1.45,
          kind: 'strike',
          effect: {
            target: 'party',
            evasionModifier: 0.08,
            duration: 2,
          },
        },
      },
    ],
    ultimate: {
      id: 'mod-wall',
      name: 'Mod Wall',
      summary: 'Heavy guard strike',
      power: 2.4,
      kind: 'strike',
    },
  },
  {
    id: 'karma-duelist',
    name: 'Karma Duelist',
    title: 'Damage Dealer',
    role: 'Warrior',
    rarity: 'Epic',
    icon: '⚔️',
    spriteFrame: 2, // top-right: Knight/Warrior
    stats: { hp: 148, atk: 36, def: 19, mag: 12, res: 15, spd: 24 },
    skill: {
      id: 'double-slash',
      name: 'Double Slash',
      summary: 'Fast two-hit strike',
      power: 1.5,
      kind: 'strike',
      accuracyBonus: 0.03,
    },
    skillUnlocks: [
      {
        level: 7,
        skill: {
          id: 'smoke-slash',
          name: 'Smoke Slash',
          summary: 'Strike, smoke raises party evade',
          power: 1.36,
          kind: 'strike',
          effect: {
            target: 'party',
            evasionModifier: 0.14,
            duration: 2,
          },
        },
      },
      {
        level: 19,
        skill: {
          id: 'reckless-flurry',
          name: 'Reckless Flurry',
          summary: 'Risky strike, high crit chance',
          power: 1.82,
          kind: 'strike',
          critBonus: 0.12,
        },
      },
    ],
    ultimate: {
      id: 'front-page-cleave',
      name: 'Front Page Cleave',
      summary: 'Massive ATK strike',
      power: 3.1,
      kind: 'strike',
    },
  },
  {
    id: 'flair-archmage',
    name: 'Flair Archmage',
    title: 'Damage Dealer',
    role: 'Mage',
    rarity: 'Epic',
    icon: '🔮',
    spriteFrame: 1, // top-middle: Wizard/Mage
    stats: { hp: 118, atk: 12, def: 13, mag: 42, res: 27, spd: 18 },
    skill: {
      id: 'flame-thread',
      name: 'Flame Thread',
      summary: 'MAG-scaled spell',
      power: 1.58,
      kind: 'spell',
    },
    skillUnlocks: [
      {
        level: 5,
        skill: {
          id: 'blind-magic',
          name: 'Blind Magic',
          summary: 'Spell, lowers boss accuracy',
          power: 1.18,
          kind: 'spell',
          effect: {
            target: 'boss',
            accuracyModifier: -0.18,
            duration: 3,
          },
        },
      },
      {
        level: 16,
        skill: {
          id: 'void-spark',
          name: 'Void Spark',
          summary: 'Heavy spell with crit chance',
          power: 1.82,
          kind: 'spell',
          critBonus: 0.05,
        },
      },
    ],
    ultimate: {
      id: 'meteor-repost',
      name: 'Meteor Repost',
      summary: 'Huge spell burst',
      power: 3.35,
      kind: 'spell',
    },
  },
  {
    id: 'upvote-ranger',
    name: 'Upvote Ranger',
    title: 'Damage Dealer',
    role: 'Ranger',
    rarity: 'Rare',
    icon: '🏹',
    spriteFrame: 4, // bottom-middle: Adventurer/Ranger
    stats: { hp: 132, atk: 29, def: 16, mag: 16, res: 16, spd: 34 },
    skill: {
      id: 'focus-shot',
      name: 'Focus Shot',
      summary: 'SPD-assisted shot',
      power: 1.38,
      kind: 'strike',
      accuracyBonus: 0.06,
      critBonus: 0.04,
    },
    skillUnlocks: [
      {
        level: 8,
        skill: {
          id: 'pinpoint-shot',
          name: 'Pinpoint Shot',
          summary: 'Precise shot, high hit and crit',
          power: 1.48,
          kind: 'strike',
          accuracyBonus: 0.12,
          critBonus: 0.08,
        },
      },
      {
        level: 18,
        skill: {
          id: 'hamstring-volley',
          name: 'Hamstring Volley',
          summary: 'Volley, lowers boss accuracy',
          power: 1.64,
          kind: 'strike',
          accuracyBonus: 0.06,
          effect: {
            target: 'boss',
            accuracyModifier: -0.1,
            duration: 2,
          },
        },
      },
    ],
    ultimate: {
      id: 'arrow-storm',
      name: 'Arrow Storm',
      summary: 'Rapid precision burst',
      power: 2.85,
      kind: 'strike',
    },
  },
  {
    id: 'award-sage',
    name: 'Award Sage',
    title: 'Healer',
    role: 'Healer',
    rarity: 'Epic',
    icon: '💊',
    spriteFrame: 5, // bottom-right: Scientist/Healer
    stats: { hp: 126, atk: 10, def: 14, mag: 34, res: 34, spd: 20 },
    skill: {
      id: 'golden-heal',
      name: 'Golden Heal',
      summary: 'Restore lowest ally',
      power: 1.42,
      kind: 'heal',
    },
    skillUnlocks: [
      {
        level: 9,
        skill: {
          id: 'lucky-mend',
          name: 'Lucky Mend',
          summary: 'Stronger heal, self evade up',
          power: 1.58,
          kind: 'heal',
          effect: {
            target: 'self',
            evasionModifier: 0.1,
            duration: 2,
          },
        },
      },
      {
        level: 20,
        skill: {
          id: 'field-remedy',
          name: 'Field Remedy',
          summary: 'Heal, party evade up',
          power: 1.34,
          kind: 'heal',
          effect: {
            target: 'party',
            evasionModifier: 0.08,
            duration: 2,
          },
        },
      },
    ],
    ultimate: {
      id: 'platinum-revive',
      name: 'Platinum Revival',
      summary: 'Party-wide heal',
      power: 2.2,
      kind: 'heal',
    },
  },
  {
    id: 'automod-oracle',
    name: 'Automod Oracle',
    title: 'Support',
    role: 'Support',
    rarity: 'Legendary',
    icon: '🤖',
    spriteFrame: 3, // bottom-left: Robot/Support
    stats: { hp: 138, atk: 16, def: 20, mag: 29, res: 32, spd: 26 },
    skill: {
      id: 'protect-protocol',
      name: 'Protect Protocol',
      summary: 'Charge party skills',
      power: 1.08,
      kind: 'rally',
    },
    skillUnlocks: [
      {
        level: 10,
        skill: {
          id: 'static-screen',
          name: 'Static Screen',
          summary: 'Rally, party evade up',
          power: 1.14,
          kind: 'rally',
          effect: {
            target: 'party',
            evasionModifier: 0.12,
            duration: 2,
          },
        },
      },
      {
        level: 22,
        skill: {
          id: 'automod-blind',
          name: 'Automod Blind',
          summary: 'Support spell, lowers boss accuracy',
          power: 1.62,
          kind: 'spell',
          accuracyBonus: 0.04,
          effect: {
            target: 'boss',
            accuracyModifier: -0.16,
            duration: 3,
          },
        },
      },
    ],
    ultimate: {
      id: 'thread-lock',
      name: 'Thread Lock',
      summary: 'Heavy support spell',
      power: 2.55,
      kind: 'spell',
    },
  },
];

export const STARTER_PARTY = [
  'snoo-vanguard',
  'karma-duelist',
  'flair-archmage',
  'upvote-ranger',
  'award-sage',
];

export const getHeroTemplate = (heroId: string) =>
  HEROES.find((hero) => hero.id === heroId);

export const getHeroSkillUnlocks = (hero: HeroTemplate): HeroSkillUnlock[] => [
  {
    level: 1,
    skill: hero.skill,
  },
  ...(hero.skillUnlocks ?? []),
];

export const getHeroSkillForLevel = (
  hero: HeroTemplate,
  level: number
): HeroSkill =>
  getHeroSkillUnlocks(hero)
    .filter((unlock) => level >= unlock.level)
    .sort((first, second) => second.level - first.level)[0]?.skill ??
  hero.skill;

export const getNextHeroSkillUnlock = (hero: HeroTemplate, level: number) =>
  getHeroSkillUnlocks(hero)
    .filter((unlock) => unlock.level > level)
    .sort((first, second) => first.level - second.level)[0] ?? null;
