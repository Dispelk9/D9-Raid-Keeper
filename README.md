# D9 Raid Keeper

A five-hero raid RPG built as a Reddit iframe app for the [Reddit Developer Hackathon](https://developers.reddit.com/). Powered by [Devvit](https://developers.reddit.com/docs) and [Phaser 3](https://phaser.io/).

---
## Where to play
prod:
https://www.reddit.com/r/d9rk/
dev:
https://www.reddit.com/r/d9r_game_dev/
## Quick Start

```bash
cd d9r-game
npm install

npm run login     # Devvit OAuth — opens a browser window
npm run dev       # live playtest with hot-reload on Reddit
npm run deploy    # type-check + upload to Reddit
```

> **Requires Node 22+** and a Reddit account with moderator access to a subreddit for playtesting.

---

## Repo Layout

```
D9-Reddit-Game/
├── d9r-game/     Devvit app — Phaser game, server, shared game logic
└── README.md     This file
```

See [d9r-game/README.md](d9r-game/README.md) for the full developer reference: commands, project structure, hero roster, boss rotation, battle system, save format, and stack.

---

## Changelog

### 2026-06-20 — Battle log, elite bosses, status effects, damage sprites

- Replaced hero-stats bar with a live **battle log panel** (7 events, color-coded by type: green/red/gold/gray); header shows active hero and alive count
- Level-up messages injected into battle log at battle end (`⭐ Hero leveled up!`)
- **Elite bosses** every 5 raid levels: +30% HP/ATK/MAG, gold aura, `⚡ ELITE` badge
- 5 rotating elite special debuff skills: Blinding Flash (blind), Mind Warp (confuse), Blood Rage (berserk), Void Silence (silence), Concussion (daze)
- **Status effect handling** in combat: daze skips turn; silence/berserk block skill/ult; berserk adds +50% ATK; confuse +32% miss chance; blind −28% accuracy
- Preloaded `Damage_effect.png` as 4×4 spritesheet (Fire / Thunder / Blizzard / Slash rows); role-matched frames play on hero actions and boss attacks
- Boss image shakes on damage; boss name displays elite skill icon
- Extended types: `BossSpecialEffectType`, `BossSpecialSkill`, `effectType`/`atkModifier` on `BattleStatusEffect`, `isElite`/`specialSkill` on `RaidBoss`

### 2026-06-19 — Phaser 3 rewrite + pixel art sprites

- Full client rewrite using **Phaser 3** replacing the previous HTML/CSS renderer
- Pixel art sprite sheets for heroes and bosses
- Devvit iframe integration cleaned up for the new Phaser scene graph

### 2026-06-18 — First MVP

- Core raid loop: 5-hero party vs. rotating boss roster
- Reddit Devvit iframe scaffold, shared game logic, server-side state via Redis
- Hero progression (EXP/level), skill unlocks, basic combat
