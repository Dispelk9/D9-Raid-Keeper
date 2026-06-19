import type { PlayerSave } from './game/types';

export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type KeeperLoadResponse = {
  status: 'ok';
  save: PlayerSave;
};

export type KeeperSaveRequest = {
  save: PlayerSave;
};

export type KeeperSaveResponse = {
  status: 'ok';
  save: PlayerSave;
};
