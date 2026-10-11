import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits, ChannelType, MessageFlags, Collection } from 'discord.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-join-'));
process.chdir(tmpDir);

const { guildJoinService } = await import('../src/services/guildJoinService.js');
const { guildConfigService } = await import('../src/services/guildConfigService.js');

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

const guildId = '1128633164290596884';
const inviterId = '825124006209388616';

function createMockGuild(options: {
  allPerms?: boolean;
  systemChannel?: any;
  channels?: any[];
  auditExecutorId?: string | null;
}) {
  const permSet = new Set(
    options.allPerms !== false
      ? [
          PermissionFlagsBits.ViewAuditLog,
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageWebhooks,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageThreads,
          PermissionFlagsBits.CreateGuildExpressions,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ]
      : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
  );

  const me = {
    displayName: 'Etho',
    permissions: {
      has: (flag: bigint) => permSet.has(flag),
    },
  };

  const channelsList = options.channels || [];
  const channelMap = new Collection<string, any>(channelsList.map((c) => [c.id, c]));

  const mockGuild: any = {
    id: guildId,
    name: 'ETHONE Community',
    roles: { everyone: { id: guildId } },
    ownerId: '999888777666555444',
    members: {
      me,
      fetchMe: async () => me,
    },
    client: {
      user: { id: '1545139931154878464' },
      users: {
        fetch: async (id: string) => ({ id, send: async () => true }),
      },
    },
    channels: {
      cache: channelMap,
      create: async (params: any) => {
        const created = {
          id: 'chan_new_system',
          name: params.name,
          type: params.type,
          toString: () => `<#chan_new_system>`,
        };
        channelMap.set('chan_new_system', created);
        return created;
      },
    },
    systemChannel: options.systemChannel || null,
    setSystemChannel: async (id: string) => {
      mockGuild.systemChannel = channelMap.get(id) || null;
    },
    fetchAuditLogs: async () => {
      if (!options.auditExecutorId) {
        return { entries: new Collection() };
      }
      return {
        entries: [
          {
            target: { id: '1545139931154878464' },
            executor: { id: options.auditExecutorId },
          },
        ],
      };
    },
  };

  return mockGuild;
}

async function run() {
  console.log('🧪 Tests du service de bienvenue et d\'accueil du bot (GuildJoinService)\n');

  console.log('--- 1. Carte d\'accueil Components V2 (style compact Keeper) ---');
  const fullPermsGuild = createMockGuild({ allPerms: true });
  const msg: any = guildJoinService.buildJoinMessage(fullPermsGuild, inviterId);
  const card = JSON.stringify(msg.components.map((c: any) => c.toJSON()));

  assert(msg.content === undefined && msg.embeds === undefined, 'Pas de content ni d\'embed (refusés avec Components V2)');
  assert(msg.flags === MessageFlags.IsComponentsV2, 'Drapeau IsComponentsV2 posé');
  assert(msg.components.length === 1 && msg.components[0].toJSON().accent_color === 0x10b981, 'Une seule carte, barre émeraude quand tout est en place');
  assert(card.includes(`<@${inviterId}>`), 'La carte mentionne l\'inviteur');
  assert(card.includes('ajouté avec succès') && card.includes('toutes en place'), 'Titre et permissions toutes en place');
  assert(card.includes('Rôle de Etho') && card.includes('Salon système'), 'Rôle et salon système listés');
  assert(card.includes('/help') && card.includes('/setup') && card.includes('/verifier-permissions'), 'Commandes utiles réelles du bot');
  assert(card.includes('guild_join:language:') && card.includes('"value":"de"'), 'Sélecteur de langue (4 langues)');
  assert(card.includes('Serveur support') && card.includes('Dashboard du serveur'), 'Boutons Support et Dashboard');

  console.log('\n--- 2. Permissions manquantes ---');
  const restrictedGuild = createMockGuild({ allPerms: false });
  const restricted: any = guildJoinService.buildJoinMessage(restrictedGuild, inviterId);
  const restrictedCard = JSON.stringify(restricted.components[0].toJSON());
  assert(restrictedCard.includes('manquante'), 'Statut adapté si les permissions principales manquent');
  assert(restricted.components[0].toJSON().accent_color === 0xf59e0b, 'Barre orange quand il manque des permissions');

  console.log('\n--- 3. Résolution de l\'inviteur ---');
  const auditGuild = createMockGuild({ auditExecutorId: '825124006209388616' });
  assert((await guildJoinService.resolveInviterId(auditGuild)) === '825124006209388616', 'Inviteur résolu depuis l\'audit log');
  const noAuditGuild = createMockGuild({ auditExecutorId: null });
  assert((await guildJoinService.resolveInviterId(noAuditGuild)) === '999888777666555444', 'Repli sur le propriétaire si l\'audit log est indisponible');

  console.log('\n--- 4. Détection du salon privé staff & zéro création de salon ---');
  const sentInChannel: any[] = [];
  const modChannel = {
    id: 'chan_mod',
    name: 'moderator-only',
    type: ChannelType.GuildText,
    permissionOverwrites: {
      find: (fn: any) => fn({ id: guildId, deny: [PermissionFlagsBits.ViewChannel] }),
    },
    permissionsFor: () => ({ has: () => true }),
    send: async (p: any) => sentInChannel.push(p),
  };
  const staffGuild = createMockGuild({ allPerms: true, auditExecutorId: inviterId, channels: [modChannel] });
  let createdParams: any = null;
  staffGuild.channels.create = async (params: any) => {
    createdParams = params;
    return { id: 'chan_private', name: params.name, send: async () => true };
  };
  await guildJoinService.sendJoinWelcome(staffGuild);
  assert(createdParams === null, 'Aucun salon créé à l\'arrivée du bot');
  assert(sentInChannel.length === 1, 'Message envoyé dans le salon privé staff (#moderator-only)');
  assert(sentInChannel[0].flags === MessageFlags.IsComponentsV2, 'Carte au format Components V2');
  const confStaff = guildConfigService.getConfig(guildId);
  assert(confStaff.systemChannelId === 'chan_mod', 'systemChannelId configuré automatiquement sur le salon staff');

  const emptyGuild = createMockGuild({ allPerms: true, auditExecutorId: inviterId, channels: [] });
  const dmsList: any[] = [];
  emptyGuild.client.users.fetch = async (id: string) => ({ id, send: async (p: any) => dmsList.push({ id, p }) });
  await guildJoinService.sendJoinWelcome(emptyGuild);
  assert(dmsList.length === 1 && dmsList[0].id === inviterId, 'Sans salon accessible : repli en MP à l\'inviteur');

  const textChannel = {
    id: 'chan_general',
    name: 'general',
    isTextBased: () => true,
    isThread: () => false,
    permissionsFor: () => ({ has: () => true }),
    send: async () => true,
  };
  const targetGuild = createMockGuild({ channels: [textChannel] });

  console.log('\n--- 5. Interactions : sélecteur de salon, création de salon, changement de langue ---');
  const replies: any[] = [];
  const fakeChannelInteraction: any = {
    guild: targetGuild,
    member: { permissions: { has: () => true } },
    customId: `guild_join:select_channel:${guildId}`,
    values: ['chan_general'],
    reply: async (payload: any) => replies.push(payload),
  };
  await guildJoinService.handleSelect(fakeChannelInteraction);
  const updatedConf = guildConfigService.getConfig(guildId);
  assert(updatedConf.systemChannelId === 'chan_general', 'systemChannelId persisté dans guildConfig');
  assert(replies.length > 0 && replies[0].ephemeral === true, 'Confirmation éphémère après sélection de salon');

  const fakeButtonInteraction: any = {
    guild: targetGuild,
    member: { permissions: { has: () => true } },
    customId: `guild_join:create_channel:${guildId}`,
    client: targetGuild.client,
    reply: async (payload: any) => replies.push(payload),
  };
  await guildJoinService.handleButton(fakeButtonInteraction);
  const confAfterCreate = guildConfigService.getConfig(guildId);
  assert(confAfterCreate.systemChannelId === 'chan_new_system', 'Salon système créé et configuré automatiquement');

  const fakeOpenCardInteraction: any = {
    guild: targetGuild,
    user: { id: inviterId },
    member: { permissions: { has: () => true } },
    customId: `guild_join:open_card:${guildId}`,
    client: targetGuild.client,
    reply: async (payload: any) => replies.push(payload),
  };
  await guildJoinService.handleButton(fakeOpenCardInteraction);
  const openCardReply = replies[replies.length - 1];
  assert(Boolean(openCardReply.flags & MessageFlags.Ephemeral), 'Bouton d\'ouverture répond avec le drapeau éphémère (Visible uniquement par vous)');

  const fakeLangInteraction: any = {
    guild: targetGuild,
    member: { permissions: { has: () => true } },
    customId: `guild_join:language:${guildId}`,
    values: ['es'],
    reply: async (payload: any) => replies.push(payload),
  };
  await guildJoinService.handleSelect(fakeLangInteraction);
  const confAfterLang = guildConfigService.getConfig(guildId);
  assert(confAfterLang.language === 'es', 'Langue mise à jour en espagnol dans guildConfig');

  console.log('\n==================================================');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  console.log('==================================================');

  process.chdir(os.tmpdir());
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
