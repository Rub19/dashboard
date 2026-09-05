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
};
