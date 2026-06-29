import type { PlayerSave } from './game/types';

export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type KeeperLoadResponse = {
  status: 'ok';
  save: PlayerSave;
  communityBoost?: boolean;
  shipItBoost?: boolean;
};

export type KeeperSaveRequest = {
  save: PlayerSave;
};

export type KeeperSaveResponse = {
  status: 'ok';
  save: PlayerSave;
};

// ── Community Raid ─────────────────────────────────────────────────────────────

export type RaidContributor = {
  username: string;
  damage: number;
};

export type RaidStatus = {
  week: string;
  bossIndex: number;    // 0-5 cycles through the 6 bosses
  bossName: string;
  hpMax: number;
  hpRemaining: number;
  userDamage: number;   // this session's user contribution this week
  top10: RaidContributor[];
};

export type RaidStatusResponse = {
  status: 'ok';
  raid: RaidStatus;
};

export type RaidDamageRequest = {
  damage: number;       // raw damage dealt in the run
};

export type RaidDamageResponse = {
  status: 'ok';
  raid: RaidStatus;
  bossKilled: boolean;  // true if this submission finished off the boss
};
