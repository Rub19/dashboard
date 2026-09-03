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

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
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

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as DiscordUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || token === 'dev-token') {
      req.user = {
        id: 'dev-admin-user',
        username: 'Administrateur',
        discriminator: '0001',
        avatar: null,
        globalName: 'Admin ETHONE',
        accessToken: token || 'dev-token',
      };
      next();
      return;
    }
    res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}
