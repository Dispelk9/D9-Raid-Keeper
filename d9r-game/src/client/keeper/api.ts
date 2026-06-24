import type {
  ApiErrorResponse,
  KeeperLoadResponse,
  KeeperSaveResponse,
  RaidDamageResponse,
  RaidStatus,
  RaidStatusResponse,
} from '../../shared/api';
import {
  createInitialPlayerSave,
  normalizePlayerSave,
} from '../../shared/game/logic/progression';
import { isPlayerSave } from '../../shared/game/validators';
import type { PlayerSave } from '../../shared/game/types';

const getLocalSaveKey = (username: string) => `reddit-raid-keeper:${username}`;

const loadLocalSave = (username: string) => {
  const rawSave = window.localStorage.getItem(getLocalSaveKey(username));

  if (!rawSave) return null;

  try {
    const parsedSave: unknown = JSON.parse(rawSave);

    return isPlayerSave(parsedSave) ? normalizePlayerSave(parsedSave) : null;
  } catch {
    return null;
  }
};

const storeLocalSave = (save: PlayerSave) => {
  window.localStorage.setItem(getLocalSaveKey(save.username), JSON.stringify(save));
};

export const loadKeeperSave = async (fallbackUsername: string): Promise<{ save: PlayerSave; communityBoost: boolean }> => {
  try {
    const response = await fetch('/api/keeper');

    if (response.ok) {
      const data: KeeperLoadResponse | ApiErrorResponse = await response.json();

      if (data.status === 'ok') {
        const save = normalizePlayerSave(data.save);
        storeLocalSave(save);
        return { save, communityBoost: data.communityBoost ?? false };
      }
    }
  } catch {
    const localSave = loadLocalSave(fallbackUsername);
    if (localSave) return { save: localSave, communityBoost: false };
  }

  return {
    save: loadLocalSave(fallbackUsername) ?? createInitialPlayerSave(fallbackUsername),
    communityBoost: false,
  };
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

// ── Community Raid ─────────────────────────────────────────────────────────────

export const loadRaidStatus = async (): Promise<RaidStatus | null> => {
  try {
    const response = await fetch('/api/raid');
    if (!response.ok) return null;
    const data: RaidStatusResponse | ApiErrorResponse = await response.json();
    return data.status === 'ok' ? data.raid : null;
  } catch {
    return null;
  }
};

export const submitRaidDamage = async (damage: number): Promise<RaidDamageResponse | null> => {
  try {
    const response = await fetch('/api/raid/damage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ damage: Math.floor(damage) }),
    });
    if (!response.ok) return null;
    const data: RaidDamageResponse | ApiErrorResponse = await response.json();
    return data.status === 'ok' ? data : null;
  } catch {
    return null;
  }
};
