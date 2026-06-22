# D9 Raid Keeper — App Documentation

Full technical reference for the `d9r-game` Devvit app.

---

## Changelog

### Session 2 — Phaser 3 rewrite + pixel art sprites (`d295aef`)
- Replaced the original React/HTML game client with a full **Phaser 3** game (430×760, Scale.FIT).
- Swapped the old `heroes.png` spritesheet (20×33 tiny frames) for two 6-frame 512×512 **Snoo hero sheets** (`Snoo_heroes_left.png`, `Snoo_heroes_center.png`).
- Added a real **battle background** and **HUD overlay image**.
- Added 10 **boss sprites** in `public/assets/sprites/bosses/` (two worlds).
- Introduced the **heroes view** (card grid with level, skill, upgrade) and **loot view**.
- Added **skill cooldowns**, **LB charge** (Limit Break), and **per-hero skill unlocks** at levels 6/7/8/9/10.
- Added **boss countdown** system — boss uses a party-wide Thread Quake when it hits zero.
- Added animated **float numbers** (red damage, blue heal, yellow ⚡ ultimate).
- Added **settings panel** (nav, currency tiles, daily reward, new raid button).
- Added hero **detail sheet** (stats grid, skill/ult panels, upgrade button).
- Full hero roster: Snoo Vanguard, Karma Duelist, Flair Archmage, Upvote Ranger, Award Sage, Automod Oracle — each with a unique role, ultimate, and level-gated skill upgrades.

### Session 3 — Battle log, elite bosses, status effects, damage effects (current)
- **Battle log panel** replaces the old hero-stats bar at the bottom of the raid screen.
  - Shows last 7 combat events, color-coded: green (hero), red (boss), gold (reward/level-up), gray (system).
  - Header row shows active hero, heroes alive, and current round.
  - Level-up messages (⭐ Hero leveled up to Lv N!) injected when a battle ends.
- **Elite bosses** appear every 5 raid levels (5, 10, 15, 20 …).
  - +30% HP, ATK, MAG compared to a normal boss of the same level.
  - Gold aura + ⚡ ELITE title badge instead of the normal red.
  - Each has a rotating **special debuff skill** (see Status Effects below).
- **Status effects** on heroes from elite boss skills:
  | Effect | Source skill | Behaviour |
  |---|---|---|
  | Daze | Concussion | Hero loses their entire next turn |
  | Silence | Void Silence | Skill/Ult blocked; falls back to basic attack |
  | Berserk | Blood Rage | +50% ATK multiplier; Skill/Ult blocked |
  | Confuse | Mind Warp | +32% miss chance per turn |
  | Blind | Blinding Flash | −28% accuracy modifier (party-wide) |
- **Damage effect sprites** (`Damage_effect.png`, 4×4 spritesheet at 384×256 per frame).
  - Hero skills display role-matched effects over the boss on each action.
  - Boss attacks display matching effect sprites over the hit hero slot.
  - Boss debuff skills display effect sprites over each affected hero slot.

---

## Requirements

- **Node 22+** — verify with `node -v`
- **Devvit CLI** — installed via `npm install` inside `d9r-game/`
- A Reddit account with **moderator access** to a subreddit (required for playtesting)

---

## Commands

All commands run from inside `d9r-game/`.

```bash
npm install           # install dependencies
npm run login         # Devvit OAuth — opens browser
npm run dev           # live playtest on Reddit (hot-reload)
npm run deploy        # type-check + lint + upload
npm run launch        # deploy + devvit publish (public)
npm run type-check    # TypeScript only
npm run lint          # ESLint only
npm run build         # Vite production build (no upload)
npm run prettier      # auto-format source files
```

---

## Where to Find What

```
d9r-game/
├── public/
│   └── assets/
│       ├── backgrounds/
│       │   └── Battle-background-hazy-hills-files/PNG/
│       │       ├── battle-background-sunny-hillsx4.png   Battle stage BG
│       │       └── HUD.png                               Action bar overlay
│       ├── effects/
│       │   └── Damage_effect.png   4×4 spritesheet: row 0=Fire, 1=Thunder,
│       │                           2=Blizzard, 3=Slash/Hit (384×256 per frame)
│       └── sprites/
│           ├── Snoo_heroes_left.png    6-frame sheet used in raid hero slots
│           ├── Snoo_heroes_center.png  6-frame sheet used in heroes tab cards
│           └── bosses/                 10 individual boss PNGs (World01 + World04)
│
└── src/
    ├── client/
    │   ├── game.ts               Phaser entry point (Scale.FIT 430×760, mounts Boot → Game)
    │   ├── game.html             Game iframe shell
    │   ├── splash.tsx            Reddit feed card (React only, no Phaser)
    │   ├── keeper/api.ts         Save/load helpers (Redis + localStorage fallback)
    │   └── phaser/
    │       ├── constants.ts      Layout constants (W, H, PAD), colour palette,
    │       │                     COLORS, FONT, ROLE_COLOR, RARITY_COLOR
    │       └── scenes/
    │           ├── BootScene.ts  Asset preloader — Snoo sheets, boss sprites,
    │           │                 battle BG, HUD, damage effects spritesheet.
    │           │                 Exports: SNOO_LEFT_SHEET_KEY, SNOO_CENTER_SHEET_KEY,
    │           │                          HUD_KEY, DAMAGE_EFFECT_KEY + frame dims
    │           └── GameScene.ts  All game UI in one scene:
    │                             · Raid view: boss info bar, boss sprite, hero slots,
    │                               action buttons, battle log panel
    │                             · Heroes view: card grid + hero detail bottom sheet
    │                             · Loot view: stats + item list
    │                             · Settings panel: nav, currency tiles, daily reward
    │                             · Result overlay: win/lose, rewards, next boss preview
    │                             · spawnEffectSprite() — role-matched damage effects
    │                             · spawnFloat() — floating damage/heal/ult numbers
    │
    ├── server/
    │   ├── index.ts              Devvit app entry + Hono router
    │   └── routes/
    │       ├── api.ts            /api/keeper — Redis save/load endpoint
    │       ├── menu.ts           Reddit moderator menu actions
    │       ├── forms.ts          Devvit form handlers
    │       └── triggers.ts       Devvit event triggers
    │
    └── shared/
        └── game/
            ├── types.ts          All TypeScript types:
            │                     PlayerSave, BattleHero, RaidBoss, HeroSkill,
            │                     BattleStatusEffect, BattleLogEntry, BattleState,
            │                     BossSpecialEffectType, BossSpecialSkill
            ├── validators.ts     Save-data schema validation (called on load)
            ├── data/
            │   ├── heroes.ts     6 hero templates — stats, role, rarity, spriteFrame,
            │   │                 base skill, skillUnlocks[], ultimate
            │   ├── raidBosses.ts Boss rotation (getBossAppearance), BOSS_SPRITE_MAP,
            │   │                 RAID_BOSS_TEMPLATE, isEliteBoss(), getEliteSkill(),
            │   │                 elite skill pool (5 rotating debuff skills)
            │   └── equipment.ts  Loot drop pool
            └── logic/
                ├── combat.ts     Pure battle resolution:
                │                 createBattleState(), resolveHeroAction(),
                │                 createRaidBoss() (incl. elite scaling),
                │                 resolveEliteBossSkill() (debuff application),
                │                 resolveBossTurn() (normal + Thread Quake + elite),
                │                 getMissChance() (incl. confuse penalty),
                │                 resolveHeroStrike() (incl. berserk atkModifier),
                │                 Daze/Silence/Berserk debuff gating in resolveHeroAction()
                └── progression.ts Levelling, upgrade costs, daily rewards, loot rewards
```

---

## Hero Roster

Six heroes — each maps to a spritesheet frame and has a unique role skill:

| Hero           | Role    | Frame | Rarity    | Base Skill        | Skill unlocks at     |
| -------------- | ------- | ----- | --------- | ----------------- | -------------------- |
| Snoo Vanguard  | Tank    | 0     | Rare      | Shield Bash       | Lv 6, Lv 17          |
| Flair Archmage | Mage    | 1     | Epic      | Flame Thread      | Lv 5, Lv 16          |
| Karma Duelist  | Warrior | 2     | Epic      | Double Slash      | Lv 7, Lv 19          |
| Automod Oracle | Support | 3     | Legendary | Protect Protocol  | Lv 10, Lv 22         |
| Upvote Ranger  | Ranger  | 4     | Rare      | Focus Shot        | Lv 8, Lv 18          |
| Award Sage     | Healer  | 5     | Epic      | Golden Heal       | Lv 9, Lv 20          |

Stats scale per level: `base × (1 + (level − 1) × 0.085)`.
Upgrade cost: `75 + level × 45` gold.

### Damage effect → hero role mapping
| Role    | Effect frame | Visual       |
| ------- | ------------ | ------------ |
| Tank    | 14           | Starburst    |
| Warrior | 12           | Red slash arc |
| Mage    | 2            | Large flame  |
| Ranger  | 13           | Explosive arc |
| Healer  | 5            | Thunder spark |
| Support | 6            | Lightning bolt |

---

## Boss Rotation

Normal bosses cycle through 10 types. **Every 5th raid level** spawns an Elite (+30% HP/ATK/MAG, gold aura, special debuff skill).

| Raid Levels | Boss            | Sprite                          |
| ----------- | --------------- | ------------------------------- |
| 1–2         | Goo Spawner     | `World01_001_GreenGoo.png`      |
| 3–4         | Talon Hawk      | `World01_003_Bird.png`          |
| 5–7         | Flame Beast     | `World01_002_Salamander.png`    |
| 8–10        | Shell Knight    | `World01_005_Shello.png`        |
| 11–13       | Corsair Captain | `World01_007_Pirate.png`        |
| 14–16       | Dark Witch      | `World01_006_Witch.png`         |
| 17–20       | Wailing Prince  | `World01_004_WailingPrince.png` |
| 21–24       | Laser Drone     | `World04_001_ LaserDrone.png`   |
| 25–28       | Scout Machine   | `World04_002_ ScoutMachine.png` |
| 29+         | Shadow Outlaw   | `World04_003_ Outlaw.png`       |

Normal boss stat scaling: HP/ATK/MAG × `1 + (raidLevel − 1) × 0.10`. DEF/RES × `1 + (raidLevel − 1) × 0.06`.
Elite multiplier on top: HP/ATK/MAG × 1.30.

### Elite special skills (cycle every 5 levels)
| Lv 5   | Lv 10 | Lv 15 | Lv 20 | Lv 25 | repeats… |
| ------ | ----- | ----- | ----- | ----- | -------- |
| 👁️ Blinding Flash (party blind, 3t) | 🌀 Mind Warp (single confuse, 2t) | 🔴 Blood Rage (single berserk, 2t) | 🔇 Void Silence (party silence, 2t) | 💫 Concussion (single daze, 1t) | → |

---

## Battle System

### Actions
- **Attack** — basic damage, fills the gold LB (Limit Break) charge.
- **Skill** — level-aware role action; 3-turn cooldown after use (button shows `CD:N`).
- **Ult** — unlocks when LB charge hits 100%. High-damage or party-wide effect.

### Accuracy & crits
- Attacks can miss; miss chance scales with speed gap and active debuffs.
- Crit chance scales with `SPD`.
- Some skills add `accuracyBonus` or `critBonus`; some apply evasion/accuracy modifiers.

### Status effects (from elite bosses)
| Effect | Game behaviour |
|---|---|
| **Daze** | Hero loses their full turn; boss immediately gets a turn |
| **Silence** | Skill/Ult actions fall back to basic attack; logged in battle log |
| **Berserk** | +50% physical ATK multiplier; Skill/Ult blocked |
| **Confuse** | +32% miss penalty added to miss chance roll |
| **Blind** | −28% `accuracyModifier` on the hero's status effect stack |

### Boss turn
- **Countdown** ticks down by 1 each round.
- At countdown = 0: normal boss uses **Thread Quake** (party AoE spell); elite boss uses its **special debuff skill** instead.
- Countdown resets to 4 after the special.

### Battle log (bottom panel)
- Displays the last 7 events (newest first) with tone-coded colours.
- Green = hero action · Red = boss action · Gold = reward/level-up · Gray = system.
- Header shows the active hero name, heroes alive count, and current round.
- Level-up notifications (⭐ Hero leveled up!) appear when the battle ends.

### Visual effects
- Float numbers: red = damage taken, blue = heal, yellow ⚡ = ultimate.
- Damage effect sprite flashes over the boss when a hero acts (role-matched frame).
- Damage effect sprite flashes over the hero slot when the boss attacks or debuffs.
- Boss image shakes when it takes damage.

---

## Currency

| Currency | Earned from               | Used for                  |
| -------- | ------------------------- | ------------------------- |
| Gold     | Raid damage               | Hero upgrades             |
| Gems     | Daily rewards, milestones | —                         |
| Energy   | Daily rewards             | Starting raids (costs 10) |
| Tokens   | Raid victories            | —                         |

---

## Progression

- **Daily reward** — claimable once per UTC day; gives gold, gems, and energy.
- **Equipment** — drops on raid victory; up to 8 items shown in Loot view.
- **Hero EXP** — party members gain EXP proportional to raid damage dealt.
- **Skill upgrades** — each hero has 2 skill unlock levels; the Detail sheet shows the next unlock.

---

## Save Format

Saves stored in **Devvit Redis** under the player's username. `localStorage` used as fallback in dev mode. Schema validated on load in `validators.ts`.

| Field             | Type              | Notes                        |
| ----------------- | ----------------- | ---------------------------- |
| `version`         | `1`               | Schema version for migration |
| `raidLevel`       | `number`          | Current boss tier            |
| `energy`          | `number`          | Costs 10 per raid            |
| `heroes`          | `HeroProgress[]`  | Per-hero level + EXP         |
| `party`           | `string[]`        | Active hero IDs              |
| `inventory`       | `EquipmentItem[]` | Dropped gear                 |
| `bestRaidDamage`  | `number`          | Personal best                |
| `totalRaidDamage` | `number`          | Lifetime total               |
| `dailyClaimedAt`  | `string \| null`  | ISO timestamp of last claim  |

---

## Stack

| Layer       | Tech                                 |
| ----------- | ------------------------------------ |
| Platform    | Devvit 0.13                          |
| Game Engine | Phaser 3.90                          |
| Feed Card   | React 19 (splash only)               |
| Build       | Vite 8                               |
| Server      | Hono on Devvit web                   |
| Storage     | Devvit Redis + localStorage fallback |
| Language    | TypeScript 6                         |
