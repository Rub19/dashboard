import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../../types/command.js';
import {
  NativeAutomodError,
  nativeAutomodService,
  TRIGGER_LABELS,
  type NativeRuleView,
} from '../services/nativeAutomodService.js';
import { trg } from '../../../utils/tr.js';

const ACTION_LABELS: Record<string, string> = {
  block_message: 'blocage',
  send_alert: 'alerte',
  timeout: 'exclusion',
  block_member_interaction: 'interactions bloquées',
};

const line = (r: NativeRuleView): string =>
  `${r.enabled ? '🟢' : '⚪'} **${r.name}** · ${r.triggerType === 'unknown' ? 'inconnu' : TRIGGER_LABELS[r.triggerType]} · ${
    r.actions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(', ') || 'aucune action'
  }\n> \`${r.id}\``;

export const nativeAutomodCommand: Command = {
  name: 'automod-native',
  description: "Gère l'AutoMod natif de Discord (exécuté par Discord, même bot hors ligne)",
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('automod-native')
    .setDescription("AutoMod natif de Discord (règles exécutées par Discord lui-même)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('list').setDescription('Lister les règles AutoMod natives du serveur'))
    .addSubcommand((s) =>
      s
        .setName('toggle')
        .setDescription('Activer ou désactiver une règle AutoMod native')
        .addStringOption((o) => o.setName('rule').setDescription('Règle').setAutocomplete(true).setRequired(true))
        .addBooleanOption((o) => o.setName('enabled').setDescription('Activée ?').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('preset')
        .setDescription('Créer les règles recommandées (langage, spam, mentions)')
        .addChannelOption((o) =>
          o.setName('alert').setDescription("Salon d'alerte (facultatif)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)
        )
    )
    .addSubcommand((s) => s.setName('badge').setDescription("Vérifier la progression vers le badge 'Uses AutoMod' (100 règles)"))
    .addSubcommand((s) =>
      s
        .setName('deploy-all')
        .setDescription("Déployer le pack AutoMod sur tous les serveurs du bot")
        .addChannelOption((o) =>
          o.setName('alert').setDescription("Salon d'alerte pour ce serveur").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)
        )
    ),

  autocomplete: async (interaction) => {
    if (!interaction.guild) return interaction.respond([]);
    const focused = interaction.options.getFocused().toLowerCase();
    try {
      const rules = await nativeAutomodService.list(interaction.guild);
      await interaction.respond(
        rules
          .filter((r) => r.name.toLowerCase().includes(focused))
          .slice(0, 25)
          .map((r) => ({ name: r.name.slice(0, 100), value: r.id }))
      );
    } catch {
      await interaction.respond([]);
    }
  },

  execute: async (ctx: CommandContext) => {
    const guild = ctx.guild;
    const i = ctx.interaction;
    if (!guild || !ctx.isSlash || !i) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Utilise la commande slash `/automod-native` dans un serveur.'))], ephemeral: true });
      return;
    }
    await ctx.deferReply({ ephemeral: true });
    const reason = `/automod-native par ${ctx.author.tag}`;
    try {
      const sub = i.options.getSubcommand();
      if (sub === 'badge') {
        const stats = await nativeAutomodService.countAllBotRules(ctx.client);
        const percent = Math.min(100, Math.round((stats.totalRules / 100) * 100));
        const badgeStatus = stats.badgeUnlocked
          ? '🎉 **Badge Débloqué !** (100+ règles actives sur Discord, badge présent sur le profil).'
          : `⏳ **Progression : ${stats.totalRules} / 100 règles** (${percent}%)\n> Discord attribue automatiquement le badge « Uses AutoMod » dès que 100 règles actives sont créées par le bot.`;
        const embed = ctx.createEmbed(stats.badgeUnlocked ? 'success' : 'default')
          .setTitle(trg(ctx, 'Badge Discord « Uses AutoMod »'))
          .setDescription(trg(ctx, '{badgeStatus}\n\n**Serveurs gérés :** {guildCount}\n**Règles actives configurées :** {totalRules}\n\n*Conseil : utilise `/automod-native deploy-all` pour déployer le pack complet (jusqu\'à 6 règles/serveur).*', { badgeStatus, guildCount: stats.guildCount, totalRules: stats.totalRules }));
        await ctx.editReply({ embeds: [embed] });
      } else if (sub === 'deploy-all') {
        const res = await nativeAutomodService.deployToAllGuilds(ctx.client, { alertChannelId: i.options.getChannel('alert')?.id, reason });
        const embed = ctx.createEmbed(res.badgeUnlocked ? 'success' : 'default')
          .setTitle(trg(ctx, 'Déploiement global AutoMod'))
          .setDescription(trg(ctx, '**Serveurs traités :** {processedGuilds}\n**Nouvelles règles créées :** {totalCreated}\n**Règles existantes conservées :** {totalSkipped}\n**Total actuel de règles actives :** {totalActiveRules} / 100\n\n{v4}', { processedGuilds: res.processedGuilds, totalCreated: res.totalCreated, totalSkipped: res.totalSkipped, totalActiveRules: res.totalActiveRules, v4: res.badgeUnlocked ? '✨ Objectif 100 règles atteint ! Discord actualise le badge sur le profil sous peu.' : 'Il manque encore ' + (100 - res.totalActiveRules) + ' règle(s) pour le seuil des 100.' }));
        await ctx.editReply({ embeds: [embed] });
      } else if (sub === 'toggle') {
        const rule = await nativeAutomodService.toggle(guild, i.options.getString('rule', true), i.options.getBoolean('enabled', true), reason);
        await ctx.editReply({ embeds: [ctx.createEmbed('success').setDescription(trg(ctx, 'Règle **{name}** {v1}.', { name: rule.name, v1: rule.enabled ? 'activée' : 'désactivée' }))] });
      } else if (sub === 'preset') {
        const { created, skipped } = await nativeAutomodService.createRecommended(guild, { alertChannelId: i.options.getChannel('alert')?.id, reason });
        const text = [
          created.length ? `**Créées (${created.length})**\n${created.map((r) => `• ${r.name}`).join('\n')}` : 'Aucune règle créée.',
          skipped.length ? `**Ignorées**\n${skipped.map((s) => `• ${s.name} — ${s.reason}`).join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        await ctx.editReply({ embeds: [ctx.createEmbed(created.length ? 'success' : 'warning').setTitle(trg(ctx, 'AutoMod natif — règles recommandées')).setDescription(text)] });
      } else {
        const rules = await nativeAutomodService.list(guild);
        const description = rules.length ? rules.map(line).join('\n').slice(0, 4000) : "Aucune règle AutoMod native. Utilise `/automod-native preset` pour créer les règles recommandées.";
        await ctx.editReply({
          embeds: [ctx.createEmbed('default').setTitle(trg(ctx, 'AutoMod natif — {length} règle(s)', { length: rules.length })).setDescription(description).setFooter({ text: trg(ctx, 'Exécuté par Discord, même si le bot est hors ligne.') })],
        });
      }
    } catch (err) {
      const msg = err instanceof NativeAutomodError ? err.message : 'Une erreur est survenue. Réessaie plus tard.';
      await ctx.editReply({ embeds: [ctx.createEmbed('error').setDescription(msg)] });
    }
  },
};
