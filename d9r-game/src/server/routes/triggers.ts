import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import {
  createInitialPlayerSave,
  normalizePlayerSave,
} from '../../shared/game/logic/progression';
import { isPlayerSave } from '../../shared/game/validators';

type CommentSubmitRequest = {
  type?: string;
  author?: { name?: string; id?: string };
  comment?: { id?: string; body?: string; postId?: string };
};

export const triggers = new Hono();

const COMMUNITY_BOOST_KEY = 'community:agile:boostedAt';

// Each comment on a game post rewards the commenter with 300 gold, driving engagement.
// Typing "agile" (case-insensitive) grants +10 energy to ALL users on their next load.
triggers.post('/on-comment-submit', async (c) => {
  try {
    const input = await c.req.json<CommentSubmitRequest>();
    const username = input.author?.name;
    if (!username) return c.json<TriggerResponse>({ status: 'success', message: 'No author' });

    const commentBody = input.comment?.body?.trim().toLowerCase() ?? '';

    // Community "agile" command: broadcast +10 energy to all players on next load
    if (commentBody === 'agile') {
      await redis.set(COMMUNITY_BOOST_KEY, new Date().toISOString());
      return c.json<TriggerResponse>({
        status: 'success',
        message: `Community energy boost activated by ${username}`,
      });
    }

    const saveKey = `raid-keeper:save:${username}`;
    const raw     = await redis.get(saveKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const existing = parsed !== null && isPlayerSave(parsed) ? normalizePlayerSave(parsed) : null;
    const save = existing ?? createInitialPlayerSave(username);

    save.gold = (save.gold ?? 0) + 300;
    await redis.set(saveKey, JSON.stringify(save));

    return c.json<TriggerResponse>({
      status: 'success',
      message: `+300 gold awarded to ${username}`,
    });
  } catch (error) {
    console.error('on-comment-submit error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to award gold' }, 400);
  }
});

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});
