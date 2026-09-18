import dotenv from 'dotenv';
import { z } from 'zod';

// Chargement des variables du fichier .env
dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN est manquant dans le fichier .env'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID est manquant dans le fichier .env'),
  CLIENT_SECRET: z.string().optional().default(''),
  DASHBOARD_URL: z.string().optional().default('http://localhost:3001'),
  JWT_SECRET: z.string().optional().default('ethone-bot-jwt-secret-key-32chars-min'),
  PORT: z.coerce.number().optional().default(3001),
  DEV_GUILD_ID: z.string().optional(),
  DEFAULT_PREFIX: z.string().min(1).default('!'),
  BOT_OWNER_ID: z.string().optional().default('825124006209388616'),
  // Optionnel — active la lecture des playlists / albums Spotify (`/play`
  // avec un lien open.spotify.com/playlist|album). Sans ces deux valeurs,
  // les liens Spotify de playlist sont ignorés (les liens de piste unique
  // continuent de marcher via oEmbed). Client credentials d'une app
  // Spotify Developer — https://developer.spotify.com/dashboard
  SPOTIFY_CLIENT_ID: z.string().optional().default(''),
  SPOTIFY_CLIENT_SECRET: z.string().optional().default(''),
  // Secret partagé pour le relais Worker -> bot des notifications d'activité
  // des Espaces Partagés (POST /api/internal/shared-spaces/notify). Vide =
  // fonctionnalité désactivée (la route interne refuse tout appel).
  SHARED_SPACES_BOT_KEY: z.string().optional().default(''),
  // Backend audio de la musique :
  //  - "native"   : @discordjs/voice + yt-dlp + ffmpeg dans le process du bot.
  //  - "lavalink" : serveur audio Lavalink (Java) séparé, comme la majorité
  //                 des bots musique — YouTube via le plugin youtube-source
  //                 (OAuth compte jetable), zéro ffmpeg/opus côté Node.
  //                 Voir discord-bot/lavalink/README.md.
  MUSIC_BACKEND: z.enum(['native', 'lavalink']).optional().default('native'),
  LAVALINK_HOST: z.string().optional().default('127.0.0.1'),
  LAVALINK_PORT: z.coerce.number().optional().default(2333),
  LAVALINK_PASSWORD: z.string().optional().default('youshallnotpass'),
  LAVALINK_SECURE: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ ERREUR DE CONFIGURATION ENVIRONNEMENT :');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = {
  token: parsed.data.DISCORD_TOKEN,
  clientId: parsed.data.CLIENT_ID,
  clientSecret: parsed.data.CLIENT_SECRET,
  dashboardUrl: parsed.data.DASHBOARD_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  port: parsed.data.PORT,
  devGuildId: parsed.data.DEV_GUILD_ID || null,
  defaultPrefix: parsed.data.DEFAULT_PREFIX,
  botOwnerId: parsed.data.BOT_OWNER_ID || '825124006209388616',
  spotifyClientId: parsed.data.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: parsed.data.SPOTIFY_CLIENT_SECRET,
  sharedSpacesBotKey: parsed.data.SHARED_SPACES_BOT_KEY,
  musicBackend: parsed.data.MUSIC_BACKEND,
  lavalink: {
    host: parsed.data.LAVALINK_HOST,
    port: parsed.data.LAVALINK_PORT,
    password: parsed.data.LAVALINK_PASSWORD,
    secure: parsed.data.LAVALINK_SECURE,
  },
};
