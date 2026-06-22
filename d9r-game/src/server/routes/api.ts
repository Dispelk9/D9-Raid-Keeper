import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type {
  ApiErrorResponse,
  KeeperLoadResponse,
  KeeperSaveRequest,
  KeeperSaveResponse,
  RaidContributor,
  RaidDamageRequest,
  RaidDamageResponse,
  RaidStatus,
  RaidStatusResponse,
} from '../../shared/api';
import {
  createInitialPlayerSave,
  normalizePlayerSave,
} from '../../shared/game/logic/progression';
import { isPlayerSave } from '../../shared/game/validators';

export const api = new Hono();

// ── Player save ───────────────────────────────────────────────────────────────

const getUsername = async () => (await reddit.getCurrentUsername()) ?? 'anonymous';
const getSaveKey  = (u: string) => `raid-keeper:save:${u}`;

const parseStoredSave = (raw: string | null | undefined) => {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    return isPlayerSave(p) ? normalizePlayerSave(p) : null;
  } catch { return null; }
};

const parseSaveRequest = (value: unknown): KeeperSaveRequest | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  if (!('save' in value) || !isPlayerSave(value.save)) return null;
  return { save: normalizePlayerSave(value.save) };
};

api.get('/keeper', async (c) => {
  try {
    const username = await getUsername();
    const stored   = parseStoredSave(await redis.get(getSaveKey(username)));
    const save     = stored ?? createInitialPlayerSave(username);
    if (!stored) await redis.set(getSaveKey(username), JSON.stringify(save));
    return c.json<KeeperLoadResponse>({ status: 'ok', save });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load player save';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/keeper', async (c) => {
  try {
    const body    = await c.req.json<unknown>();
    const request = parseSaveRequest(body);
    if (!request) return c.json<ApiErrorResponse>({ status: 'error', message: 'Invalid keeper save payload' }, 400);
    const username = await getUsername();
    const save = normalizePlayerSave({ ...request.save, username, updatedAt: new Date().toISOString() });
    await redis.set(getSaveKey(username), JSON.stringify(save));
    return c.json<KeeperSaveResponse>({ status: 'ok', save });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save player progress';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 500);
  }
});

// ── Community Raid ─────────────────────────────────────────────────────────────

// Six bosses cycle weekly, HP pool grows with each tier
const BOSS_NAMES = [
  'Product Owner',
  'Project Manager',
  'Tech Lead',
  'Engineering Manager',
  'Director of Engineering',
  'CEO — Final Boss',
];

const BOSS_HP_MAX = [50_000, 100_000, 200_000, 400_000, 750_000, 1_500_000];

const RAID_PREFIX  = 'community:raid';
const rKey = {
  week:    `${RAID_PREFIX}:week`,
  boss:    `${RAID_PREFIX}:boss`,
  hp:      `${RAID_PREFIX}:hp`,
  hpMax:   `${RAID_PREFIX}:hp:max`,
  lb:      (week: string) => `${RAID_PREFIX}:lb:${week}`,
  userDmg: (week: string, user: string) => `${RAID_PREFIX}:dmg:${week}:${user}`,
};

function getISOWeek(): string {
  const now  = new Date();
  const year = now.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

async function getOrInitRaid(): Promise<{ week: string; bossIndex: number; hp: number; hpMax: number }> {
  const currentWeek = getISOWeek();
  const storedWeek  = await redis.get(rKey.week);

  if (storedWeek !== currentWeek) {
    // New week — advance boss index, reset HP
    const prevBoss   = storedWeek ? parseInt((await redis.get(rKey.boss)) ?? '0', 10) : -1;
    const bossIndex  = (prevBoss + 1) % BOSS_NAMES.length;
    const hpMax      = BOSS_HP_MAX[bossIndex]!;

    await redis.set(rKey.week,  currentWeek);
    await redis.set(rKey.boss,  String(bossIndex));
    await redis.set(rKey.hp,    String(hpMax));
    await redis.set(rKey.hpMax, String(hpMax));

    return { week: currentWeek, bossIndex, hp: hpMax, hpMax };
  }

  const bossIndex = parseInt((await redis.get(rKey.boss)) ?? '0', 10);
  const hpMax     = parseInt((await redis.get(rKey.hpMax)) ?? String(BOSS_HP_MAX[bossIndex] ?? 500_000), 10);
  const hp        = Math.max(0, parseInt((await redis.get(rKey.hp)) ?? String(hpMax), 10));
  return { week: currentWeek, bossIndex, hp, hpMax };
}

async function getTop10(week: string): Promise<RaidContributor[]> {
  try {
    // Leaderboard stored as a sorted set; zRange with REV returns highest scores first
    const entries = await (redis as unknown as {
      zRange(key: string, start: number, stop: number, opts: { rev: boolean }): Promise<{ member: string; score: number }[]>;
    }).zRange(rKey.lb(week), 0, 9, { rev: true });
    return entries.map((e) => ({ username: e.member, damage: e.score }));
  } catch {
    // Fallback: if sorted sets not available, return empty
    return [];
  }
}

async function buildRaidStatus(username: string): Promise<RaidStatus> {
  const { week, bossIndex, hp, hpMax } = await getOrInitRaid();
  const top10      = await getTop10(week);
  const userDamage = parseInt((await redis.get(rKey.userDmg(week, username))) ?? '0', 10);

  return {
    week,
    bossIndex,
    bossName: BOSS_NAMES[bossIndex] ?? 'Unknown Boss',
    hpMax,
    hpRemaining: hp,
    userDamage,
    top10,
  };
}

api.get('/raid', async (c) => {
  try {
    const username = await getUsername();
    const raid     = await buildRaidStatus(username);
    return c.json<RaidStatusResponse>({ status: 'ok', raid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load raid status';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/raid/damage', async (c) => {
  try {
    const body: RaidDamageRequest = await c.req.json();
    const rawDamage = Math.max(0, Math.min(100_000, Math.floor(body.damage ?? 0)));

    if (rawDamage <= 0) {
      const username = await getUsername();
      const raid     = await buildRaidStatus(username);
      return c.json<RaidDamageResponse>({ status: 'ok', raid, bossKilled: false });
    }

    const username = await getUsername();
    const { week, bossIndex, hp } = await getOrInitRaid();

    const newHp    = Math.max(0, hp - rawDamage);
    const killed   = hp > 0 && newHp === 0;
    await redis.set(rKey.hp, String(newHp));

    // Record user contribution (per-user key for fast lookup)
    const prevUser = parseInt((await redis.get(rKey.userDmg(week, username))) ?? '0', 10);
    await redis.set(rKey.userDmg(week, username), String(prevUser + rawDamage));

    // Update sorted-set leaderboard
    try {
      await (redis as unknown as {
        zIncrBy(key: string, increment: number, member: string): Promise<number>;
      }).zIncrBy(rKey.lb(week), rawDamage, username);
    } catch { /* sorted sets not available in this env — graceful no-op */ }

    // If boss died, advance to next boss immediately for next request
    if (killed) {
      const nextBoss  = (bossIndex + 1) % BOSS_NAMES.length;
      const nextHpMax = BOSS_HP_MAX[nextBoss]!;
      await redis.set(rKey.boss,  String(nextBoss));
      await redis.set(rKey.hp,    String(nextHpMax));
      await redis.set(rKey.hpMax, String(nextHpMax));
    }

    const raid = await buildRaidStatus(username);
    return c.json<RaidDamageResponse>({ status: 'ok', raid, bossKilled: killed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit raid damage';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 500);
  }
});
