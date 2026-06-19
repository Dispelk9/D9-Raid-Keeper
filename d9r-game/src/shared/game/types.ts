export type HeroRole =
  | 'Tank'
  | 'Warrior'
  | 'Mage'
  | 'Ranger'
  | 'Support'
  | 'Healer';

export type HeroRarity =
  | 'Common'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Mythic';

export type EquipmentSlot = 'Weapon' | 'Armor' | 'Accessory';

export type StatBlock = {
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
};

export type HeroSkill = {
  id: string;
  name: string;
  summary: string;
  power: number;
  kind: 'strike' | 'spell' | 'heal' | 'rally';
};

export type HeroTemplate = {
  id: string;
  name: string;
  title: string;
  role: HeroRole;
  rarity: HeroRarity;
  stats: StatBlock;
  skill: HeroSkill;
  ultimate: HeroSkill;
};

export type HeroProgress = {
  heroId: string;
  level: number;
  exp: number;
};

export type EquipmentItem = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: HeroRarity;
  stat: keyof StatBlock;
  bonus: number;
};

export type PlayerSave = {
  version: 1;
  username: string;
  gold: number;
  gems: number;
  energy: number;
  raidTokens: number;
  heroes: HeroProgress[];
  party: string[];
  inventory: EquipmentItem[];
  totalRaidDamage: number;
  bestRaidDamage: number;
  dailyClaimedAt: string | null;
  updatedAt: string;
};

export type RewardBundle = {
  gold: number;
  gems: number;
  energy: number;
  raidTokens: number;
  exp: number;
  equipment: EquipmentItem[];
};

export type BattleHero = {
  id: string;
  name: string;
  title: string;
  role: HeroRole;
  rarity: HeroRarity;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  charge: number;
  skill: HeroSkill;
  ultimate: HeroSkill;
};

export type RaidBoss = {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  countdown: number;
};

export type BattleLogEntry = {
  id: string;
  tone: 'hero' | 'boss' | 'reward' | 'system';
  message: string;
};

export type BattleStatus = 'active' | 'won' | 'lost';

export type BattleState = {
  status: BattleStatus;
  heroes: BattleHero[];
  boss: RaidBoss;
  activeHeroIndex: number;
  round: number;
  totalDamage: number;
  logs: BattleLogEntry[];
};

export type BattleAction = 'attack' | 'skill' | 'ultimate';
