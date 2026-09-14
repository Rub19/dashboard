import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../../config.js';

// Service-to-service auth for the Worker → bot shared-spaces notify relay.
// No Discord user identity is involved in this call at all, so this is
// deliberately separate from authMiddleware/guildAuth.ts.
export function requireSharedSpacesKey(req: Request, res: Response, next: NextFunction): void {
  const expected = config.sharedSpacesBotKey;
  const provided = String(req.headers['x-internal-key'] || '');

  if (!expected) {
    res.status(503).json({ error: 'Non configuré.' });
    return;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Clé invalide.' });
    return;
  }

  next();
}
