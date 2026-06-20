# D9 Raid Keeper

A five-hero raid RPG built as a Reddit iframe app for the [Reddit Developer Hackathon](https://developers.reddit.com/). Powered by [Devvit](https://developers.reddit.com/docs) and [Phaser 3](https://phaser.io/).

---
## Where to play
https://www.reddit.com/r/d9rk/

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
