import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

// auditRepository écrit dans <cwd>/data : dossier temporaire, modules importés après le chdir.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-log-webhooks-'));
process.chdir(tmpDir);
const { auditRepository } = await import('./src/modules/logs/storage/auditRepository.js');
const { DiscordLogService } = await import('./src/modules/logs/services/discordLogService.js');
const { DEFAULT_CATEGORY_NAME, LOG_CATEGORY_KEYS, categoryKeyOf, isLogCategoryKey, sanitizeWebhookName } = await import(
  './src/modules/logs/services/logCategories.js'
);

let passed = 0;
let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

/** Faux serveur avec deux salons texte ; chaque webhook enregistre ce qu'on lui fait envoyer. */
function fakeWorld(guildId: string) {
  const sent: Array<{ channelId: string; username?: string }> = [];
  const perm = { has: () => true };
  const makeChannel = (id: string) => {
    const channel: Record<string, unknown> = {
      id,
      name: `salon-${id}`,
      type: ChannelType.GuildText,
      permissionsFor: () => perm,
      fetchWebhooks: async () => [],
      createWebhook: async () => ({
        send: async (opts: { username?: string }) => {
          sent.push({ channelId: id, username: opts.username });
        },
      }),
      send: async () => {
        sent.push({ channelId: id, username: undefined });
      },
      client: { user: { id: 'bot', displayAvatarURL: () => 'x' } },
    };
    return channel;
  };
  const channels = new Map<string, unknown>([
    ['111111111', makeChannel('111111111')],
    ['222222222', makeChannel('222222222')],
  ]);
  const guild = {
    id: guildId,
    channels: { cache: channels },
    members: { me: { permissions: perm } },
    client: { user: { displayAvatarURL: () => 'x' } },
  };
  const client = { guilds: { cache: new Map([[guildId, guild]]) } };
  DiscordLogService.initialize(client as never);
  return { sent };
}

async function run() {
  console.log('🧪 Webhooks de logs par catégorie\n');

  console.log('📛 1. Noms:');
  assert(DEFAULT_CATEGORY_NAME.VOICE === 'vocals', 'catégorie vocale → « vocals »');
  assert(DEFAULT_CATEGORY_NAME.MODERATION === 'mod', 'catégorie modération → « mod »');
  assert(LOG_CATEGORY_KEYS.every((k) => DEFAULT_CATEGORY_NAME[k].length > 0), 'chaque catégorie a un nom par défaut');
  assert(categoryKeyOf({ module: 'SECURITY', type: 'RAID_DETECTED' }) === 'RAID', 'un raid a sa propre catégorie');
  assert(categoryKeyOf({ module: 'VOICE', type: 'VOICE_JOIN' }) === 'VOICE', 'un événement vocal reste VOICE');
  assert(isLogCategoryKey('VOICE') && !isLogCategoryKey('N_IMPORTE_QUOI'), 'validation des catégories');
  assert(!/discord|clyde/i.test(sanitizeWebhookName('Discord Vocals clyde', 'x')), 'les mots interdits par Discord sont retirés');
  assert(sanitizeWebhookName('   ', 'vocals') === 'vocals', 'un nom vide retombe sur le défaut');
  assert(sanitizeWebhookName('a'.repeat(200), 'x').length === 80, 'un nom est limité à 80 caractères');

  console.log('\n💾 2. Configuration:');
  const gid = 'guild-log-webhooks-0001';
  auditRepository.updateConfig(gid, { webhookNames: { VOICE: 'salon vocal', BIDON: 'x' } as never, categoryChannels: { VOICE: '222222222', MODERATION: 'pas-un-id' } as never });
  const cfg = auditRepository.getConfig(gid);
  assert(cfg.webhookNames?.VOICE === 'salon vocal', 'un nom personnalisé est enregistré');
  assert(!('BIDON' in (cfg.webhookNames || {})), 'une catégorie inconnue est ignorée');
  assert(cfg.categoryChannels?.VOICE === '222222222', 'un salon valide est enregistré');
  assert(!cfg.categoryChannels?.MODERATION, "un identifiant de salon invalide est refusé");
  auditRepository.updateConfig(gid, { webhookNames: { VOICE: '' } });
  assert(auditRepository.getConfig(gid).webhookNames?.VOICE === undefined, 'un nom vide rétablit le défaut');
  auditRepository.updateConfig(gid, { categoryChannels: { VOICE: null } });
  assert(auditRepository.getConfig(gid).categoryChannels?.VOICE === undefined, 'null retire le salon dédié');

  console.log('\n📤 3. Livraison (message de test):');
  const world = fakeWorld(gid);
  auditRepository.updateConfig(gid, { routing: { generalChannelId: '111111111', generalThreshold: 'ALL' } as never });

  let res = await DiscordLogService.sendTest(gid, 'VOICE');
  assert(res.ok && res.channelId === '111111111', 'sans salon dédié, le salon général est utilisé');
  assert(world.sent.at(-1)?.username === 'vocals', 'le webhook s\'appelle « vocals »');

  res = await DiscordLogService.sendTest(gid, 'MODERATION');
  assert(world.sent.at(-1)?.username === 'mod', 'le webhook de modération s\'appelle « mod »');

  auditRepository.updateConfig(gid, { webhookNames: { VOICE: 'salon vocal' }, categoryChannels: { VOICE: '222222222' } });
  res = await DiscordLogService.sendTest(gid, 'VOICE');
  assert(res.ok && res.channelId === '222222222' && world.sent.at(-1)?.channelId === '222222222', 'un salon dédié est prioritaire');
  assert(world.sent.at(-1)?.username === 'salon vocal', 'le nom personnalisé est utilisé');

  // Sans aucun salon : diagnostic clair, rien n'est envoyé
  const gid2 = 'guild-log-webhooks-0002';
  const world2 = fakeWorld(gid2);
  const none = await DiscordLogService.sendTest(gid2, 'VOICE');
  assert(!none.ok && none.reason === 'no_channel' && world2.sent.length === 0, 'aucun salon configuré → raison explicite, rien envoyé');

  console.log('\n==================================================');
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('==================================================');
  process.chdir(os.tmpdir());
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
