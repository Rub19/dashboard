import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits, ChannelType } from 'discord.js';

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
  const channelMap = new Map(channelsList.map((c) => [c.id, c]));

  const mockGuild: any = {
    id: guildId,
    name: 'ETHONE Community',
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
        return { entries: new Map() };
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

  console.log('--- 1. Construction du message d\'accueil & vérification visuelle DA Ethone ---');
  const fullPermsGuild = createMockGuild({ allPerms: true });
  const msg = guildJoinService.buildJoinMessage(fullPermsGuild, inviterId);

  assert(msg.content === `<@${inviterId}>`, 'Le message mentionne directement l\'inviteur en texte (@Rub)');
  assert(Array.isArray(msg.embeds) && msg.embeds.length === 1, 'Un embed principal est généré');

  const embedData = (msg.embeds[0] as any).data;
  assert(embedData.color === 0x10b981, 'Couleur émeraude Ethone (0x10b981) appliquée');
  assert(embedData.title.includes('ajouté avec succès'), 'Titre de l\'embed : « ajouté avec succès »');

  const desc = embedData.description || '';
  assert(desc.includes('État actuel') && desc.includes('Opérationnel'), 'Section État actuel avec statut Opérationnel');
  assert(desc.includes('VIEW_AUDIT_LOG') && desc.includes('☑️ `VIEW_AUDIT_LOG`'), 'Permissions auditées avec coche ☑️');
  assert(desc.includes('CREATE_GUILD_EXPRESSIONS'), 'Les 11 permissions du screen sont toutes testées');
  assert(desc.includes('Important') && desc.includes('Place le rôle le plus haut'), 'Avertissement sur la hiérarchie des rôles');
  assert(desc.includes('/aide') && desc.includes('/config') && desc.includes('/verifier-permissions') && desc.includes('/langue'), 'Toutes les commandes utiles référencées');
  assert(desc.includes('Salon système'), 'Section salon système présente');
  assert(desc.includes('Langue du bot'), 'Section langue du bot présente');

  console.log('\n--- 2. Composants interactifs & boutons Support / Dashboard ---');
  assert(Array.isArray(msg.components) && msg.components.length === 4, 'Exactement 4 rangées de composants');

  const rows = msg.components as any[];
  const channelSelect = rows[0].components[0].data;
  assert(channelSelect.custom_id.startsWith('guild_join:select_channel:'), 'Sélecteur de salon existant avec customId dédié');

  const createBtn = rows[1].components[0].data;
  assert(createBtn.custom_id.startsWith('guild_join:create_channel:') && createBtn.label.includes('Créer le salon système'), 'Bouton « Créer le salon système »');

  const langSelect = rows[2].components[0].data;
  assert(langSelect.custom_id.startsWith('guild_join:language:') && langSelect.options.length === 4, 'Sélecteur de langue avec les 4 langues (FR, EN, ES, DE)');

  const linksRow = rows[3].components.map((c: any) => c.data);
  assert(linksRow.length === 2, '2 boutons de liens externes');
  assert(linksRow[0].url === 'https://discord.gg/WvEcyBuP45' && linksRow[0].label.includes('Support'), 'Bouton Support pointant sur le Discord Ethone');
  assert(linksRow[1].url === `https://ethone.dev/discord?guildId=${guildId}` && linksRow[1].label.includes('Dashboard'), 'Bouton Dashboard avec paramètre guildId');

  console.log('\n--- 3. Détection de permissions manquantes ---');
  const restrictedGuild = createMockGuild({ allPerms: false });
  const restrictedMsg = guildJoinService.buildJoinMessage(restrictedGuild, inviterId);
  const restrictedDesc = (restrictedMsg.embeds![0] as any).data.description;
  assert(restrictedDesc.includes('Attention aux permissions'), 'Statut adapté si les permissions principales manquent');
  assert(restrictedDesc.includes('❌ `VIEW_AUDIT_LOG`'), 'Permissions manquantes marquées avec une croix ❌');

  console.log('\n--- 4. Résolution de l\'inviteur & sélection du salon ---');
  const auditGuild = createMockGuild({ auditExecutorId: '825124006209388616' });
  const foundInviter = await guildJoinService.resolveInviterId(auditGuild);
  assert(foundInviter === '825124006209388616', 'Inviteur résolu avec succès depuis l\'audit log');

  const noAuditGuild = createMockGuild({ auditExecutorId: null });
  const fallbackInviter = await guildJoinService.resolveInviterId(noAuditGuild);
  assert(fallbackInviter === '999888777666555444', 'Repli sur l\'Owner ID si l\'audit log est indisponible');

  const textChannel = {
    id: 'chan_general',
    name: 'general',
    isTextBased: () => true,
    isThread: () => false,
    permissionsFor: () => ({ has: () => true }),
    send: async () => true,
  };
  const targetGuild = createMockGuild({ channels: [textChannel] });
  const chosenChannel = guildJoinService.findTargetChannel(targetGuild);
  assert(chosenChannel?.id === 'chan_general', 'Sélection intelligente du premier salon textuel public');

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
    reply: async (payload: any) => replies.push(payload),
  };
  await guildJoinService.handleButton(fakeButtonInteraction);
  const confAfterCreate = guildConfigService.getConfig(guildId);
  assert(confAfterCreate.systemChannelId === 'chan_new_system', 'Salon système créé et configuré automatiquement');

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
