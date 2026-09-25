import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { statrolesStorage } from '../storage/statrolesStorage.js';
import { statrolesEngine } from '../services/statrolesEngine.js';

/**
 * /statroles — list (règles du serveur), check (pourquoi un membre a ou non le rôle), run (applique maintenant, Gérer le
 * serveur). Les règles se créent depuis le dashboard, où l'arbre de conditions se construit visuellement.
 */
export const statrolesCommand: Command = {
  name: 'statroles',
  aliases: ['statrole'],
  description: 'Rôles automatiques selon l’activité : règles, vérification d’un membre, application',
  category: 'Communauté',
  slashData: new SlashCommandBuilder()
    .setName('statroles')
    .setDescription('Rôles automatiques selon l’activité (messages, vocal, ancienneté)')
    .addSubcommand((s) => s.setName('list').setDescription('Liste les règles du serveur'))
    .addSubcommand((s) => s.setName('check').setDescription('Vérifie un membre par rapport aux règles').addUserOption((o) => o.setName('membre').setDescription('Membre (toi par défaut)')))
    .addSubcommand((s) => s.setName('run').setDescription('Applique les règles maintenant (Gérer le serveur)')),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash || !ctx.interaction) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Utilise la commande slash **/statroles** sur un serveur.')], ephemeral: true });
      return;
    }
    const i = ctx.interaction;
    const guild = ctx.guild;
    const conf = statrolesStorage.getConfig(guild.id);
    const sub = i.options.getSubcommand();

    if (sub === 'list') {
      if (conf.rules.length === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('Aucune règle. Créez-les depuis le dashboard : **Statroles**.')], ephemeral: true });
        return;
      }
      const embed = ctx
        .createEmbed('info')
        .setTitle(`🏅 Statroles (${conf.rules.length})`)
        .setDescription(conf.enabled ? 'Module actif : les règles sont appliquées toutes les 10 minutes.' : 'Module **désactivé** : rien n’est attribué (`/module nom:statroles activer:True`).');
      for (const r of conf.rules.slice(0, 10)) embed.addFields({ name: `${r.enabled ? '🟢' : '⚪'} ${r.name}`, value: `Rôle <@&${r.roleId}> · ${r.removeWhenNotMatching ? 'retiré si les conditions ne sont plus remplies' : 'conservé une fois obtenu'}` });
      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'check') {
      const user = i.options.getUser('membre') ?? i.user;
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Membre introuvable sur ce serveur.')], ephemeral: true });
        return;
      }
      const results = statrolesEngine.check(guild, member);
      const body = results.length
        ? results.map((r) => `${r.matches ? '✅' : '❌'} **${r.rule.name}** → <@&${r.rule.roleId}> ${r.hasRole ? '(possédé)' : '(non possédé)'}`).join('\n')
        : 'Aucune règle.';
      await ctx.reply({ embeds: [ctx.createEmbed('info').setTitle(`🔎 ${member.displayName}`).setDescription(body)], ephemeral: true, allowedMentions: { parse: [] } });
      return;
    }

    if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('⛔ Réservé aux membres qui ont la permission **Gérer le serveur**.')], ephemeral: true });
      return;
    }
    if (!conf.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('warning').setDescription('Le module est désactivé : `/module nom:statroles activer:True`.')], ephemeral: true });
      return;
    }
    await i.deferReply({ ephemeral: true });
    const s = await statrolesEngine.run(guild);
    await i.editReply({
      embeds: [
        ctx
          .createEmbed(s.errors ? 'warning' : 'success')
          .setTitle('🏅 Statroles appliqués')
          .setDescription(`➕ ${s.added} · ➖ ${s.removed}${s.errors ? ` · ⚠️ ${s.errors} erreur(s)` : ''}${s.skipped ? ` · ⏭️ ${s.skipped} reporté(s) au prochain passage` : ''}${s.issues.length ? `\n\n${s.issues.map((x) => `⚠️ ${x}`).join('\n')}` : ''}`),
      ],
    });
  },
};
