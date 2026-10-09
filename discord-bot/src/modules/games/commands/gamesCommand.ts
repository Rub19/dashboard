import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { gamesService } from '../services/gamesService.js';
import { gamesStorage } from '../storage/gamesStorage.js';
import { getAppEmoji } from '../../../services/appEmojis.js';

export const blackjackCommand: Command = {
  name: 'blackjack',
  description: 'Jouer une partie de Blackjack 21 contre le croupier avec cartes interactives',
  category: 'Jeux & Casino',
  aliases: ['bj', '21'],
  slashData: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Jouer une partie de Blackjack 21 contre le croupier (Ethone Coins)')
    .addIntegerOption((opt) =>
      opt
        .setName('mise')
        .setDescription('Mise en Ethone Coins (ex: 50 🪙)')
        .setRequired(false)
        .setMinValue(1)
    ) as SlashCommandBuilder,
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId || !ctx.channel) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être exécutée dans un salon de serveur.')] });
      return;
    }

    const bet = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as ChatInputCommandInteraction).options.getInteger('mise') || 50
      : Number(ctx.args[0]) || 50;

    const res = await gamesService.startBlackjack(
      ctx.guildId,
      ctx.channel.id,
      ctx.author,
      bet
    );

    if (res.error) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${res.error}`)], ephemeral: true });
    }
  },
};

export const rouletteCommand: Command = {
  name: 'roulette',
  description: 'Miser sur la Roulette Royale (couleur, parité, douzaine ou numéro plein x36)',
  category: 'Jeux & Casino',
  aliases: ['roul'],
  slashData: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Placer une mise en Ethone Coins sur la Roulette Royale')
    .addIntegerOption((opt) =>
      opt
        .setName('mise')
        .setDescription('Montant en Ethone Coins à miser')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((opt) =>
      opt
        .setName('choix')
        .setDescription('Votre pari')
        .setRequired(true)
        .addChoices(
          { name: '🔴 Rouge (x2)', value: 'rouge' },
          { name: '⚫ Noir (x2)', value: 'noir' },
          { name: '⚖️ Pair (x2)', value: 'pair' },
          { name: '🎲 Impair (x2)', value: 'impair' },
          { name: '1️⃣ Première douzaine [1-12] (x3)', value: '1-12' },
          { name: '2️⃣ Deuxième douzaine [13-24] (x3)', value: '13-24' },
          { name: '3️⃣ Troisième douzaine [25-36] (x3)', value: '25-36' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('numero')
        .setDescription('Pari sur un numéro précis 0-36 (Rapport x36 !)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(36)
    ) as SlashCommandBuilder,
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être exécutée dans un serveur.')] });
      return;
    }

    let bet = 50;
    let choice: any = 'rouge';

    if (ctx.isSlash && ctx.interaction) {
      const interaction = ctx.interaction as ChatInputCommandInteraction;
      bet = interaction.options.getInteger('mise', true);
      const num = interaction.options.getInteger('numero');
      choice = num !== null ? num : (interaction.options.getString('choix', true) as any);
    } else {
      bet = Number(ctx.args[0]) || 50;
      choice = ctx.args[1] || 'rouge';
      if (!isNaN(Number(choice))) choice = Number(choice);
    }

    const res = await gamesService.playRoulette(ctx.guildId, ctx.author, bet, choice);
    if (res.error) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${res.error}`)], ephemeral: true });
      return;
    }

    if (res.resultEmbed) {
      await ctx.reply({ embeds: [res.resultEmbed] });
    }
  },
};

export const diceCommand: Command = {
  name: 'dice',
  description: 'Lancer un duel de dés 2d6 PvP contre un autre membre ou contre la banque',
  category: 'Jeux & Casino',
  aliases: ['des', 'duel'],
  slashData: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Lancer un duel de dés 2d6 en Ethone Coins contre un membre')
    .addIntegerOption((opt) =>
      opt
        .setName('mise')
        .setDescription('Mise en Ethone Coins par joueur (ex: 100 🪙)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addUserOption((opt) =>
      opt
        .setName('adversaire')
        .setDescription('Membre du serveur à défier en duel')
        .setRequired(true)
    ) as SlashCommandBuilder,
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId || !ctx.channel) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être exécutée dans un salon de serveur.')] });
      return;
    }

    if (!ctx.isSlash || !ctx.interaction) {
      await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('Cette commande est disponible via la commande slash `/dice mise adversaire`.')] });
      return;
    }

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const bet = interaction.options.getInteger('mise', true);
    const opponent = interaction.options.getUser('adversaire', true);

    const res = await gamesService.challengeDiceDuel(
      ctx.guildId,
      ctx.channel.id,
      ctx.author,
      opponent,
      bet
    );

    if (res.error) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${res.error}`)], ephemeral: true });
    } else {
      await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(`Défi envoyé à <@${opponent.id}> !`)], ephemeral: true });
    }
  },
};

export const casinoCommand: Command = {
  name: 'casino',
  description: 'Consulter la cagnotte du jackpot, tourner la roue quotidienne et voir les stats',
  category: 'Jeux & Casino',
  aliases: ['games'],
  slashData: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Centre du Casino ETHONE : Jackpot, Roue quotidienne et classements')
    .addSubcommand((sub) =>
      sub
        .setName('jackpot')
        .setDescription('Afficher la cagnotte progressive actuelle du serveur en Ethone Coins')
    )
    .addSubcommand((sub) =>
      sub
        .setName('daily')
        .setDescription('Tourner la roue de la fortune quotidienne pour remporter des Ethone Coins')
    )
    .addSubcommand((sub) =>
      sub
        .setName('top')
        .setDescription('Afficher le classement des plus grands gagnants du casino')
    )
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription("Afficher les statistiques complètes de l'arène des jeux")
    ) as SlashCommandBuilder,
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être exécutée dans un serveur.')] });
      return;
    }

    const sub = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as ChatInputCommandInteraction).options.getSubcommand()
      : ctx.args[0] || 'jackpot';

    const sparkles = getAppEmoji('etho_a_sparkles') || '✨';
    const { name: currencyName, symbol: currencySymbol } = gamesService.getCurrency(ctx.guildId);

    if (sub === 'daily') {
      const res = await gamesService.dailySpin(ctx.guildId, ctx.author);
      if (!res.ok) {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(`${res.message}`)], ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Roue de la Fortune · ${ctx.author.username} · Ethone Coin`, iconURL: ctx.author.displayAvatarURL() })
        .setTitle(res.isJackpot ? `🎰 JACKPOT HISTORIQUE !` : `🎡 Roue quotidienne tournée !`)
        .setColor(res.isJackpot ? 0xf59e0b : 0x10b981)
        .setDescription(
          `Félicitations <@${ctx.author.id}> !\n\n` +
          `Vous avez remporté **${res.prize?.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName}** !\n` +
          `Votre nouveau solde : **${gamesService.getBalance(ctx.guildId, ctx.author.id, ctx.author.username).toLocaleString('fr-FR')}** ${currencySymbol}`
        )
        .setFooter({ text: 'Revenez dans 24 heures pour un nouveau tirage gratuit ! • Portefeuille Ethone Coin' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'jackpot') {
      const jackpot = gamesStorage.getJackpot(ctx.guildId);
      const embed = new EmbedBuilder()
        .setTitle(`${sparkles} CAGNOTTE PROGRESSIVE DU CASINO`)
        .setColor(0xf59e0b)
        .setDescription(
          `La cagnotte actuelle s'élève à :\n` +
          `# 💰 **${jackpot.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName}**\n\n` +
          `**Comment la décrocher ?**\n` +
          `• Tournez la Roue Quotidienne avec \`/casino daily\` (2% de chance de remporter 20% du pactole) !\n` +
          `• 2% de chaque mise de Blackjack, Roulette et 5% des duels de dés alimentent en continu cette cagnotte.\n` +
          `• Gagnez des ${currencyName} gratuitement avec \`/daily\` et \`/work\` !`
        )
        .setFooter({ text: 'ETHONE Casino Engine · Alimentation continue 24/7 • Système Ethone Coin' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'top') {
      const overview = gamesStorage.getOverview(ctx.guildId);
      const embed = new EmbedBuilder()
        .setTitle(`🏆 TOP GAGNANTS DU CASINO`)
        .setColor(0x3b82f6)
        .setDescription(
          overview.topWinners.length > 0
            ? overview.topWinners
                .map((w, idx) => `**${idx + 1}.** **${w.username}** — +**${w.totalWon.toLocaleString('fr-FR')}** ${currencySymbol} (*${w.gamesPlayed} parties*)`)
                .join('\n')
            : 'Aucun gagnant enregistré pour le moment. Soyez le premier en jouant à `/blackjack` ou `/roulette` !'
        )
        .setFooter({ text: `Module Économie & Casino Ethone Coin` })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'stats') {
      const overview = gamesStorage.getOverview(ctx.guildId);
      const embed = new EmbedBuilder()
        .setTitle(`📊 STATISTIQUES DU CASINO`)
        .setColor(0x8b5cf6)
        .addFields(
          { name: '💰 Cagnotte Jackpot', value: `${overview.jackpotPool.toLocaleString('fr-FR')} ${currencySymbol}`, inline: true },
          { name: '🎲 Parties jouées', value: `${overview.totalGamesPlayed.toLocaleString('fr-FR')}`, inline: true },
          { name: '🪙 Total des mises', value: `${overview.totalBets.toLocaleString('fr-FR')} ${currencySymbol}`, inline: true },
          { name: '💸 Total reversé', value: `${overview.totalPayouts.toLocaleString('fr-FR')} ${currencySymbol}`, inline: true },
          {
            name: '🌟 Plus gros gain',
            value: overview.biggestWin
              ? `**${overview.biggestWin.username}** avec +**${overview.biggestWin.amount.toLocaleString('fr-FR')}** ${currencySymbol} (*${overview.biggestWin.game}*)`
              : 'Aucun',
            inline: false,
          }
        )
        .setFooter({ text: `Système Monétaire Ethone Coin` })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    }
  },
};
