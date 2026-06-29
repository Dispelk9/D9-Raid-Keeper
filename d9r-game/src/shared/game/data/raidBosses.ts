import type { RaidBossTemplate, RaidNode } from '../types';
import { cco } from './bosses/cco';
import { directorOfEngineering } from './bosses/directorOfEngineering';
import { engineeringManager } from './bosses/engineeringManager';
import { productOwner } from './bosses/productOwner';
import { projectManager } from './bosses/projectManager';
import { techLead } from './bosses/techLead';

export const MINI_BOSS_SECRETARY_KEY = 'mini-boss-secretary';
export const MINI_BOSS_SECURITY_KEY = 'mini-boss-security';

export const RAID_BOSSES: RaidBossTemplate[] = [
  productOwner,
  projectManager,
  techLead,
  engineeringManager,
  directorOfEngineering,
  cco,
];

export const RAID_NODES: RaidNode[] = [
  {
    id: 'node-product-owner',
    level: 1,
    bossId: productOwner.id,
    name: productOwner.name,
    title: 'Backlog Gate',
    summary:
      'Defend the team from scope creep and impossible acceptance criteria.',
    minBattles: 1,
    maxBattles: 2,
  },
  {
    id: 'node-project-manager',
    level: 2,
    bossId: projectManager.id,
    name: projectManager.name,
    title: 'Deadline Stairwell',
    summary: 'Break through status meetings before the sprint collapses.',
    minBattles: 2,
    maxBattles: 3,
  },
  {
    id: 'node-tech-lead',
    level: 3,
    bossId: techLead.id,
    name: techLead.name,
    title: 'Architecture Review',
    summary: 'Win the design debate and keep the release alive.',
    minBattles: 2,
    maxBattles: 3,
  },
  {
    id: 'node-engineering-manager',
    level: 4,
    bossId: engineeringManager.id,
    name: engineeringManager.name,
    title: 'Performance Calibration',
    summary: 'Shield the team from stack ranking and surprise action plans.',
    minBattles: 3,
    maxBattles: 4,
  },
  {
    id: 'node-director',
    level: 5,
    bossId: directorOfEngineering.id,
    name: directorOfEngineering.name,
    title: 'Reorg War Room',
    summary:
      'Undo the reorg maze and rescue future teams from the layoff queue.',
    minBattles: 3,
    maxBattles: 4,
  },
  {
    id: 'node-cco',
    level: 6,
    bossId: cco.id,
    name: cco.name,
    title: 'Executive Cost Summit',
    summary:
      'Face the layoff algorithm and free thousands of future employees.',
    minBattles: 4,
    maxBattles: 5,
  },
  {
    id: 'node-hidden-floor',
    level: 7,
    bossId: cco.id,
    name: 'Executive Suite',
    title: 'Final Stand',
    summary:
      'The entire board has assembled. Face them all at once to end this.',
    minBattles: 2,
    maxBattles: 2,
    isHiddenFloor: true,
  },
];

type BossAppearance = {
  id: string;
  name: string;
  title: string;
  icon: string;
  spriteKey: string;
};

export const BOSS_SPRITE_MAP: Record<string, string> = {
  'boss-product-owner': 'assets/sprites/bosses/man_project_owner.png',
  'boss-project-manager': 'assets/sprites/bosses/woman_project_manager.png',
  'boss-tech-lead': 'assets/sprites/bosses/man_tech_lead.png',
  'boss-engineering-manager':
    'assets/sprites/bosses/man_engineering_manager.png',
  'boss-director-of-engineering':
    'assets/sprites/bosses/woman_director_of_engineering.png',
  'boss-cco': 'assets/sprites/bosses/man_CEO.png',
  [MINI_BOSS_SECRETARY_KEY]:
    'assets/sprites/bosses/mini-bosses/woman_secretary.png',
  [MINI_BOSS_SECURITY_KEY]:
    'assets/sprites/bosses/mini-bosses/man_security.png',
};

export const getBossTemplate = (bossId: string) =>
  RAID_BOSSES.find((boss) => boss.id === bossId) ?? RAID_BOSSES[0]!;

export const getRaidNode = (raidLevel: number) =>
  RAID_NODES.find((node) => node.level === raidLevel) ??
  RAID_NODES[RAID_NODES.length - 1]!;

export const getRaidNodeByBossId = (bossId: string) =>
  RAID_NODES.find((node) => node.bossId === bossId) ?? RAID_NODES[0]!;

export const getBossAppearance = (
  raidLevel: number,
  bossId = getRaidNode(raidLevel).bossId
): BossAppearance => {
  const boss = getBossTemplate(bossId);

  return {
    id: boss.id,
    name: boss.name,
    title: boss.title,
    icon: boss.icon,
    spriteKey: boss.spriteKey,
  };
};

export const isEliteBoss = (raidLevel: number): boolean => raidLevel >= 4;

export const getEliteSkill = (raidLevel: number) =>
  getBossTemplate(getRaidNode(raidLevel).bossId).specialSkills?.[0] ??
  getBossTemplate(getRaidNode(raidLevel).bossId).specialSkill;

export const RAID_BOSS_TEMPLATE = {
  id: 'raid-boss',
  hp: 520,
  atk: 26,
  def: 14,
  mag: 22,
  res: 14,
  spd: 18,
  countdown: 4,
};
