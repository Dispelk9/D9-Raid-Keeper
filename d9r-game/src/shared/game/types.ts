export type HeroRole =
  | 'Tank'
  | 'Warrior'
  | 'Mage'
  | 'Ranger'
  | 'Support'
  | 'Healer';

export type HeroRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

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
  accuracyBonus?: number;
  critBonus?: number;
  effect?: {
    target: 'boss' | 'party' | 'self';
    accuracyModifier?: number;
    evasionModifier?: number;
    duration: number;
  };
};

export type HeroSkillUnlock = {
  level: number;
  skill: HeroSkill;
};

export type HeroPose =
  | 'idle'
  | 'walk1'
  | 'walk2'
  | 'attack'
  | 'cast'
  | 'hit'
  | 'ko'
  | 'victory';

export type BossSpecialEffectType =
  | 'confuse'
  | 'blind'
  | 'berserk'
  | 'silence'
  | 'daze';

export type BossSpecialSkill = {
  name: string;
  icon: string;
  effectType: BossSpecialEffectType;
  target: 'single' | 'party';
  duration: number;
};

export type BattleStatusEffect = {
  id: string;
  name: string;
  effectType?: BossSpecialEffectType;
  accuracyModifier?: number;
  evasionModifier?: number;
  atkModifier?: number;
  duration: number;
};

export type HeroTemplate = {
  id: string;
  name: string;
  title: string;
  role: HeroRole;
  rarity: HeroRarity;
  icon: string;
  spriteFrame: number;
  stats: StatBlock;
  skill: HeroSkill;
  secondarySkill: HeroSkill;
  skillUnlocks?: HeroSkillUnlock[];
  ultimate: HeroSkill;
};

export type HeroProgress = {
  heroId: string;
  level: number;
  exp: number;
  rarity?: HeroRarity;
  starLevel?: number; // 0–10, unlocked after max rarity via gem upgrades
};

export type EquipmentItem = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: HeroRarity;
  stat: keyof StatBlock;
  bonus: number;
  bonusLevel?: number; // 0–10 token upgrades applied
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
  raidLevel: number;
  totalRaidDamage: number;
  bestRaidDamage: number;
  dailyClaimedAt: string | null;
  updatedAt: string;
};

export type RaidNode = {
  id: string;
  level: number;
  bossId: string;
  name: string;
  title: string;
  summary: string;
  minBattles: number;
  maxBattles: number;
};

export type RaidBossTemplate = {
  id: string;
  name: string;
  title: string;
  icon: string;
  spriteKey: string;
  spriteFrame?: number;
  stats: StatBlock & {
    countdown: number;
  };
  specialSkill?: BossSpecialSkill;
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
  icon: string;
  spriteFrame: number;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  charge: number;
  skillCooldown: number;
  skill: HeroSkill;
  skillOptions: HeroSkill[];
  ultimate: HeroSkill;
  statusEffects: BattleStatusEffect[];
};

export type RaidBoss = {
  id: string;
  name: string;
  title: string;
  icon: string;
  spriteKey: string;
  spriteFrame?: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  countdown: number;
  statusEffects: BattleStatusEffect[];
  isElite?: boolean;
  specialSkill?: BossSpecialSkill;
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
  raidLevel: number;
  encounterIndex: number;
  encounterCount: number;
};

export type BattleAction = 'attack' | 'skill' | 'ultimate';
