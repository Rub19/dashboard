import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { authMiddleware, DiscordUserPayload } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

export const authRouter = express.Router();

// The session cookie must only travel over HTTPS in production. When the
// dashboard is served over HTTPS we also send it cross-origin (Secure + None);
// otherwise (local dev) Lax is enough and Secure would drop the cookie.
const COOKIE_IS_HTTPS = !!config.dashboardUrl && config.dashboardUrl.startsWith('https');
const TOKEN_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: COOKIE_IS_HTTPS,
  sameSite: (COOKIE_IS_HTTPS ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const isLocalUrl = (u: string): boolean => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(u);

/**
 * URL publique de CE serveur (là où Discord renverra le code OAuth). DASHBOARD_URL
 * n'est pas utilisable seul : par défaut il vaut http://localhost:3001, ce qui envoyait
 * Discord vers localhost et empêchait toute connexion depuis le site en production.
 * On utilise donc, dans l'ordre : BOT_PUBLIC_URL, DASHBOARD_URL si ce n'est pas du
 * localhost, puis l'hôte réel de la requête (reverse proxy Caddy → bot.ethone.dev).
 */
function getRedirectUri(req: Request): string {
  const explicit = process.env.BOT_PUBLIC_URL?.replace(/\/$/, '');
  if (explicit) return `${explicit}/api/auth/callback`;
  if (config.dashboardUrl && config.dashboardUrl.startsWith('http') && !isLocalUrl(config.dashboardUrl)) {
    return `${config.dashboardUrl}/api/auth/callback`;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/auth/callback`;
}

const ALLOWED_RETURN_ORIGINS = new Set(['https://ethone.dev', 'https://www.ethone.dev', 'http://localhost:3000', 'http://localhost:5173']);
const RETURN_COOKIE = 'auth_return';

/** Cookies posés selon le protocole RÉEL de la requête (HTTPS derrière Caddy), pas selon DASHBOARD_URL. */
function cookieOptionsFor(req: Request) {
  const https = String(req.headers['x-forwarded-proto'] || req.protocol) === 'https';
  return { ...TOKEN_COOKIE_OPTIONS, secure: https, sameSite: (https ? 'none' : 'lax') as 'none' | 'lax' };
}

function safeReturnUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const u = new URL(raw);
    return ALLOWED_RETURN_ORIGINS.has(u.origin) ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/login
 * Redirige l'utilisateur vers Discord OAuth2
 */
authRouter.get('/login', (req: Request, res: Response) => {
  if (!config.clientSecret) {
    res.redirect(`/?error=no_client_secret`);
    return;
  }

  const redirectUri = getRedirectUri(req);
  // Où ramener l'utilisateur après la connexion (le site, pas la racine du bot).
  const returnTo = safeReturnUrl(req.query.return_to);
  if (returnTo) res.cookie(RETURN_COOKIE, returnTo, { ...cookieOptionsFor(req), maxAge: 10 * 60 * 1000 });
  const discordAuthUrl =
    `https://discord.com/oauth2/authorize?client_id=${config.clientId}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=identify%20guilds` +
    `&prompt=consent`;

  res.redirect(discordAuthUrl);
});

const devUserPayload: DiscordUserPayload = {
  id: 'dev-admin-user',
  username: 'Administrateur',
  discriminator: '0001',
  avatar: null,
  globalName: 'Admin ETHONE',
  accessToken: 'dev-token',
};

/**
 * POST & GET /api/auth/dev-login — issues an admin session with NO OAuth.
 * Gated behind ALLOW_DEV_AUTH_BYPASS so it can't be reached in production
 * (where it would let anyone mint a `dev-admin-user` cookie).
 */
authRouter.all('/dev-login', (req: Request, res: Response) => {
  if (process.env.ALLOW_DEV_AUTH_BYPASS !== 'true') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const token = jwt.sign(devUserPayload, config.jwtSecret, { expiresIn: '7d' });

  res.cookie('token', token, TOKEN_COOKIE_OPTIONS);

  if (req.method === 'POST') {
    res.json({ success: true, user: devUserPayload, token });
  } else {
    res.redirect('/');
  }
});

/**
 * GET /api/auth/callback
 * Échange le code temporaire contre le token d'accès Discord
 */
authRouter.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  if (!code) {
    res.redirect('/?error=no_code');
    return;
  }

  const redirectUri = getRedirectUri(req);

  try {
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error('Erreur échange token Discord OAuth2 :', errBody);
      res.redirect('/?error=token_exchange_failed');
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Récupérer le profil utilisateur Discord
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      res.redirect('/?error=user_fetch_failed');
      return;
    }

    const userProfile = (await userRes.json()) as {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      global_name?: string | null;
    };

    const payload: DiscordUserPayload = {
      id: userProfile.id,
      username: userProfile.username,
      discriminator: userProfile.discriminator,
      avatar: userProfile.avatar,
      globalName: userProfile.global_name,
      accessToken,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    res.cookie('token', token, cookieOptionsFor(req));

    const returnTo = safeReturnUrl(req.cookies?.[RETURN_COOKIE]);
    res.clearCookie(RETURN_COOKIE, { path: '/' });
    res.redirect(returnTo ?? 'https://ethone.dev/discord');
  } catch (err) {
    logger.error('Erreur lors du callback OAuth2 :', err);
    res.redirect('/?error=server_error');
  }
});

/**
 * GET /api/auth/me
 * Renvoie les informations de l'utilisateur actuellement connecté
 */
authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Non connecté' });
    return;
  }
  const { accessToken, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

/**
 * POST /api/auth/logout
 * Déconnecte l'utilisateur et détruit le cookie de session
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});
