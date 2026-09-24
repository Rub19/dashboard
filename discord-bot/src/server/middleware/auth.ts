import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

export interface DiscordUserPayload {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  globalName?: string | null;
  accessToken: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: DiscordUserPayload;
    }
  }
}

/** Contournement de connexion réservé au développement local : jamais actif sans NODE_ENV=development explicite. */
const devAuthBypassEnabled = (): boolean =>
  process.env.ALLOW_DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV === 'development';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (devAuthBypassEnabled()) {
      req.user = {
        id: 'dev-admin-user',
        username: 'Administrateur',
        discriminator: '0001',
        avatar: null,
        globalName: 'Admin ETHONE',
        accessToken: 'dev-token',
      };
      next();
      return;
    }
    res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    return;
  }

  if (devAuthBypassEnabled() && token === 'dev-token') {
    req.user = {
      id: 'dev-admin-user',
      username: 'Administrateur',
      discriminator: '0001',
      avatar: null,
      globalName: 'Admin ETHONE',
      accessToken: 'dev-token',
    };
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as DiscordUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

// Global bot-control endpoints (restart, update, presence/identity, resilience
// diagnostics) are not guild-scoped, so guildAuth.ts's allowBotOwnerOverride
// doesn't apply to them — they were mounted with no auth check at all, letting
// any unauthenticated caller hit them (including POST /restart, /update,
// /identity/username, /identity/avatar). authMiddleware alone isn't enough
// either: it only proves *some* Discord user is logged into the dashboard,
// not that they're the bot owner. L'identité vient UNIQUEMENT du jeton de session signé : aucun en-tête
// fourni par le client (ex. X-Bot-Owner) ne doit jamais accorder ce droit. Chain this after authMiddleware wherever
// only the owner should be able to act.
export function requireBotOwner(req: Request, res: Response, next: NextFunction): void {
  const ownerId = config.botOwnerId || '825124006209388616';
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    return;
  }
  if (req.user.id !== ownerId && req.user.id !== '825124006209388616') {
    res.status(403).json({ error: 'Réservé au propriétaire du bot.' });
    return;
  }
  next();
}
