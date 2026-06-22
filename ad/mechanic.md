A subreddit raid RPG where the whole community fights management/tech bosses together.

Core idea:

D9 Raid Keeper
Players collect Dev Team heroes.
Heroes fight IT/management bosses.
Every battle contributes damage to a shared subreddit raid.
Comments/upvotes/community actions affect buffs and rewards.

Best community mechanics:

1. Subreddit Raid Boss

Each subreddit has a weekly boss:

Product Owner → Project Manager → Tech Lead → Engineering Manager → Director → CEO

Every player does solo turn-based battles, but damage goes into a shared boss HP pool.

r/d9rk dealt 1,245,000 damage this week
Boss HP remaining: 34%

This is the most important mechanic.

2. Comment Buffs

After a player posts a raid result, comments can trigger small buffs:

Comment "ship it" → +5% party ATK
Comment "LGTM" → +5% skill damage
Comment "rollback" → defensive buff
Comment "hotfix" → revive chance

This makes Reddit interaction part of the game.

3. Upvote Power

Upvotes on raid posts become “Morale.”

10 upvotes = +1% community morale
Morale increases everyone’s damage slightly

Careful: keep it capped so it is not abusable.

4. Class Synergy

Your dev team classes can map cleanly:

Frontend Developer → UI burst damage
Backend Developer → API magic damage
DevOps Engineer → shields / deployment buffs
QA Tester → debuffs / expose bugs
Security Engineer → defense / cleanse
Data Engineer → scaling damage / analytics buffs
5. Weekly Leaderboards

Track:

Top Damage
Most Boss Kills
Best Support
Most Bugs Found
Fastest Clear
Subreddit Contribution

This is perfect for Reddit because people like ranking, sharing, and comparing.

6. “Bug Reports” as Enemies

Normal battles can be against:

Null Pointer
Merge Conflict
Broken Build
Memory Leak
Critical Bug
Legacy System
Production Incident

Bosses are management/organization enemies:

Scope Creep PM
Priority Shift PO
Code Review Tech Lead
Budget Cut Director
Final Boss CEO
7. Daily Standup

Daily login becomes:

Daily Standup
- Fix 3 bugs
- Deploy once
- Help another player
- Join raid

Much more thematic than generic daily quests.

Technical architecture:

Phaser
- Battle scene
- Sprites
- Effects
- Animations
- Sound

React
- Menus
- Party screen
- Hero list
- Inventory
- Raid dashboard

Devvit
- Reddit identity
- WebView hosting
- Posts/comments
- Subreddit install

Devvit Redis/Storage
- Player save
- Hero collection
- Raid HP
- Leaderboards
- Daily rewards

MVP scope I would build first:

1 title screen
6 heroes
3 bosses
turn-based battle
1 shared subreddit raid
damage leaderboard
daily reward
post battle result to Reddit

That is enough to feel like a real Reddit-native JRPG.

The hook should be:

“Every Redditor fights solo, but the subreddit wins together.”