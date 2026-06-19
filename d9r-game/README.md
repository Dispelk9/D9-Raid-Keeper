# Reddit Raid Keeper

Reddit Raid Keeper is a Devvit web RPG for the Reddit hackathon. Build a five-hero party, fight the community raid boss **Reddit Snoo Prime**, collect loot, and upgrade your roster between runs.

The game runs inside Reddit using React, Vite, Tailwind CSS, Hono, Devvit Redis, and Reddit user identity.

## How To Play

1. Open the app post and press **Play** from the feed card.
2. Start on the **Raid** tab.
3. Use **Attack** for steady damage and ultimate charge.
4. Use each hero's **Skill** for stronger role-specific actions.
5. Use **Ultimate** when the blue charge bar reaches 100.
6. Watch the boss countdown. When it reaches zero, Snoo Prime uses a party-wide attack.
7. Win or lose, your raid damage earns rewards.
8. Go to **Heroes** to spend gold on upgrades.
9. Go to **Loot** to review best damage, total raid damage, and equipment drops.
10. Claim the **Daily** reward for extra gold, gems, and energy.

## Game Systems

- **Heroes**: Tank, Warrior, Mage, Ranger, Support, and Healer roles.
- **Stats**: HP, ATK, DEF, MAG, RES, and SPD.
- **Turn Order**: Higher SPD heroes act earlier.
- **Skills**: Each hero has a normal skill and a charged ultimate.
- **Boss**: Reddit Snoo Prime has HP, defenses, regular attacks, and a countdown special.
- **Progression**: Earn gold, gems, energy, raid tokens, EXP, and equipment.
- **Persistence**: Progress saves through `/api/keeper` with Devvit Redis and local fallback.

## Current MVP

- Feed splash entrypoint for Reddit inline view
- Expanded game entrypoint with raid combat
- Playable five-hero party
- Battle log, victory state, defeat state, and reward summary
- Hero upgrades and EXP leveling
- Daily reward claim
- Loot/inventory screen

## Development

Use Node 22 or newer.

```bash
npm install
npm run type-check
npm run lint
npm run build
```

Run a Reddit playtest:

```bash
npm run login
npm run dev
```

Upload from a logged-in Devvit CLI session:

```bash
npx devvit upload
```

## Project Structure

- `src/client/game.tsx`: Expanded game UI
- `src/client/splash.tsx`: Feed card UI
- `src/client/keeper/api.ts`: Client save/load helpers
- `src/server/routes/api.ts`: Devvit Redis save/load API
- `src/shared/game/types.ts`: Shared game types
- `src/shared/game/data/`: Hero, equipment, and boss templates
- `src/shared/game/logic/`: Combat and progression rules
- `src/shared/game/validators.ts`: Save-data validation

