import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { economyStorage } from '../storage/economyStorage.js';
import { economyService } from '../services/economyService.js';
import { cooldownService } from '../../../services/cooldownService.js';
import { buttonRow, container, footer, sectionWithThumbnail, separator, text, toneToColor } from '../../../utils/components.js';

// /pay gets its own small fixed cooldown independent of the guild's
// admin-configurable commandCooldown (which defaults to disabled) — this one
// exists specifically to block transfer-spam griefing, not general abuse.
const PAY_COOLDOWN_SECONDS = 5;

function fmt(amount: number, symbol: string): string {
  return `${amount.toLocaleString('fr-FR')} ${symbol}`;
}

function humanDuration(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

const QUICK_ROW = () =>
  buttonRow(
    new ButtonBuilder().setCustomId('eco_btn_daily').setLabel('Quotidien').setEmoji('🎁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco_btn_work').setLabel('Travailler').setEmoji('💼').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco_btn_leaderboard').setLabel('Classement').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eco_btn_shop').setLabel('Boutique').setEmoji('🛍️').setStyle(ButtonStyle.Secondary)
  );

export const economyCommand: Command = {
  name: 'economy',
  description: 'Économie du serveur : solde, quotidien, travail, vol, transfert, classement, pari, boutique',
  category: 'Général',
  aliases: ['eco'],
  slashData: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Économie du serveur')
    .addSubcommand((sub) =>
      sub
        .setName('balance')
        .setDescription('Affiche votre solde (ou celui d’un membre)')
        .addUserOption((opt) => opt.setName('membre').setDescription('Membre à consulter').setRequired(false))
    )
    .addSubcommand((sub) => sub.setName('daily').setDescription('Réclame votre bonus quotidien (série = bonus)'))
    .addSubcommand((sub) => sub.setName('work').setDescription('Fais un petit boulot pour gagner des crédits'))
    .addSubcommand((sub) =>
      sub
        .setName('rob')
        .setDescription('Tente de voler un membre (risqué : amende en cas d’échec)')
        .addUserOption((opt) => opt.setName('membre').setDescription('Cible').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('pay')
        .setDescription('Transférer des crédits à un membre')
        .addUserOption((opt) => opt.setName('membre').setDescription('Destinataire').setRequired(true))
        .addIntegerOption((opt) => opt.setName('montant').setDescription('Montant à transférer').setMinValue(1).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('leaderboard').setDescription('Classement des membres les plus riches'))
    .addSubcommand((sub) =>
      sub
        .setName('gamble')
        .setDescription('Tenter votre chance à pile ou face (double ou rien)')
        .addIntegerOption((opt) => opt.setName('mise').setDescription('Montant à miser').setMinValue(1).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('shop').setDescription('Affiche la boutique de rôles'))
    .addSubcommand((sub) =>
      sub
        .setName('buy')
        .setDescription('Acheter un article de la boutique')
        .addStringOption((opt) => opt.setName('id').setDescription('Identifiant de l’article (voir /economy shop)').setRequired(true))
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }

    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const sub = ctx.isSlash ? interaction.options.getSubcommand() : (ctx.args[0]?.toLowerCase() || 'balance');
    const sym = config.currencySymbol;
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };

    if (!config.enabled && sub !== 'shop') {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }

    if (sub === 'balance') {
      const targetUser = ctx.isSlash ? interaction.options.getUser('membre') : null;
      const target = targetUser || ctx.author;
      const wallet = economyStorage.getWallet(guildId, target.id, { username: target.username, avatarUrl: target.displayAvatarURL() });
      const rank = economyStorage.getLeaderboard(guildId, 1000).findIndex((w) => w.userId === target.id) + 1;
      const card = container(toneToColor('info', ctx.guildConfig.infoColor), [
        sectionWithThumbnail(
          [
            `## 💰 ${target.username}`,
            `**Solde** ${fmt(wallet.balance, sym)}${rank > 0 ? `   ·   **Rang** #${rank}` : ''}`,
            `**Gagné** ${fmt(wallet.totalEarned, sym)}   ·   **Dépensé** ${fmt(wallet.totalSpent, sym)}${wallet.dailyStreak > 1 ? `   ·   🔥 Série ${wallet.dailyStreak} j` : ''}`,
          ],
          target.displayAvatarURL({ size: 256 }),
          target.username
        ),
        separator(false),
        QUICK_ROW(),
        footer(`${config.currencyName} • ${ctx.guildConfig.botName}`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'daily') {
      const result = economyService.claimDaily(guildId, me);
      if (!result.ok) {
        if (result.reason === 'cooldown') {
          await ctx.reply({ embeds: [ctx.createEmbed('warning').setDescription(`⏳ Vous avez déjà réclamé votre bonus. Revenez dans environ **${humanDuration(result.remainingMs || 0)}**.`)], ephemeral: true });
        } else {
          await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
        }
        return;
      }
      const card = container(toneToColor('success', ctx.guildConfig.successColor), [
        text(`## 🎁 Bonus quotidien réclamé !`),
        text(`**+${fmt(result.amount, sym)}**${result.streakBonus > 0 ? ` (dont 🔥 série ${result.streak} j : +${fmt(result.streakBonus, sym)})` : ''}\nNouveau solde : **${fmt(result.balance, sym)}**`),
        separator(false),
        footer(result.streak > 1 ? `Reviens demain pour garder ta série de ${result.streak} jours` : 'Reviens demain pour démarrer une série et gagner des bonus'),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'work') {
      const result = economyService.work(guildId, me);
      if (!result.ok) {
        if (result.reason === 'cooldown') {
          await ctx.reply({ embeds: [ctx.createEmbed('warning').setDescription(`⏳ Tu as déjà travaillé récemment. Prochain boulot dans **${humanDuration(result.remainingMs || 0)}**.`)], ephemeral: true });
        } else {
          await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ Le travail est désactivé sur ce serveur.')], ephemeral: true });
        }
        return;
      }
      const card = container(toneToColor('primary', ctx.guildConfig.primaryColor), [
        text(`## 💼 Petit boulot : ${result.job}`),
        text(`Tu as gagné **${fmt(result.amount, sym)}**.\nNouveau solde : **${fmt(result.balance, sym)}**`),
        separator(false),
        footer(`Prochain boulot possible dans ${config.workCooldownMinutes} min`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'rob') {
      const targetUser = interaction.options.getUser('membre', true);
      const result = economyService.rob(guildId, me, { id: targetUser.id, username: targetUser.username, avatarUrl: targetUser.displayAvatarURL() });
      if (!result.ok) {
        const messages: Record<string, string> = {
          disabled: '⚪ Le vol est désactivé sur ce serveur.',
          self: '❌ Tu ne peux pas te voler toi-même.',
          target_too_poor: `❌ Cette cible n’a pas assez de crédits (minimum ${fmt(config.robMinTargetBalance, sym)}).`,
          no_funds: '❌ Il te faut au moins quelques crédits pour tenter un vol (l’amende doit pouvoir tomber).',
          cooldown: `⏳ Tu as déjà tenté un vol récemment. Réessaie dans **${humanDuration(result.remainingMs || 0)}**.`,
        };
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(messages[result.reason])], ephemeral: true });
        return;
      }
      if (result.success) {
        const card = container(toneToColor('success', ctx.guildConfig.successColor), [
          text(`## 🕵️ Vol réussi !`),
          text(`Tu as dérobé **${fmt(result.amount, sym)}** à ${targetUser}.\nNouveau solde : **${fmt(result.balance, sym)}**`),
          separator(false),
          footer(`Taux de réussite : ${Math.round(config.robSuccessRate * 100)}% · prochain essai dans ${humanDuration(config.robCooldownMinutes * 60000)}`),
        ]);
        await ctx.reply({ components: [card], componentsV2: true });
      } else {
        const card = container(toneToColor('error', ctx.guildConfig.errorColor), [
          text(`## 🚔 Pris la main dans le sac !`),
          text(`${targetUser} t’a repéré. Amende : **-${fmt(result.fine, sym)}**.\nNouveau solde : **${fmt(result.balance, sym)}**`),
          separator(false),
          footer(`Prochain essai dans ${humanDuration(config.robCooldownMinutes * 60000)}`),
        ]);
        await ctx.reply({ components: [card], componentsV2: true });
      }
      return;
    }

    if (sub === 'pay') {
      const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(guildId, ctx.author.id, 'economy-pay', PAY_COOLDOWN_SECONDS, false);
      if (onCooldown) {
        await ctx.reply({ embeds: [ctx.createEmbed('warning').setDescription(`⏳ Merci de patienter encore ${remainingSeconds}s avant un nouveau transfert.`)], ephemeral: true });
        return;
      }

      const targetUser = interaction.options.getUser('membre', true);
      const amount = interaction.options.getInteger('montant', true);
      const result = economyService.transfer(guildId, me, { id: targetUser.id, username: targetUser.username, avatarUrl: targetUser.displayAvatarURL() }, amount);

      const messages: Record<string, string> = {
        disabled: '⚪ Les transferts sont désactivés sur ce serveur.',
        self: '❌ Vous ne pouvez pas vous payer vous-même.',
        invalid_amount: '❌ Montant invalide.',
        insufficient_funds: '❌ Solde insuffisant pour ce transfert.',
      };
      if (!result.ok) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(messages[result.reason])], ephemeral: true });
        return;
      }
      const card = container(toneToColor('success', ctx.guildConfig.successColor), [
        text(`## 💸 Transfert effectué`),
        text(`**${fmt(amount, sym)}** envoyés à ${targetUser}.\nVotre nouveau solde : **${fmt(result.fromBalance, sym)}**`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'leaderboard') {
      const entries = economyStorage.getLeaderboard(guildId, config.leaderboardSize);
      if (entries.length === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('Aucun membre n’a encore de solde sur ce serveur.')] });
        return;
      }
      const medals = ['🥇', '🥈', '🥉'];
      const lines = entries.map((e, i) => `${medals[i] || `**${e.rank}.**`} <@${e.userId}> — **${fmt(e.balance, sym)}**`);
      const activity = economyStorage.getActivitySummary(guildId);
      const card = container(toneToColor('success', ctx.guildConfig.successColor), [
        text(`## 🏆 Classement — ${config.currencyName}`),
        separator(),
        text(lines.slice(0, 3).join('\n')),
        ...(lines.length > 3 ? [separator(false), text(lines.slice(3).join('\n'))] : []),
        separator(),
        footer(`${fmt(activity.totalCirculating, sym)} en circulation · ${activity.transactions24h} mouvements sur 24h`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'gamble') {
      const bet = interaction.options.getInteger('mise', true);
      const result = economyService.gamble(guildId, me, bet);
      if (!result.ok) {
        const messages: Record<string, string> = {
          invalid_bet: `❌ La mise doit être d’au moins ${fmt(config.gambleMinBet, sym)}.`,
          insufficient_funds: '❌ Solde insuffisant pour cette mise.',
        };
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(messages[result.reason])], ephemeral: true });
        return;
      }
      const card = container(toneToColor(result.won ? 'success' : 'error', result.won ? ctx.guildConfig.successColor : ctx.guildConfig.errorColor), [
        text(result.won ? `## 🪙 Pile ou face… **Gagné !**` : `## 🪙 Pile ou face… **Perdu.**`),
        text(
          result.won
            ? `**+${fmt(result.payout, sym)}** (mise ${fmt(result.amount, sym)})\nNouveau solde : **${fmt(result.balance, sym)}**`
            : `**-${fmt(result.amount, sym)}**\nNouveau solde : **${fmt(result.balance, sym)}**`
        ),
        separator(false),
        buttonRow(new ButtonBuilder().setCustomId(`eco_btn_gamble_${result.amount}`).setLabel('Rejouer la même mise').setEmoji('🎲').setStyle(ButtonStyle.Secondary)),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'shop') {
      const items = economyStorage.getShopItems(guildId).filter((i) => i.enabled);
      if (items.length === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('La boutique est vide pour le moment.')] });
        return;
      }
      const wallet = economyStorage.getWallet(guildId, ctx.author.id, me);
      const lines = items.map((i) => {
        const affordable = wallet.balance >= i.price;
        return `${affordable ? '🟢' : '🔴'} **${i.label}** — ${fmt(i.price, sym)}\n-# \`${i.id}\` · ${i.description || 'Rôle exclusif'}`;
      });
      const card = container(toneToColor('info', ctx.guildConfig.infoColor), [
        text(`## 🛍️ Boutique`),
        text(`Ton solde : **${fmt(wallet.balance, sym)}**`),
        separator(),
        text(lines.join('\n\n')),
        separator(false),
        footer('Achète avec /economy buy id:<identifiant> · 🟢 = dans tes moyens'),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }

    if (sub === 'buy') {
      const itemId = interaction.options.getString('id', true);
      const result = await economyService.purchaseRole(guildId, ctx.member, itemId);
      const messages: Record<string, string> = {
        not_found: '❌ Article introuvable.',
        already_owned: '❌ Vous possédez déjà ce rôle.',
        insufficient_funds: '❌ Solde insuffisant pour cet achat.',
        role_unavailable: '❌ Ce rôle ne peut pas être attribué actuellement (permissions ou hiérarchie).',
      };
      if (!result.ok) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(messages[result.reason])], ephemeral: true });
        return;
      }
      const card = container(toneToColor('success', ctx.guildConfig.successColor), [
        text(`## ✅ Achat réussi`),
        text(`**${result.item.label}** (-${fmt(result.item.price, sym)})\nNouveau solde : **${fmt(result.balance, sym)}**`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
      return;
    }
  },
};
