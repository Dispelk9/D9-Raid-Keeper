import type {
  ApiErrorResponse,
  KeeperLoadResponse,
  KeeperSaveResponse,
} from '../../shared/api';
import { createInitialPlayerSave } from '../../shared/game/logic/progression';
import { isPlayerSave } from '../../shared/game/validators';
import type { PlayerSave } from '../../shared/game/types';

const getLocalSaveKey = (username: string) => `reddit-raid-keeper:${username}`;

const loadLocalSave = (username: string) => {
  const rawSave = window.localStorage.getItem(getLocalSaveKey(username));

  if (!rawSave) return null;

  try {
    const parsedSave: unknown = JSON.parse(rawSave);

    return isPlayerSave(parsedSave) ? parsedSave : null;
  } catch {
    return null;
  }
};

const storeLocalSave = (save: PlayerSave) => {
  window.localStorage.setItem(getLocalSaveKey(save.username), JSON.stringify(save));
};

export const loadKeeperSave = async (fallbackUsername: string) => {
  try {
    const response = await fetch('/api/keeper');

    if (response.ok) {
      const data: KeeperLoadResponse | ApiErrorResponse = await response.json();

      if (data.status === 'ok') {
        storeLocalSave(data.save);
        return data.save;
      }
    }
  } catch {
    const localSave = loadLocalSave(fallbackUsername);

    if (localSave) return localSave;
  }

  return loadLocalSave(fallbackUsername) ?? createInitialPlayerSave(fallbackUsername);
};

export const persistKeeperSave = async (save: PlayerSave) => {
  storeLocalSave(save);

  try {
    const response = await fetch('/api/keeper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ save }),
    });

    if (!response.ok) return save;

    const data: KeeperSaveResponse | ApiErrorResponse = await response.json();

    if (data.status === 'ok') {
      storeLocalSave(data.save);
      return data.save;
    }
  } catch {
    return save;
  }

  return save;
};
