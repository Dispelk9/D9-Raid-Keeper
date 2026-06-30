# Project Instructions

## Commands

```bash
# Type check (zero errors required before commit)
cd d9r-game && npm run type-check

# Lint
cd d9r-game && npm run lint

# Format
cd d9r-game && npm run prettier

# Build
cd d9r-game && npm run build

# Dev (requires devvit auth)
cd d9r-game && npm run dev

# Deploy to Reddit
cd d9r-game && npm run deploy
```

## Workflow

- Run `type-check` after any series of changes; zero errors required before commit
- After every `git push`: run `npx devvit upload` in `d9r-game/` to deploy
- If devvit auth needed: `! npm run login` in the prompt

## Don'ts

- Don't modify files in `d9r-game/dist/` (build output)
- Don't revert the map to carousel or building-facade design (both were rejected)
