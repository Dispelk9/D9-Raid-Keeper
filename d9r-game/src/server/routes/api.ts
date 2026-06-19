import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type {
  ApiErrorResponse,
  KeeperLoadResponse,
  KeeperSaveRequest,
  KeeperSaveResponse,
} from '../../shared/api';
import { createInitialPlayerSave } from '../../shared/game/logic/progression';
import { isPlayerSave } from '../../shared/game/validators';

export const api = new Hono();

const getUsername = async () => {
  const username = await reddit.getCurrentUsername();

  return username ?? 'anonymous';
};

const getSaveKey = (username: string) => `raid-keeper:save:${username}`;

const parseStoredSave = (rawSave: string | null | undefined) => {
  if (!rawSave) return null;

  try {
    const parsedSave: unknown = JSON.parse(rawSave);

    return isPlayerSave(parsedSave) ? parsedSave : null;
  } catch {
    return null;
  }
};

const parseSaveRequest = (value: unknown): KeeperSaveRequest | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  if (!('save' in value) || !isPlayerSave(value.save)) return null;

  return {
    save: value.save,
  };
};

api.get('/keeper', async (c) => {
  try {
    const username = await getUsername();
    const storedSave = parseStoredSave(await redis.get(getSaveKey(username)));
    const save = storedSave ?? createInitialPlayerSave(username);

    if (!storedSave) {
      await redis.set(getSaveKey(username), JSON.stringify(save));
    }

    return c.json<KeeperLoadResponse>({
      status: 'ok',
      save,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load player save';

    return c.json<ApiErrorResponse>(
      {
        status: 'error',
        message,
      },
      500
    );
  }
});

api.post('/keeper', async (c) => {
  try {
    const body: unknown = await c.req.json();
    const request = parseSaveRequest(body);

    if (!request) {
      return c.json<ApiErrorResponse>(
        {
          status: 'error',
          message: 'Invalid keeper save payload',
        },
        400
      );
    }

    const username = await getUsername();
    const save = {
      ...request.save,
      username,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(getSaveKey(username), JSON.stringify(save));

    return c.json<KeeperSaveResponse>({
      status: 'ok',
      save,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to save player progress';

    return c.json<ApiErrorResponse>(
      {
        status: 'error',
        message,
      },
      500
    );
  }
});
