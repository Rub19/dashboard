import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { SharedSpaceNotifyService, SharedSpaceNotifyPayload } from '../../modules/sharedSpaces/services/sharedSpaceNotifyService.js';

const SNOWFLAKE_RE = /^\d{17,20}$/;
const KIND_RE = /^(task|event|note)$/;
const ACTION_RE = /^(created|completed)$/;

// Pure so the "bad payload -> null, never a call to Discord" contract is
// testable without an Express request.
export function validateNotifyPayload(body: unknown): SharedSpaceNotifyPayload | null {
  const { guildId, channelId, spaceName, kind, action, title, actorName } = (body || {}) as Record<string, unknown>;

  if (
    typeof guildId !== 'string' || !SNOWFLAKE_RE.test(guildId) ||
    typeof channelId !== 'string' || !SNOWFLAKE_RE.test(channelId) ||
    typeof kind !== 'string' || !KIND_RE.test(kind) ||
    typeof action !== 'string' || !ACTION_RE.test(action)
  ) {
    return null;
  }

  return {
    guildId,
    channelId,
    spaceName: String(spaceName || 'Espace partagé').slice(0, 120),
    kind: kind as 'task' | 'event' | 'note',
    action: action as 'created' | 'completed',
    title: String(title || '').slice(0, 300),
    actorName: String(actorName || 'Quelqu\'un').slice(0, 80),
  };
}

// Service-to-service route: the Worker relays here after a shared-space
// write, guarded by requireSharedSpacesKey (no Discord user identity
// involved). Never throws past a 400/401 -- a bad/missing payload just
// means no message gets posted, same as any other best-effort notify.
export function createInternalSharedSpaceRouter(discordClient: Client) {
  const router = express.Router();

  router.post('/notify', async (req: Request, res: Response): Promise<void> => {
    const payload = validateNotifyPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'Requête invalide.' });
      return;
    }

    const notified = await SharedSpaceNotifyService.notify(discordClient, payload);
    res.json({ notified });
  });

  return router;
}
