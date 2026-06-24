# D9 Raid Keeper — App Documentation

Full technical reference for the `d9r-game` Devvit app.

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
    │   ├── game.tsx              React game UI (App component, view shell, handlers)
    │   ├── splash.tsx            Reddit feed card (React only, no Phaser)
    │   ├── components/
    │   │   ├── uiComponents.tsx  StatTile, CurrencyTile, shared helpers + FloatEvent type
    │   │   ├── battleComponents.tsx  HeroSprite, BossSprite, ActiveHeroStats
    │   │   ├── heroComponents.tsx    CompactHeroCard, HeroDetailSheet
    │   │   └── viewComponents.tsx    RaidView, HeroesView, LootView (full view JSX)
    │   ├── keeper/api.ts         Save/load helpers (Redis + localStorage fallback)
    │   └── phaser/
    │       ├── constants.ts      Layout constants (W, H, PAD), colour palette,
    │       │                     COLORS, FONT, ROLE_COLOR, RARITY_COLOR
    │       ├── heroSpriteGen.ts  Canvas-based hero pixel-art sprite generation
    │       ├── miniBossSpriteGen.ts  Canvas-based mini-boss sprite generation
    │       ├── scenes/
    │       │   ├── BootScene.ts       Asset preloader — Snoo sheets, boss sprites,
    │       │   │                      battle BG, HUD, damage effects spritesheet
    │       │   ├── PreloadScene.ts    Canvas sprite generation + scene handoff to Game
    │       │   ├── GameScene.ts       Core scene: create(), update(), setView(),
    │       │   │                      refreshAll(), showNotification(), thin method stubs
    │       │   └── GameSceneTypes.ts  All local types (View, HeroSlotRef, MapNodeRef…)
    │       │                          and layout constants (STAGE_W, BOSS_AREA_W…)
    │       ├── builders/              UI construction — called once in create()
    │       │   ├── mapView.ts         buildTitleView, buildMapView
    │       │   ├── partyHelpView.ts   buildPartyView, buildHelpView
    │       │   ├── headerSettings.ts  buildHeader, buildSettingsPanel,
    │       │   │                      toggleSettingsPanel, refreshDailyAction
    │       │   ├── raidBattle.ts      buildRaidView, buildBattleField, buildBossInfoBar,
    │       │   │                      buildBossSprite, buildHeroSlotsUI,
    │       │   │                      buildActionButtons, buildBattleLog
    │       │   ├── overlays.ts        buildResultOverlay, buildSkillChoiceOverlay,
    │       │   │                      buildNewGameConfirmOverlay
    │       │   └── heroesLoot.ts      buildHeroesView, buildHeroCard,
    │       │                          buildDetailSheet, buildLootView
    │       ├── refresh/               State-to-UI sync — called on data change
    │       │   ├── battle.ts          refreshBoss, refreshHeroSlots,
    │       │   │                      refreshButtons, refreshBattleLog
    │       │   └── views.ts           refreshHeader, refreshMap, refreshPartySelect,
    │       │                          refreshRaid, refreshRaidPanel, refreshResultOverlay,
    │       │                          refreshHeroes, refreshLoot
    │       └── handlers/              User action + scene-transition logic
    │           ├── actions.ts         handleAction, getNewBossAttackCues,
    │           │                      playBossAttackCues
    │           ├── animations.ts      showBossAttackBanner, showHeroSkillBanner,
    │           │                      animateBossDefeat, spawnEffectSprite,
    │           │                      spawnFloat, animateActiveHeroAction
    │           ├── navigation.ts      handleContinue, confirmNewGame, openPartySelect,
    │           │                      toggleSelectedPartyHero, showDetail, hideDetail,
    │           │                      openSkillChoice, chooseSkill, handleStartRaid
    │           └── transition.ts      showBattleTransition (loading overlay + tween chain)
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
                ├── combat.ts       Public API: resolveHeroAction(), getActiveHero(),
                │                   canUseSkill/Ultimate(), hero resolution helpers.
                │                   Re-exports MAX_LOGS + createBattleState.
                ├── combatCalcs.ts  Pure math: getDamage(), getMissChance(),
                │                   getCritChance(), createLogEntry(), addLog()
                ├── combatEffects.ts Status-effect logic: createStatusEffect(),
                │                   addStatusEffect(), tickBattleEffects(),
                │                   applySkillEffect()
                ├── combatBoss.ts   Boss turn: resolveSingleBossAttack(),
                │                   resolveEliteBossSkill(), resolveBossTurnPhase(),
                │                   advanceHeroAndMaybeBoss()
                ├── battleSetup.ts  State init: buildBattleHero(), createRaidBoss(),
                │                   createBattleState()
                └── progression.ts  Levelling, upgrade costs, daily rewards, loot rewards
```

---

## Hero Roster

Six developer heroes — each maps to a spritesheet frame and has a unique role skill:

| Hero                | Role     | Frame | Rarity    | Base Skill      | Skill unlocks at |
| ------------------- | -------- | ----- | --------- | --------------- | ---------------- |
| Frontend Developer  | Frontend | 0     | Rare      | CSS Cascade     | Lv 6, Lv 17     |
| Backend Developer   | Backend  | 1     | Rare      | Endpoint Strike | Lv 7, Lv 19     |
| DevOps Engineer     | DevOps   | 2     | Epic      | Pipeline Shield | Lv 8, Lv 20     |
| QA Tester           | QA       | 3     | Rare      | Regression Shot | Lv 8, Lv 18     |
| Security Engineer   | Security | 4     | Epic      | Firewall Bash   | Lv 9, Lv 21     |
| Data Engineer       | Data     | 5     | Legendary | ETL Mend        | Lv 10, Lv 22    |

Stats scale per level: `base × (1 + (level − 1) × 0.085)`.
Upgrade cost: `75 + level × 45` gold.

### Damage effect → hero role mapping
| Role     | Effect frame | Visual         |
| -------- | ------------ | -------------- |
| Frontend | 2            | Large flame    |
| Backend  | 12           | Red slash arc  |
| DevOps   | 6            | Lightning bolt |
| QA       | 13           | Explosive arc  |
| Security | 14           | Starburst      |
| Data     | 5            | Thunder spark  |

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
| Effect | Target | Game behaviour |
|---|---|---|
| **Daze** | Hero | Hero loses their full turn; boss immediately gets a turn |
| **Silence** | Hero | Skill/Ult actions fall back to basic attack; logged in battle log |
| **Berserk** | Hero | +50% physical ATK multiplier; Skill/Ult blocked |
| **Confuse** | Hero | +32% miss penalty added to miss chance roll |
| **Blind** | Hero | −28% `accuracyModifier` on the hero's status effect stack |
| **Rage** | Boss | Boss ATK × 1.4 for normal attacks while active |
| **Fortify** | Boss | Boss DEF and RES × 1.35; heroes deal less damage |
| **Precision** | Boss | +35% boss accuracy; boss attacks miss far less often |
| **Evade** | Boss | +30% boss evasion; hero attacks miss more often |

### Boss turn
- **Countdown** ticks down by 1 each round.
- At countdown = 0: normal boss uses **Thread Quake** (party AoE spell); elite boss uses its **special debuff skill** instead.
- Countdown resets to 4 after the special.

### Battle log (bottom panel)
- Displays the last 5 events (newest first) with tone-coded colours.
- Green = hero action · Red = boss action · Gold = reward/level-up · Gray = system.
- Header shows the active hero name, heroes alive count, and current round.
- Level-up notifications (⭐ Hero leveled up!) appear when the battle ends.

### Visual effects
- Float numbers: red = damage taken, blue = heal, yellow ⚡ = ultimate.
- Damage effect sprite flashes over the boss when a hero acts (role-matched frame).
- Damage effect sprite flashes over the hero slot when the boss attacks or debuffs.
- Boss image shakes when it takes damage.
- **Boss skill banner** — red banner with the boss's skill name appears before each boss attack.
- **Hero skill banner** — blue banner with the hero's skill/ultimate name appears before the hero acts; the attack resolves after the banner fades (~400 ms delay).

---

## Community Comments

Commenting on the game's Reddit post is a passive way to contribute to your run:

- Any comment on the post awards the commenter **+300 gold** automatically.
- The trigger fires server-side via Devvit's `on-comment-submit` event — no in-game action needed.
- Gold is credited to the commenter's save in Redis immediately.
- Use it to farm upgrade currency between energy regeneration.

Server implementation: `src/server/routes/triggers.ts` → `on-comment-submit` handler.

---

## Community Raid

Every run contributes damage to a **shared weekly boss** visible on the Corporate Tower map.

### How it works
- After a solo raid ends (win or loss), the total run damage is submitted to the community pool via `POST /api/raid/damage`.
- The community boss has a large HP pool (50 K – 1.5 M depending on the week) shared by all players.
- When the community boss reaches 0 HP, all players receive a victory notification and the boss resets to the next boss in the cycle.
- A per-run damage cap (100 K) prevents single runs from dominating.

### Weekly cycle (6 bosses)
| Week | Boss                   | HP Pool   |
| ---- | ---------------------- | --------- |
| 1    | Product Owner          | 50,000    |
| 2    | Project Manager        | 150,000   |
| 3    | Tech Lead              | 300,000   |
| 4    | Engineering Manager    | 600,000   |
| 5    | Director of Engineering| 1,000,000 |
| 6    | CCO                    | 1,500,000 |

Week = ISO week number of the year mod 6 (cycles continuously).

### Map panel
The Corporate Tower map shows a live community panel at the top:
- Current boss name + ISO week
- HP bar (red, percentage remaining)
- Your personal damage this week
- Top contributor name + damage (🏆)

### Server endpoints
| Method | Path                | Description                                  |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/api/raid`         | Returns current boss HP, week, top-10 list  |
| POST   | `/api/raid/damage`  | Body: `{ damage: number }` — adds to pool, returns updated status + `bossKilled` flag |

### Redis keys
| Key                       | Type        | Contents                                  |
| ------------------------- | ----------- | ----------------------------------------- |
| `raid:week`               | string      | Current ISO week key (e.g. `2025-22`)    |
| `raid:boss`               | hash        | `{ bossIndex, hp, hpMax }`               |
| `raid:leaderboard:<week>` | sorted set  | username → cumulative damage this week   |
| `raid:user:<week>:<user>` | string      | Individual user damage for the week      |

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
