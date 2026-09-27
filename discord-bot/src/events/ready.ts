import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActivityType, Client } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { giveawayScheduler } from '../modules/giveaways/services/giveawayScheduler.js';
import { ModerationService } from '../modules/moderation/services/moderationService.js';
import { musicService } from '../modules/music/services/musicService.js';
import { logService } from '../modules/logs/services/logService.js';
import { ticketService } from '../modules/tickets/services/ticketService.js';
import { inviteService } from '../modules/invites/services/inviteService.js';
import { voiceService } from '../modules/voice/services/voiceService.js';
import { backupService } from '../modules/backup/services/backupService.js';
import { aiService } from '../modules/ai/services/aiService.js';
import { runModuleMigrations } from '../services/moduleMigrations.js';
import { clearDeparture } from '../services/departedGuilds.js';
import { initializePanelState } from '../services/panelStateService.js';
import { statsCollector } from '../modules/stats/services/statsCollector.js';
import { statrolesEngine } from '../modules/statroles/services/statrolesEngine.js';
import { initialize as initEmergency } from '../modules/health/services/emergencyService.js';
import { levelingService } from '../modules/leveling/services/levelingService.js';
import { initialize as initSecureRoles } from '../modules/secureroles/services/secureRolesService.js';
import { logger } from '../utils/logger.js';

const BOT_SITE_URL = 'https://discord.ethone.dev';
const BOT_DISPLAY_NAME = 'Etho';

/**
 * « À propos de moi » du bot (400 caractères max), en anglais. Discord n'affiche PAS les liens Markdown `[texte](url)` dans les bios :
 * les liens sont donc des adresses courtes (le site et une redirection `/invite` vers l'autorisation Discord), avec des libellés en gras.
 */
function buildBotBio(_clientId: string): string {
  return [
    `${BOT_DISPLAY_NAME}: the all-in-one Discord bot, run from a real-time dashboard (moderation, music, tickets, levels, security…).`,
    `🌐 **Website:** ${BOT_SITE_URL}`,
    `➕ **Invite:** ${BOT_SITE_URL}/invite`,
  ].join('\n').slice(0, 400);
}

/** Met la bio à jour uniquement si elle a changé (évite d'appeler l'API Discord à chaque démarrage). */
async function syncBotBio(client: Client<true>): Promise<void> {
  try {
    const bio = buildBotBio(client.user.id);
    const app = await client.application.fetch();
    if ((app.description || '').trim() === bio) return;
    await client.application.edit({ description: bio });
    logger.success("[Profil] Bio du bot mise à jour (site web + lien d'invitation).");
  } catch (err) {
    logger.warn('[Profil] Impossible de mettre à jour la bio du bot :', err);
  }
}

const PROFILE_STATE_FILE = path.resolve(process.cwd(), 'data', 'bot_profile_sync.json');
/** Le bot peut tourner depuis `src/` (bun, tsx), `dist/` (tsc) ou un bundle : on cherche la bannière depuis le dossier de travail et depuis ce fichier. */
const BANNER_CANDIDATES = [
  path.resolve(process.cwd(), 'assets', 'etho-banner.png'),
  path.resolve(process.cwd(), 'discord-bot', 'assets', 'etho-banner.png'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'etho-banner.png'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'etho-banner.png'),
];
const BANNER_FILE = BANNER_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? BANNER_CANDIDATES[0];

interface ProfileSyncState {
  bannerHash?: string;
  usernameAttempted?: string;
}

function readProfileState(): ProfileSyncState {
  try {
    return JSON.parse(fs.readFileSync(PROFILE_STATE_FILE, 'utf8')) as ProfileSyncState;
  } catch {
    return {};
  }
}

function writeProfileState(state: ProfileSyncState): void {
  try {
    fs.mkdirSync(path.dirname(PROFILE_STATE_FILE), { recursive: true });
    fs.writeFileSync(PROFILE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    logger.warn('[Profil] État de synchronisation non enregistré :', err);
  }
}

/**
 * Bannière et nom du bot. Chaque changement n'est envoyé qu'une fois (empreinte de la bannière, tentative de nom mémorisées dans
 * `data/bot_profile_sync.json`) : Discord limite fortement les changements de profil d'un bot.
 */
async function syncBotProfile(client: Client<true>): Promise<void> {
  const state = readProfileState();

  try {
    const image = fs.readFileSync(BANNER_FILE);
    const hash = createHash('sha1').update(image).digest('hex');
    if (state.bannerHash !== hash) {
      await client.user.setBanner(image);
      state.bannerHash = hash;
      writeProfileState(state);
      logger.success('[Profil] Bannière du bot mise à jour.');
    }
  } catch (err) {
    logger.warn('[Profil] Impossible de mettre à jour la bannière du bot :', err);
  }

  if (client.user.username !== BOT_DISPLAY_NAME && state.usernameAttempted !== BOT_DISPLAY_NAME) {
    // Une seule tentative : si le nom est déjà pris, on ne réessaie pas à chaque démarrage (limite Discord : 2 changements par heure).
    state.usernameAttempted = BOT_DISPLAY_NAME;
    writeProfileState(state);
    try {
      await client.user.setUsername(BOT_DISPLAY_NAME);
      logger.success(`[Profil] Nom du bot changé en « ${BOT_DISPLAY_NAME} ».`);
    } catch (err) {
      logger.warn(`[Profil] Discord a refusé le nom « ${BOT_DISPLAY_NAME} » (probablement déjà pris) :`, err);
    }
  }
}

export async function onReady(client: Client<true>) {
  logger.success(`Connecté avec succès en tant que ${client.user.tag} !`);

  // Mise à jour du statut d'activité
  client.user.setPresence({
    activities: [{ name: 'vos commandes | /help ou !help', type: ActivityType.Custom }],
    status: 'online',
  });

  void syncBotBio(client);
  void syncBotProfile(client);

  // Migrations uniques de modules (ex. XP désactivé partout), avant tout démarrage de module
  runModuleMigrations(client);
  initializePanelState(client);
  // Serveurs revenus pendant que le bot était arrêté : leur purge programmée est annulée.
  for (const guild of client.guilds.cache.values()) clearDeparture(guild.id);

  // Statistiques : reprise des sessions vocales en cours et crédit périodique
  statsCollector.init(client);
  statrolesEngine.initialize(client);
  initSecureRoles(client);
  levelingService.initialize(client);
  initEmergency(client);

  // Déploiement automatique des slash commands au démarrage
  await commandRegistry.deploySlashCommands();

  // Restauration des timers de Giveaways actifs
  giveawayScheduler.init(client);

  // Démarrage du Moderation Center 2.0 & du scheduler de sanctions temporaires
  ModerationService.initialize(client);

  // Démarrage de Music Center 2.0 (restaure aussi les files d'attente actives)
  await musicService.initialize(client);

  // Démarrage de Logs & Audit Center 2.0
  logService.initialize(client);

  // Démarrage de Tickets Center 2.0
  ticketService.initialize(client);

  // Démarrage de Invite Tracker & Referral 2.0
  await inviteService.initialize(client);

  // Démarrage de Voice Channels 2.0 (Récupération et réconciliation)
  await voiceService.initialize(client);

  // Démarrage de Server Backup & Restore 2.0
  await backupService.initialize(client);

  // Démarrage de AI Assistant 2.0
  await aiService.initialize(client);
}
