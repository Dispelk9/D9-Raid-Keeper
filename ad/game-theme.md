# Reddit Raid Keeper

## Overview

Reddit Raid Keeper is a browser-based RPG inspired by Final Fantasy Record Keeper (FFRK).

Players collect heroes, form parties, clear stages, defeat raid bosses, earn equipment, and compete on subreddit leaderboards.

The game is designed to run entirely on:

* React
* Devvit
* Reddit User Identity
* Devvit Storage

No dedicated backend server is required.

---

# Core Loop

1. Login via Reddit
2. Claim daily rewards
3. Upgrade heroes
4. Build party
5. Enter dungeon
6. Defeat enemies
7. Earn loot
8. Improve team
9. Challenge raid boss
10. Climb leaderboard

---

# Core Systems

## Heroes

Each player owns multiple heroes.

### Hero Attributes

* HP
* ATK
* DEF
* MAG
* RES
* SPD

### Hero Roles

* Tank
* Warrior
* Mage
* Ranger
* Support
* Healer

### Rarity

* Common
* Rare
* Epic
* Legendary
* Mythic

---

# Party System

Players create parties consisting of:

* 1 Front Tank
* 2 Damage Dealers
* 1 Support
* 1 Healer

Maximum Party Size:

5 Heroes

---

# Equipment System

## Weapon

Examples:

* Iron Sword
* Mythril Blade
* Dragon Spear

## Armor

Examples:

* Leather Armor
* Knight Plate
* Ancient Robe

## Accessory

Examples:

* Ring
* Talisman
* Charm

Equipment provides stat bonuses.

---

# Leveling

Heroes gain EXP from battles.

### Level Cap

Initial Cap:

50

Future Expansions:

* 75
* 99
* 120

---

# Skill System

Each hero possesses:

### Basic Attack

Unlimited usage.

### Active Skills

Examples:

* Fire
* Blizzard
* Heal
* Protect
* Double Slash

### Ultimate

Powerful skill requiring charge.

Examples:

* Meteor
* Holy
* Omnislash
* Bahamut Summon

---

# Combat System

## Style

Turn-Based

Inspired by:

* FFRK
* FFBE
* Classic JRPGs

## Turn Order

Based on SPD stat.

## Battle Flow

Hero Turn
→ Choose Skill
→ Execute Action
→ Enemy Turn

Victory:
All enemies defeated.

Defeat:
Entire party defeated.

---

# Dungeons

## Story Dungeons

Progressive chapters.

Examples:

* Forest Ruins
* Crystal Caverns
* Ancient Kingdom
* Void Fortress

### Rewards

* EXP
* Gold
* Equipment
* Summon Currency

---

# Raid Bosses

Community-focused content.

Examples:

* Titan
* Bahamut
* Omega
* Reddit Snoo Prime

### Mechanics

Boss HP is shared.

Players contribute damage.

Leaderboard ranks total damage.

Rewards distributed weekly.

---

# Gacha System

Summoning uses Gems.

## Rates

Common: 70%

Rare: 20%

Epic: 8%

Legendary: 1.8%

Mythic: 0.2%

### Pity

Guaranteed Epic or higher every 20 pulls.

Guaranteed Legendary every 100 pulls.

---

# Daily Systems

## Daily Login

Rewards:

* Gems
* Gold
* Energy

## Daily Quests

Examples:

* Win 3 Battles
* Upgrade 1 Hero
* Defeat 10 Enemies

---

# Energy System

Maximum Energy:

100

Regeneration:

1 Energy every 5 minutes.

Dungeon runs consume Energy.

---

# Currency

## Gold

Used for upgrades.

## Gems

Premium summon currency.

## Raid Tokens

Earned from boss events.

---

# Leaderboards

## Global

Ranks all players.

## Subreddit

Ranks players within a subreddit.

Metrics:

* Total Power
* Raid Damage
* Dungeon Progress

---

# Storage Model

## User Data

Stored using Devvit Storage.

Player Record:

* Hero Collection
* Inventory
* Gold
* Gems
* Progress
* Achievements

## Raid Data

Shared storage.

Tracks:

* Boss HP
* Damage Contributions
* Rankings

---

# Monetization

Hackathon Version:

No monetization.

Future Possibilities:

* Cosmetic Skins
* Alternate Hero Art
* Battle Themes

No pay-to-win mechanics.

---

# MVP Scope

## Week 1

* Hero Collection
* Party Screen
* Basic Battle System
* Rewards

## Week 2

* Equipment
* Hero Progression
* Dungeons

## Week 3

* Raid Boss
* Leaderboards
* Polish

---

# Technical Stack

Frontend:

* React
* TypeScript
* Devvit Web View

Storage:

* Devvit Redis / KV Storage

Assets:

* PNG Sprites
* CSS Animations
* Framer Motion

No external backend required.
