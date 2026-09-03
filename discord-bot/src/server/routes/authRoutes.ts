import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { authMiddleware, DiscordUserPayload } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

export const authRouter = express.Router();

function getRedirectUri(req: Request): string {
  if (config.dashboardUrl && config.dashboardUrl.startsWith('http')) {
    return `${config.dashboardUrl}/api/auth/callback`;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/auth/callback`;
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
 * POST & GET /api/auth/dev-login (Accès immédiat sans friction)
 */
authRouter.all('/dev-login', (req: Request, res: Response) => {
  const token = jwt.sign(devUserPayload, config.jwtSecret, { expiresIn: '7d' });

  res.cookie('token', token, {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

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

    res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect('/');
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
