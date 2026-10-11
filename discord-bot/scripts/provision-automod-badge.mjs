import { Client, GatewayIntentBits, PermissionFlagsBits, AutoModerationRuleTriggerType, AutoModerationRuleEventType, AutoModerationRuleKeywordPresetType, AutoModerationActionType } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../ethone-next/.env.local') });

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'ci-placeholder-token') {
  console.error("Erreur: DISCORD_TOKEN manquant dans discord-bot/.env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration],
});

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user?.tag}`);
  console.log(`Scan de ${client.guilds.cache.size} serveur(s)...`);

  let totalActive = 0;
  let totalCreated = 0;

  for (const guild of client.guilds.cache.values()) {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      console.log(`- [${guild.name}] Ignoré (manque permission MANAGE_GUILD)`);
      continue;
    }

    try {
      const existing = await guild.autoModerationRules.fetch();
      const existingNames = new Set(existing.map((r) => r.name.toLowerCase()));
      const botExisting = existing.filter((r) => r.creatorId === client.user?.id || r.name.startsWith('ETHONE'));
      totalActive += botExisting.size;

      const plan = [
        {
          name: 'ETHONE • Grossièretés & Insultes',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.KeywordPreset,
          triggerMetadata: {
            presets: [
              AutoModerationRuleKeywordPresetType.Profanity,
              AutoModerationRuleKeywordPresetType.SexualContent,
              AutoModerationRuleKeywordPresetType.Slurs,
            ],
          },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : langage inapproprié.' } }],
        },
        {
          name: 'ETHONE • Détection Anti-Spam',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Spam,
          triggerMetadata: {},
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : spam suspect.' } }],
        },
        {
          name: 'ETHONE • Spam de Mentions',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.MentionSpam,
          triggerMetadata: { mentionTotalLimit: 7 },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : trop de mentions.' } }],
        },
        {
          name: 'ETHONE • Protection Anti-Phishing Nitro',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: ['*discord-nitro*', '*free-nitro*', '*steamcommunity-nitro*', '*discordgift*', '*discrod*', '*dlscord*', '*steam-gift*'],
          },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : tentative de phishing/scam.' } }],
        },
        {
          name: 'ETHONE • Liens et Pub non autorisés',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: ['*discord.gg/' + '*', '*discord.com/invite/' + '*'],
          },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : pub non autorisée.' } }],
        },
        {
          name: 'ETHONE • Mots-clés malveillants',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: ['token grabber', 'grabber discord', 'nitro generator', 'free robux', 'free vbucks'],
          },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué : mots-clés malveillants.' } }],
        },
      ];

      for (const rule of plan) {
        if (existingNames.has(rule.name.toLowerCase())) continue;
        try {
          await guild.autoModerationRules.create({
            name: rule.name,
            eventType: rule.eventType,
            triggerType: rule.triggerType,
            triggerMetadata: rule.triggerMetadata,
            actions: rule.actions,
            enabled: true,
            reason: 'AutoMod Ethone - Activation de la sécurité',
          });
          totalCreated++;
          totalActive++;
          console.log(`  + [${guild.name}] Règle créée: ${rule.name}`);
        } catch (e) {
          console.warn(`  ! [${guild.name}] Impossible de créer ${rule.name}: ${e.message}`);
        }
      }
    } catch (err) {
      console.warn(`- [${guild.name}] Erreur lors du fetch des règles: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total règles créées cette session : ${totalCreated}`);
  console.log(`Total règles actives du bot      : ${totalActive} / 100`);
  if (totalActive >= 100) {
    console.log(`🎉 SUCCÈS : Seuil des 100 règles atteint ! Discord appliquera le badge sous peu.`);
  } else {
    console.log(`ℹ️ Il manque ${100 - totalActive} règles pour débloquer le badge.`);
    console.log(`Pour atteindre 100, invitez Etho sur d'autres serveurs (ex: serveurs de test personnels) et relancez ce script.`);
  }
  console.log(`========================================\n`);

  client.destroy();
  process.exit(0);
});

client.login(token).catch((err) => {
  console.error("Échec de connexion :", err.message);
  process.exit(1);
});
