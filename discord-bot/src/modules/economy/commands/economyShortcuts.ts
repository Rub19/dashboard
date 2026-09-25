import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { economyStorage } from '../storage/economyStorage.js';
import { economyService } from '../services/economyService.js';
import { cooldownService } from '../../../services/cooldownService.js';
import { buttonRow, container, footer, sectionWithThumbnail, separator, text, toneToColor } from '../../../utils/components.js';
import { ButtonBuilder, ButtonStyle } from 'discord.js';

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

export const dailyCommand: Command = {
  name: 'daily',
  description: 'Réclame votre bonus quotidien (série = bonus)',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réclame votre bonus quotidien de crédits'),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };
    const sym = config.currencySymbol;
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
  },
};

export const workCommand: Command = {
  name: 'work',
  description: 'Fais un petit boulot pour gagner des crédits',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Effectue un petit boulot pour gagner des crédits'),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };
    const sym = config.currencySymbol;
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
  },
};

export const balanceCommand: Command = {
  name: 'balance',
  description: 'Affiche votre solde (ou celui d’un membre)',
  category: 'Économie',
  aliases: ['bal', 'money', 'solde'],
  slashData: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Affiche votre solde de crédits ou celui d’un autre membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à consulter').setRequired(false)),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const targetUser = ctx.isSlash ? interaction.options.getUser('membre') : null;
    const target = targetUser || ctx.author;
    const sym = config.currencySymbol;
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
  },
};

export const payCommand: Command = {
  name: 'pay',
  description: 'Transférer des crédits à un membre',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transférer des crédits à un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Destinataire').setRequired(true))
    .addIntegerOption((opt) => opt.setName('montant').setDescription('Montant à transférer').setMinValue(1).setRequired(true)),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(guildId, ctx.author.id, 'economy-pay', PAY_COOLDOWN_SECONDS, false);
    if (onCooldown) {
      await ctx.reply({ embeds: [ctx.createEmbed('warning').setDescription(`⏳ Merci de patienter encore ${remainingSeconds}s avant un nouveau transfert.`)], ephemeral: true });
      return;
    }
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const targetUser = interaction.options.getUser('membre', true);
    const amount = interaction.options.getInteger('montant', true);
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };
    const sym = config.currencySymbol;
    const result = economyService.transfer(guildId, me, { id: targetUser.id, username: targetUser.username, avatarUrl: targetUser.displayAvatarURL(), bot: targetUser.bot }, amount);
    const messages: Record<string, string> = {
      disabled: '⚪ Les transferts sont désactivés sur ce serveur.',
      self: '❌ Vous ne pouvez pas vous payer vous-même.',
      bot: '❌ Les bots n’ont pas de portefeuille.',
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
  },
};

export const gambleCommand: Command = {
  name: 'gamble',
  description: 'Tenter votre chance à pile ou face (double ou rien)',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Tenter votre chance à pile ou face (double ou rien)')
    .addIntegerOption((opt) => opt.setName('mise').setDescription('Montant à miser').setMinValue(1).setRequired(true)),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const bet = interaction.options.getInteger('mise', true);
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };
    const sym = config.currencySymbol;
    const result = economyService.gamble(guildId, me, bet);
    if (!result.ok) {
      if (result.reason === 'disabled') {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      } else if (result.reason === 'invalid_bet') {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`❌ Mise invalide (minimum : ${fmt(config.gambleMinBet, sym)}, maximum : ${fmt(config.gambleMaxBet, sym)}).`)], ephemeral: true });
      } else {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Solde insuffisant pour cette mise.')], ephemeral: true });
      }
      return;
    }
    if (result.won) {
      const card = container(toneToColor('success', ctx.guildConfig.successColor), [
        text(`## 🪙 Gagné ! (x${config.gambleWinMultiplier})`),
        text(`Vous remportez **+${fmt(result.payout, sym)}** !\nNouveau solde : **${fmt(result.balance, sym)}**`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
    } else {
      const card = container(toneToColor('error', ctx.guildConfig.errorColor), [
        text(`## 🎲 Perdu…`),
        text(`Vous perdez votre mise de **${fmt(result.amount, sym)}**.\nNouveau solde : **${fmt(result.balance, sym)}**`),
      ]);
      await ctx.reply({ components: [card], componentsV2: true });
    }
  },
};

export const robCommand: Command = {
  name: 'rob',
  description: 'Tente de voler un membre (risqué : amende en cas d’échec)',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tente de dérober des crédits à un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Cible').setRequired(true)),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('⚪ L’économie est désactivée sur ce serveur.')], ephemeral: true });
      return;
    }
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const targetUser = interaction.options.getUser('membre', true);
    const me = { id: ctx.author.id, username: ctx.author.username, avatarUrl: ctx.author.displayAvatarURL() };
    const sym = config.currencySymbol;
    const result = economyService.rob(guildId, me, { id: targetUser.id, username: targetUser.username, avatarUrl: targetUser.displayAvatarURL(), bot: targetUser.bot });
    if (!result.ok) {
      const messages: Record<string, string> = {
        disabled: '⚪ Le vol est désactivé sur ce serveur.',
        self: '❌ Tu ne peux pas te voler toi-même.',
        bot: '❌ Les bots n’ont pas de portefeuille.',
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
  },
};

export const shopCommand: Command = {
  name: 'shop',
  description: 'Affiche la boutique de rôles',
  category: 'Économie',
  slashData: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Consulter les rôles disponibles à l’achat'),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const config = economyStorage.getConfig(guildId);
    const sym = config.currencySymbol;
    const items = economyStorage.getShopItems(guildId).filter((i) => i.enabled);
    if (items.length === 0) {
      await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('La boutique est vide pour le moment.')] });
      return;
    }
    const lines = items.map(
      (item) => `• **${item.label}** — <@&${item.roleId}>\nPrix : **${fmt(item.price, sym)}** · \`/economy buy ${item.id}\``
    );
    const card = container(toneToColor('primary', ctx.guildConfig.primaryColor), [
      text(`## 🛍️ Boutique de rôles — ${config.currencyName}`),
      separator(),
      text(lines.join('\n\n')),
      separator(),
      footer('Utilise /economy buy <id> ou clique sur les boutons pour acheter'),
    ]);
    await ctx.reply({ components: [card], componentsV2: true });
  },
};
