# Reddit Raid Keeper

A five-hero pixel-art RPG built for the **Reddit Developer Hackathon** using [Devvit](https://developers.reddit.com/docs) and [Phaser 3](https://phaser.io/).

Assemble a party, fight rotating raid bosses, collect loot, and upgrade your roster — all inside a Reddit post.

Hackathon thread: https://www.reddit.com/r/Devvit/comments/1u8f6r4/announcing_our_reddits_games_with_a_hook_virtual/

---

## Requirements

- **Node 22+** — verify with `node -v`
- **Devvit CLI** — installed via `npm install` inside `d9r-game/`
- A Reddit account with **moderator access** to a subreddit (required for playtesting)

---

## Quick Start

All commands run from inside `d9r-game/`.

```bash
cd d9r-game
npm install
```

### 1 — Log in

```bash
npm run login
```

Opens a browser OAuth flow. Your Devvit session is saved locally.

### 2 — Playtest on Reddit

```bash
npm run dev
```

Starts a live Devvit playtest. Follow the printed URL to open the app inside your subreddit. Saves on file change.

### 3 — Deploy

```bash
npm run deploy      # type-check + lint + upload
npm run launch      # deploy + devvit publish (makes it public)
```

---

## Other Commands

| Command | What it does |
|---|---|
| `npm run type-check` | TypeScript check only |
| `npm run lint` | ESLint only |
| `npm run build` | Vite production build (no upload) |
| `npm run prettier` | Auto-format all source files |

---

## Project Layout

```
d9r-game/
├── public/
│   └── assets/sprites/
│       ├── heroes.png              Spritesheet — 30 frames at 20×33 px (10 cols × 3 rows)
│       └── Bosses/                 10 individual boss PNGs (64–128 px each)
│
└── src/
    ├── client/
    │   ├── game.ts                 Phaser entry point (Scale.FIT 430×760)
    │   ├── game.html               Game iframe shell
    │   ├── splash.tsx              Reddit feed card — React only
    │   ├── keeper/api.ts           Save/load helpers (Redis + localStorage fallback)
    │   └── phaser/
    │       ├── constants.ts        Layout constants, colour palette, role/rarity colours
    │       └── scenes/
    │           ├── BootScene.ts    Asset preloader — spritesheet + 10 boss textures
    │           └── GameScene.ts    All game UI: raid, heroes, loot, settings panel
    │
    ├── server/
    │   ├── index.ts                Devvit app entry + Hono router
    │   └── routes/
    │       ├── api.ts              /api/keeper  — Redis save/load
    │       ├── menu.ts             Reddit moderator menu actions
    │       ├── forms.ts            Devvit form handlers
    │       └── triggers.ts         Devvit event triggers
    │
    └── shared/
        └── game/
            ├── types.ts            All TypeScript types (PlayerSave, BattleHero, RaidBoss…)
            ├── validators.ts       Save-data schema validation
            ├── data/
            │   ├── heroes.ts       6 hero templates with stats, skills, sprite frames
            │   ├── raidBosses.ts   10-boss rotation + BOSS_SPRITE_MAP
            │   └── equipment.ts    Loot drop pool
            └── logic/
                ├── combat.ts       Battle resolution, skill cooldown, boss creation
                └── progression.ts  Levelling, upgrades, daily rewards, loot rewards
```

---

## Game Systems

### Heroes

Six heroes, each with a unique pixel-art sprite frame from `heroes.png`:

| Hero | Role | Sprite Frame | Rarity |
|---|---|---|---|
| Snoo Vanguard | Tank | 0 | Rare |
| Karma Duelist | Warrior | 4 | Epic |
| Flair Archmage | Mage | 12 | Epic |
| Upvote Ranger | Ranger | 14 | Rare |
| Award Sage | Healer | 11 | Epic |
| Automod Oracle | Support | 17 | Legendary |

Stats scale per level: `base × (1 + (level - 1) × 0.085)`. Upgrade cost: `75 + level × 45` gold.

### Boss Rotation

Ten bosses unlock progressively as raid level increases:

| Raid Levels | Boss | Sprite File |
|---|---|---|
| 1–2 | Goo Spawner | `World01_001_GreenGoo.png` |
| 3–4 | Talon Hawk | `World01_003_Bird.png` |
| 5–7 | Flame Beast | `World01_002_Salamander.png` |
| 8–10 | Shell Knight | `World01_005_Shello.png` |
| 11–13 | Corsair Captain | `World01_007_Pirate.png` |
| 14–16 | Dark Witch | `World01_006_Witch.png` |
| 17–20 | Wailing Prince | `World01_004_WailingPrince.png` |
| 21–24 | Laser Drone | `World04_001_ LaserDrone.png` |
| 25–28 | Scout Machine | `World04_002_ ScoutMachine.png` |
| 29+ | Shadow Outlaw | `World04_003_ Outlaw.png` |

Boss HP and ATK scale by `1 + (raidLevel - 1) × 0.16` on top of the base template.

### Battle

- **Attack** — reliable damage, fills the yellow charge bar.
- **Skill** — role-specific action, goes on a **3-turn cooldown** after use (shown as `CD:N`).
- **Ult** — unlocks when charge bar is full (`charge ≥ 100`). High-damage or party-wide effect.
- **Boss countdown** — ticks down each round; hits the full party when it reaches zero.
- **Float numbers** — red = damage, blue = heal, yellow ⚡ = ultimate.
- Turn order is sorted by each hero's `spd` stat.

### Currency

| Currency | Earned from | Used for |
|---|---|---|
| Gold | Raid damage | Hero upgrades |
| Gems | Daily rewards, milestones | — |
| Energy | Daily rewards | Starting raids (costs 10) |
| Tokens | Raid victories | — |

### Progression

- **Daily reward** — claimable once per UTC day; gives gold, gems, and energy.
- **Equipment** — drops on raid victory; up to 8 items shown in Loot tab.
- **Hero EXP** — party members gain EXP proportional to raid damage.

---

## How to Play

1. Open the Reddit post and press **Play**.
2. Tap **⚙️** (top-left) to open the settings panel — switch views (Raid / Heroes / Loot) and check your currency.
3. In **Raid view**, choose an action each turn: Attack, Skill, or Ult.
4. Watch the boss HP bar and the active hero highlight (orange outline).
5. Defeat the boss to earn gold, EXP, and gear. The next boss tier unlocks every few levels.
6. In **Heroes view**, tap any hero card to see full stats, skill descriptions, and upgrade cost.
7. In **Loot view**, track your best damage and browse dropped equipment.

---

## Technical Notes

### Phaser Setup

- Canvas rendered at **430×760** logical pixels, scaled with `Phaser.Scale.FIT` to fill any viewport.
- `BootScene` handles all asset preloading (spritesheet + 10 boss textures) with a progress bar.
- `GameScene` builds all UI procedurally — no external assets beyond sprites.
- Hero slots use `Image` objects with `setFrame(spriteFrame)` for instant costume swap.
- Boss `Image` texture is swapped via `setTexture(boss.spriteKey)` on each new raid.
- Float numbers are spawned as `Text` objects and removed after a Phaser tween completes.

### Sprite Sheet

`heroes.png` is **200×132 px**:
- Rows 0–98 (99 px): 30 hero frames at **20×33 px** (10 columns × 3 rows).
- Rows 100–131: Public Domain badge — not used by the loader.
- Loaded with `this.load.spritesheet('heroes', …, { frameWidth: 20, frameHeight: 33 })`.

### Save Format

Saves are stored in **Devvit Redis** under the player's username. A `localStorage` copy is used as a fallback when Redis is unavailable (dev mode). The save schema is validated on load in `validators.ts` and migrated if stale.

Key fields in `PlayerSave`:

| Field | Type | Notes |
|---|---|---|
| `version` | `1` | Schema version for migration |
| `raidLevel` | `number` | Current boss tier |
| `energy` | `number` | Costs 10 per raid |
| `heroes` | `HeroProgress[]` | Per-hero level + EXP |
| `party` | `string[]` | Active hero IDs |
| `inventory` | `EquipmentItem[]` | Dropped gear |
| `bestRaidDamage` | `number` | Personal best |
| `totalRaidDamage` | `number` | Lifetime total |
| `dailyClaimedAt` | `string \| null` | ISO timestamp of last claim |

---

## Stack

| Layer | Tech |
|---|---|
| Platform | [Devvit](https://developers.reddit.com/docs) 0.13 |
| Game Engine | [Phaser 3.90](https://phaser.io/) |
| Feed Card | React 19 (splash entry only) |
| Build | Vite 8 |
| Server | Hono on Devvit web |
| Storage | Devvit Redis + localStorage fallback |
| Language | TypeScript 6 |
| Sprites | Public domain pixel art |
