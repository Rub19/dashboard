import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  TextChannel,
  User,
} from 'discord.js';
import { gamesStorage } from '../storage/gamesStorage.js';
import {
  BlackjackGame,
  BlackjackHand,
  DiceDuel,
  GameRecord,
} from '../types/games.js';
import { economyStorage } from '../../economy/storage/economyStorage.js';
import { logger } from '../../../utils/logger.js';
import { getAppEmoji } from '../../../services/appEmojis.js';

const SUITS = ['♠', '♥', '♦', '♣'] as const;
const VALUES = [
  { val: '2', num: 2 },
  { val: '3', num: 3 },
  { val: '4', num: 4 },
  { val: '5', num: 5 },
  { val: '6', num: 6 },
  { val: '7', num: 7 },
  { val: '8', num: 8 },
  { val: '9', num: 9 },
  { val: '10', num: 10 },
  { val: 'J', num: 10 },
  { val: 'Q', num: 10 },
  { val: 'K', num: 10 },
  { val: 'A', num: 11 },
];

const ROULETTE_RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

class GamesService {
  private client: Client | null = null;
  private activeBlackjackGames = new Map<string, BlackjackGame>(); // messageId or gameId -> game
  private activeDuels = new Map<string, DiceDuel>(); // duelId -> duel
  private userCooldowns = new Map<string, number>(); // userId -> timestamp

  public init(client: Client) {
    this.client = client;
    this.setupButtonListener();
    logger.info('[Games] Module Mini-Jeux & Casino Communautaire initialisé avec succès');
  }

  private setupButtonListener() {
    if (!this.client) return;
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      const [prefix, action, gameId] = interaction.customId.split(':');
      if (prefix === 'bj') {
        await this.handleBlackjackButton(interaction, action, gameId);
      } else if (prefix === 'dice') {
        await this.handleDiceDuelButton(interaction, action, gameId);
      }
    });
  }

  // --- LOGIQUE ÉCONOMIE INTÉGRÉE (ETHONE COIN) ---
  public getCurrency(guildId: string): { name: string; symbol: string } {
    const config = economyStorage.getConfig(guildId);
    return {
      name: config.currencyName || 'Ethone Coins',
      symbol: config.currencySymbol || '🪙',
    };
  }

  public fmt(amount: number, guildId: string): string {
    const { name, symbol } = this.getCurrency(guildId);
    return `${amount.toLocaleString('fr-FR')} ${symbol} ${name}`;
  }

  public getBalance(guildId: string, userId: string, username: string): number {
    const wallet = economyStorage.getWallet(guildId, userId, { username });
    return wallet.balance;
  }

  public deductBalance(guildId: string, userId: string, username: string, amount: number, reason: string): boolean {
    const current = this.getBalance(guildId, userId, username);
    if (current < amount) return false;
    const wallet = economyStorage.applyDelta(guildId, userId, -amount, { username, trackSpent: true });
    economyStorage.recordTransaction(guildId, userId, 'gamble_loss', amount, wallet.balance, { note: reason });
    return true;
  }

  public addBalance(guildId: string, userId: string, username: string, amount: number, reason: string): void {
    const wallet = economyStorage.applyDelta(guildId, userId, amount, { username, trackEarned: true });
    economyStorage.recordTransaction(guildId, userId, 'gamble_win', amount, wallet.balance, { note: reason });
  }

  // --- BLACKJACK 21 ---
  private createDeck() {
    const deck: Array<{ suit: '♠' | '♥' | '♦' | '♣'; value: string; num: number }> = [];
    for (const suit of SUITS) {
      for (const v of VALUES) {
        deck.push({ suit, value: v.val, num: v.num });
      }
    }
    // Mélange de Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private calculateHandScore(cards: Array<{ suit: string; value: string; num: number }>): { score: number; isBlackjack: boolean; isBusted: boolean } {
    let score = 0;
    let aces = 0;

    for (const c of cards) {
      score += c.num;
      if (c.value === 'A') aces += 1;
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return {
      score,
      isBlackjack: cards.length === 2 && score === 21,
      isBusted: score > 21,
    };
  }

  private formatCards(cards: Array<{ suit: string; value: string }>): string {
    return cards.map((c) => `\`[${c.suit} ${c.value}]\``).join(' ');
  }

  public async startBlackjack(
    guildId: string,
    channelId: string,
    user: User,
    bet: number
  ): Promise<{ error?: string; messageId?: string }> {
    const config = gamesStorage.getConfig(guildId);
    if (!config.enabled || !config.blackjackEnabled) {
      return { error: "Le Blackjack n'est pas activé sur ce serveur." };
    }

    const { name: currencyName, symbol: currencySymbol } = this.getCurrency(guildId);

    if (bet < config.minBet || bet > config.maxBet) {
      return { error: `La mise doit être comprise entre **${config.minBet}** et **${config.maxBet.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName}.` };
    }

    const currentBal = this.getBalance(guildId, user.id, user.username);
    const deducted = this.deductBalance(guildId, user.id, user.username, bet, `[Ethone Casino] Blackjack: mise de ${bet} ${currencySymbol}`);
    if (!deducted) {
      return { error: `Fonds insuffisants en ${currencyName} ! Votre solde actuel est de **${currentBal.toLocaleString('fr-FR')}** ${currencySymbol}. Vous avez besoin de **${bet.toLocaleString('fr-FR')}** ${currencySymbol}. (Tapez \`/daily\` ou \`/work\` pour en obtenir !)` };
    }

    // Alimentation de la cagnotte Jackpot en Ethone Coins
    const jackpotContrib = Math.max(1, Math.round((bet * (config.jackpotContributionPercent || 2)) / 100));
    gamesStorage.addToJackpot(guildId, jackpotContrib);

    const deck = this.createDeck();
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, deck.pop()!];

    const pHand = this.calculateHandScore(playerCards);
    const dHand = this.calculateHandScore(dealerCards);

    const gameId = `bj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const game: BlackjackGame = {
      id: gameId,
      guildId,
      userId: user.id,
      username: user.username,
      channelId,
      messageId: '',
      bet,
      deck,
      playerHand: { cards: playerCards, ...pHand },
      dealerHand: { cards: dealerCards, ...dHand },
      status: 'playing',
      payout: 0,
      createdAt: Date.now(),
    };

    // Cas de Blackjack naturel dès le début
    if (pHand.isBlackjack) {
      if (dHand.isBlackjack) {
        game.status = 'push';
        game.payout = bet;
        this.addBalance(guildId, user.id, user.username, bet, `[Ethone Casino] Blackjack: égalité naturelle (+${bet} ${currencySymbol})`);
      } else {
        game.status = 'blackjack';
        game.payout = Math.round(bet * 2.5);
        this.addBalance(guildId, user.id, user.username, game.payout, `[Ethone Casino] Blackjack naturel 3:2 (+${game.payout} ${currencySymbol})`);
      }
    }

    const embed = this.buildBlackjackEmbed(game, user, game.status !== 'playing');
    const row = this.buildBlackjackControls(game);

    if (!this.client) return { error: 'Client Discord indisponible' };
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) return { error: 'Salon introuvable' };

    const msg = await channel.send({
      embeds: [embed],
      components: row ? [row] : [],
    });

    game.messageId = msg.id;
    if (game.status === 'playing') {
      this.activeBlackjackGames.set(gameId, game);
      this.activeBlackjackGames.set(msg.id, game);
    } else {
      // Enregistre direct dans l'historique
      gamesStorage.recordGame(guildId, {
        guildId,
        userId: user.id,
        username: user.username,
        gameType: 'blackjack',
        bet,
        payout: game.payout,
        net: game.payout - bet,
        won: game.payout > bet,
        detail: game.status === 'blackjack' ? 'Blackjack Naturel 21 (Gain 3:2)' : 'Égalité (Mise remboursée)',
      });
    }

    return { messageId: msg.id };
  }

  private buildBlackjackEmbed(game: BlackjackGame, user: User, isGameOver: boolean): EmbedBuilder {
    const sparkles = getAppEmoji('etho_a_sparkles') || '✨';
    const { name: currencyName, symbol: currencySymbol } = this.getCurrency(game.guildId);
    const userWallet = economyStorage.getWallet(game.guildId, game.userId, { username: game.username });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Table de Blackjack 21 · ${game.username} · Ethone Coin System`,
        iconURL: user.displayAvatarURL(),
      })
      .setTimestamp();

    if (!isGameOver) {
      embed.setColor(0x3b82f6);
      embed.setDescription(
        `Mise en jeu : **${game.bet.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName}\n` +
        `Prenez une décision pour battre le croupier sans dépasser 21 !`
      );
      embed.addFields(
        {
          name: `🃏 Votre main (${game.playerHand.score})`,
          value: this.formatCards(game.playerHand.cards),
          inline: true,
        },
        {
          name: `🏦 Croupier (? + ${game.dealerHand.cards[0].num})`,
          value: `\`[${game.dealerHand.cards[0].suit} ${game.dealerHand.cards[0].value}]\` \`[❓ Cachée]\``,
          inline: true,
        }
      );
      embed.setFooter({
        text: `Solde actuel : ${userWallet.balance.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName} • ETHONE Economy`,
      });
    } else {
      let title = '';
      if (game.status === 'blackjack') {
        embed.setColor(0xf59e0b);
        title = `${sparkles} BLACKJACK NATUREL ! (+${(game.payout - game.bet).toLocaleString('fr-FR')} ${currencySymbol})`;
      } else if (game.status === 'player_win' || game.status === 'dealer_bust') {
        embed.setColor(0x10b981);
        title = `🎉 VICTOIRE ! (+${(game.payout - game.bet).toLocaleString('fr-FR')} ${currencySymbol})`;
      } else if (game.status === 'push') {
        embed.setColor(0x64748b);
        title = `🤝 ÉGALITÉ (Mise de ${game.bet.toLocaleString('fr-FR')} ${currencySymbol} remboursée)`;
      } else {
        embed.setColor(0xef4444);
        title = game.status === 'player_bust' ? `💥 BUST ! (> 21)` : `💀 DÉFAITE contre le croupier`;
      }

      embed.setTitle(title);
      embed.setDescription(`Résultat final de la manche :`);
      embed.addFields(
        {
          name: `🃏 Votre main (${game.playerHand.score})`,
          value: this.formatCards(game.playerHand.cards),
          inline: true,
        },
        {
          name: `🏦 Croupier (${game.dealerHand.score})`,
          value: this.formatCards(game.dealerHand.cards),
          inline: true,
        }
      );
      embed.setFooter({
        text: `Solde restant : ${userWallet.balance.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName} • Système Économie Ethone Coin`,
      });
    }

    return embed;
  }

  private buildBlackjackControls(game: BlackjackGame): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
    if (game.status !== 'playing') return null;

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`bj:hit:${game.id}`)
        .setLabel('🃏 Tirer (Hit)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bj:stand:${game.id}`)
        .setLabel('🛑 Rester (Stand)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bj:double:${game.id}`)
        .setLabel('💰 Doubler (Double)')
        .setStyle(ButtonStyle.Success)
        .setDisabled(game.playerHand.cards.length !== 2)
    );

    return row;
  }

  private async handleBlackjackButton(interaction: ButtonInteraction, action: string, gameId: string) {
    const game = this.activeBlackjackGames.get(gameId);
    if (!game) {
      await interaction.reply({ content: 'Partie introuvable ou déjà terminée.', ephemeral: true });
      return;
    }

    if (interaction.user.id !== game.userId) {
      await interaction.reply({ content: "Vous n'êtes pas le joueur de cette table !", ephemeral: true });
      return;
    }

    if (action === 'hit') {
      const card = game.deck.pop()!;
      game.playerHand.cards.push(card);
      const score = this.calculateHandScore(game.playerHand.cards);
      game.playerHand.score = score.score;
      game.playerHand.isBusted = score.isBusted;

      if (score.isBusted) {
        game.status = 'player_bust';
        game.payout = 0;
        this.activeBlackjackGames.delete(game.id);
        this.activeBlackjackGames.delete(game.messageId);

        gamesStorage.recordGame(game.guildId, {
          guildId: game.guildId,
          userId: game.userId,
          username: game.username,
          gameType: 'blackjack',
          bet: game.bet,
          payout: 0,
          net: -game.bet,
          won: false,
          detail: `Bust (${game.playerHand.score} vs Croupier)`,
        });
      }

      const embed = this.buildBlackjackEmbed(game, interaction.user, game.status !== 'playing');
      const row = this.buildBlackjackControls(game);

      await interaction.update({
        embeds: [embed],
        components: row ? [row] : [],
      });
    } else if (action === 'stand') {
      await this.resolveDealerAndFinish(interaction, game);
    } else if (action === 'double') {
      const { name: currencyName, symbol: currencySymbol } = this.getCurrency(game.guildId);
      const deducted = this.deductBalance(game.guildId, game.userId, game.username, game.bet, `[Ethone Casino] Blackjack: doubler la mise (${game.bet} ${currencySymbol})`);
      if (!deducted) {
        await interaction.reply({ content: `Fonds insuffisants en ${currencyName} pour doubler votre mise !`, ephemeral: true });
        return;
      }
      game.bet *= 2;
      const card = game.deck.pop()!;
      game.playerHand.cards.push(card);
      const score = this.calculateHandScore(game.playerHand.cards);
      game.playerHand.score = score.score;
      game.playerHand.isBusted = score.isBusted;

      if (score.isBusted) {
        game.status = 'player_bust';
        game.payout = 0;
        this.activeBlackjackGames.delete(game.id);
        this.activeBlackjackGames.delete(game.messageId);

        gamesStorage.recordGame(game.guildId, {
          guildId: game.guildId,
          userId: game.userId,
          username: game.username,
          gameType: 'blackjack',
          bet: game.bet,
          payout: 0,
          net: -game.bet,
          won: false,
          detail: `Bust sur Double (${game.playerHand.score} vs Croupier)`,
        });

        const embed = this.buildBlackjackEmbed(game, interaction.user, true);
        await interaction.update({ embeds: [embed], components: [] });
      } else {
        await this.resolveDealerAndFinish(interaction, game);
      }
    }
  }

  private async resolveDealerAndFinish(interaction: ButtonInteraction, game: BlackjackGame) {
    // Le croupier tire jusqu'à avoir au moins 17
    while (game.dealerHand.score < 17) {
      const c = game.deck.pop()!;
      game.dealerHand.cards.push(c);
      const dScore = this.calculateHandScore(game.dealerHand.cards);
      game.dealerHand.score = dScore.score;
      game.dealerHand.isBusted = dScore.isBusted;
    }

    const { symbol: currencySymbol } = this.getCurrency(game.guildId);
    if (game.dealerHand.isBusted) {
      game.status = 'dealer_bust';
      game.payout = game.bet * 2;
      this.addBalance(game.guildId, game.userId, game.username, game.payout, `[Ethone Casino] Blackjack: Croupier bust (+${game.payout} ${currencySymbol})`);
    } else if (game.playerHand.score > game.dealerHand.score) {
      game.status = 'player_win';
      game.payout = game.bet * 2;
      this.addBalance(game.guildId, game.userId, game.username, game.payout, `[Ethone Casino] Blackjack: Victoire (+${game.payout} ${currencySymbol})`);
    } else if (game.playerHand.score === game.dealerHand.score) {
      game.status = 'push';
      game.payout = game.bet;
      this.addBalance(game.guildId, game.userId, game.username, game.bet, `[Ethone Casino] Blackjack: Égalité push (+${game.payout} ${currencySymbol})`);
    } else {
      game.status = 'dealer_win';
      game.payout = 0;
    }

    this.activeBlackjackGames.delete(game.id);
    this.activeBlackjackGames.delete(game.messageId);

    gamesStorage.recordGame(game.guildId, {
      guildId: game.guildId,
      userId: game.userId,
      username: game.username,
      gameType: 'blackjack',
      bet: game.bet,
      payout: game.payout,
      net: game.payout - game.bet,
      won: game.payout > game.bet,
      detail: `${game.playerHand.score} vs ${game.dealerHand.score} (${game.status})`,
    });

    const embed = this.buildBlackjackEmbed(game, interaction.user, true);
    await interaction.update({
      embeds: [embed],
      components: [],
    });
  }

  // --- ROULETTE ROYALE ---
  public async playRoulette(
    guildId: string,
    user: User,
    bet: number,
    betChoice: 'rouge' | 'noir' | 'pair' | 'impair' | '1-12' | '13-24' | '25-36' | number
  ): Promise<{ error?: string; resultEmbed?: EmbedBuilder }> {
    const config = gamesStorage.getConfig(guildId);
    if (!config.enabled || !config.rouletteEnabled) {
      return { error: "La Roulette Royale n'est pas activée sur ce serveur." };
    }

    const { name: currencyName, symbol: currencySymbol } = this.getCurrency(guildId);

    if (bet < config.minBet || bet > config.maxBet) {
      return { error: `La mise doit être comprise entre **${config.minBet}** et **${config.maxBet.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName}.` };
    }

    const currentBal = this.getBalance(guildId, user.id, user.username);
    const deducted = this.deductBalance(guildId, user.id, user.username, bet, `[Ethone Casino] Roulette: mise sur ${betChoice} (${bet} ${currencySymbol})`);
    if (!deducted) {
      return { error: `Fonds insuffisants en ${currencyName} ! Votre solde est de **${currentBal.toLocaleString('fr-FR')}** ${currencySymbol}. Il vous manque **${(bet - currentBal).toLocaleString('fr-FR')}** ${currencySymbol}. (Tapez \`/daily\` pour recharger !)` };
    }

    // Contribution continue à la cagnotte Jackpot en Ethone Coins
    const jackpotContrib = Math.max(1, Math.round((bet * (config.jackpotContributionPercent || 2)) / 100));
    gamesStorage.addToJackpot(guildId, jackpotContrib);

    // Tirage de la bille (0 à 36)
    const rolledNumber = Math.floor(Math.random() * 37);
    const isGreen = rolledNumber === 0;
    const isRed = !isGreen && ROULETTE_RED_NUMBERS.includes(rolledNumber);
    const isBlack = !isGreen && !isRed;
    const isEven = !isGreen && rolledNumber % 2 === 0;

    let won = false;
    let multiplier = 0;

    if (typeof betChoice === 'number') {
      if (rolledNumber === betChoice) {
        won = true;
        multiplier = 36;
      }
    } else if (betChoice === 'rouge' && isRed) {
      won = true;
      multiplier = 2;
    } else if (betChoice === 'noir' && isBlack) {
      won = true;
      multiplier = 2;
    } else if (betChoice === 'pair' && isEven) {
      won = true;
      multiplier = 2;
    } else if (betChoice === 'impair' && !isEven && !isGreen) {
      won = true;
      multiplier = 2;
    } else if (betChoice === '1-12' && rolledNumber >= 1 && rolledNumber <= 12) {
      won = true;
      multiplier = 3;
    } else if (betChoice === '13-24' && rolledNumber >= 13 && rolledNumber <= 24) {
      won = true;
      multiplier = 3;
    } else if (betChoice === '25-36' && rolledNumber >= 25 && rolledNumber <= 36) {
      won = true;
      multiplier = 3;
    }

    const payout = won ? bet * multiplier : 0;
    if (won) {
      this.addBalance(guildId, user.id, user.username, payout, `[Ethone Casino] Roulette: gain x${multiplier} (+${payout} ${currencySymbol})`);
    }

    const numberColorStr = isGreen ? '🟢 0 Vert' : isRed ? `🔴 ${rolledNumber} Rouge` : `⚫ ${rolledNumber} Noir`;
    const sparkles = getAppEmoji('etho_a_sparkles') || '✨';

    gamesStorage.recordGame(guildId, {
      guildId,
      userId: user.id,
      username: user.username,
      gameType: 'roulette',
      bet,
      payout,
      net: payout - bet,
      won,
      detail: `Numéro ${rolledNumber} (${betChoice})`,
    });

    const newBal = this.getBalance(guildId, user.id, user.username);
    const embed = new EmbedBuilder()
      .setAuthor({ name: `Roulette Royale · ${user.username} · Ethone Coin System`, iconURL: user.displayAvatarURL() })
      .setTitle(won ? `${sparkles} GAGNÉ ! (+${(payout - bet).toLocaleString('fr-FR')} ${currencySymbol} ${currencyName})` : `💥 PERDU ! (-${bet.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName})`)
      .setColor(won ? (isGreen ? 0x10b981 : isRed ? 0xef4444 : 0x0f172a) : 0x64748b)
      .setDescription(
        `La roue a tourné et la bille s'est arrêtée sur :\n` +
        `### **${numberColorStr}**\n\n` +
        `Votre pari : **${typeof betChoice === 'number' ? `Numéro plein [${betChoice}]` : String(betChoice).toUpperCase()}**\n` +
        `Multiplicateur : **${won ? `x${multiplier}` : 'x0'}**\n` +
        `Nouveau solde : **${newBal.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName}`
      )
      .setFooter({ text: `Cagnotte Jackpot : ${gamesStorage.getJackpot(guildId).toLocaleString('fr-FR')} ${currencySymbol} • Portefeuille Ethone Coin` })
      .setTimestamp();

    return { resultEmbed: embed };
  }

  // --- DUEL DE DÉS PVP ---
  public async challengeDiceDuel(
    guildId: string,
    channelId: string,
    challenger: User,
    opponent: User,
    bet: number
  ): Promise<{ error?: string; messageId?: string }> {
    const config = gamesStorage.getConfig(guildId);
    if (!config.enabled || !config.diceEnabled) {
      return { error: "Les duels de dés ne sont pas activés sur ce serveur." };
    }

    if (challenger.id === opponent.id) {
      return { error: 'Vous ne pouvez pas vous défier vous-même !' };
    }

    if (opponent.bot) {
      return { error: 'Vous ne pouvez pas défier un bot au duel de dés.' };
    }

    const { name: currencyName, symbol: currencySymbol } = this.getCurrency(guildId);

    if (bet < config.minBet || bet > config.maxBet) {
      return { error: `La mise de duel doit être comprise entre **${config.minBet}** et **${config.maxBet.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName}.` };
    }

    const cBalance = this.getBalance(guildId, challenger.id, challenger.username);
    if (cBalance < bet) {
      return { error: `Vous n'avez pas assez de ${currencyName} pour lancer ce duel (**${cBalance.toLocaleString('fr-FR')}** ${currencySymbol} disponible, **${bet.toLocaleString('fr-FR')}** requis).` };
    }

    const oBalance = this.getBalance(guildId, opponent.id, opponent.username);
    if (oBalance < bet) {
      return { error: `${opponent.username} n'a pas assez de ${currencyName} pour honorer cette mise (**${oBalance.toLocaleString('fr-FR')}** ${currencySymbol} disponible).` };
    }

    const duelId = `dice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duel: DiceDuel = {
      id: duelId,
      guildId,
      channelId,
      challengerId: challenger.id,
      challengerName: challenger.username,
      opponentId: opponent.id,
      opponentName: opponent.username,
      bet,
      status: 'pending',
      createdAt: Date.now(),
    };

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dice:accept:${duelId}`)
        .setLabel('⚔️ Accepter le duel')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`dice:decline:${duelId}`)
        .setLabel('❌ Refuser')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Défi Duel de Dés !`)
      .setColor(0xf97316)
      .setDescription(
        `<@${challenger.id}> défie <@${opponent.id}> en duel de dés !\n\n` +
        `💰 **Mise en jeu :** ${bet.toLocaleString('fr-FR')} ${currencySymbol} ${currencyName} chacun (Pot total : ${(bet * 2).toLocaleString('fr-FR')} ${currencySymbol})\n` +
        `🎯 **Règle :** Chaque joueur lance 2 dés (2d6). Le plus haut score remporte la mise !`
      )
      .setFooter({ text: 'Ce défi expire automatiquement dans 2 minutes • Portefeuille Ethone Coin' })
      .setTimestamp();

    if (!this.client) return { error: 'Client Discord indisponible' };
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) return { error: 'Salon introuvable' };

    const msg = await channel.send({
      content: `<@${opponent.id}>, vous avez reçu un défi !`,
      embeds: [embed],
      components: [row],
    });

    duel.messageId = msg.id;
    this.activeDuels.set(duelId, duel);

    return { messageId: msg.id };
  }

  private async handleDiceDuelButton(interaction: ButtonInteraction, action: string, duelId: string) {
    const duel = this.activeDuels.get(duelId);
    if (!duel || duel.status !== 'pending') {
      await interaction.reply({ content: 'Ce duel est expiré ou déjà terminé.', ephemeral: true });
      return;
    }

    if (interaction.user.id !== duel.opponentId && interaction.user.id !== duel.challengerId) {
      await interaction.reply({ content: "Vous n'êtes pas convié à ce duel !", ephemeral: true });
      return;
    }

    if (action === 'decline') {
      if (interaction.user.id !== duel.opponentId && interaction.user.id !== duel.challengerId) return;
      duel.status = 'declined';
      this.activeDuels.delete(duelId);
      await interaction.update({
        content: `❌ Le duel a été annulé par <@${interaction.user.id}>.`,
        components: [],
      });
      return;
    }

    if (action === 'accept') {
      if (interaction.user.id !== duel.opponentId) {
        await interaction.reply({ content: "Seul l'adversaire défié peut accepter ce duel !", ephemeral: true });
        return;
      }

      const { name: currencyName, symbol: currencySymbol } = this.getCurrency(duel.guildId);

      // Déduction chez les 2 joueurs
      const cDeduct = this.deductBalance(duel.guildId, duel.challengerId, duel.challengerName, duel.bet, `[Ethone Casino] Duel 2d6 contre ${duel.opponentName} (${duel.bet} ${currencySymbol})`);
      const oDeduct = this.deductBalance(duel.guildId, duel.opponentId, duel.opponentName, duel.bet, `[Ethone Casino] Duel 2d6 contre ${duel.challengerName} (${duel.bet} ${currencySymbol})`);

      if (!cDeduct || !oDeduct) {
        if (cDeduct) this.addBalance(duel.guildId, duel.challengerId, duel.challengerName, duel.bet, '[Ethone Casino] Remboursement duel');
        if (oDeduct) this.addBalance(duel.guildId, duel.opponentId, duel.opponentName, duel.bet, '[Ethone Casino] Remboursement duel');
        await interaction.reply({ content: `Un des joueurs n'a plus assez de ${currencyName} pour lancer le duel.`, ephemeral: true });
        return;
      }

      // Lancer de 2d6 chacun
      const cD1 = Math.floor(Math.random() * 6) + 1;
      const cD2 = Math.floor(Math.random() * 6) + 1;
      const cTotal = cD1 + cD2;

      const oD1 = Math.floor(Math.random() * 6) + 1;
      const oD2 = Math.floor(Math.random() * 6) + 1;
      const oTotal = oD1 + oD2;

      duel.status = 'completed';
      duel.challengerRoll = [cD1, cD2];
      duel.opponentRoll = [oD1, oD2];

      const pot = duel.bet * 2;
      const jackpotContribution = Math.round(pot * 0.05); // 5% rake vers le jackpot
      const winPayout = pot - jackpotContribution;
      gamesStorage.addToJackpot(duel.guildId, jackpotContribution);

      let resultText = '';
      if (cTotal > oTotal) {
        duel.winnerId = duel.challengerId;
        this.addBalance(duel.guildId, duel.challengerId, duel.challengerName, winPayout, `[Ethone Casino] Victoire duel de dés contre ${duel.opponentName} (+${winPayout} ${currencySymbol})`);
        resultText = `🏆 <@${duel.challengerId}> remporte le duel et empoche **${winPayout.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName} !`;
      } else if (oTotal > cTotal) {
        duel.winnerId = duel.opponentId;
        this.addBalance(duel.guildId, duel.opponentId, duel.opponentName, winPayout, `[Ethone Casino] Victoire duel de dés contre ${duel.challengerName} (+${winPayout} ${currencySymbol})`);
        resultText = `🏆 <@${duel.opponentId}> remporte le duel et empoche **${winPayout.toLocaleString('fr-FR')}** ${currencySymbol} ${currencyName} !`;
      } else {
        // Égalité : on rembourse
        this.addBalance(duel.guildId, duel.challengerId, duel.challengerName, duel.bet, `[Ethone Casino] Égalité duel de dés (remboursement ${duel.bet} ${currencySymbol})`);
        this.addBalance(duel.guildId, duel.opponentId, duel.opponentName, duel.bet, `[Ethone Casino] Égalité duel de dés (remboursement ${duel.bet} ${currencySymbol})`);
        resultText = `🤝 Égalité parfaite ! Chaque joueur récupère sa mise de **${duel.bet.toLocaleString('fr-FR')}** ${currencySymbol}.`;
      }

      this.activeDuels.delete(duelId);

      gamesStorage.recordGame(duel.guildId, {
        guildId: duel.guildId,
        userId: duel.winnerId || duel.challengerId,
        username: duel.winnerId === duel.challengerId ? duel.challengerName : duel.opponentName,
        gameType: 'dice',
        bet: duel.bet,
        payout: duel.winnerId ? winPayout : duel.bet,
        net: duel.winnerId ? winPayout - duel.bet : 0,
        won: Boolean(duel.winnerId),
        detail: `Duel: ${duel.challengerName} (${cTotal}) vs ${duel.opponentName} (${oTotal})`,
      });

      const embed = new EmbedBuilder()
        .setTitle('🎲 RÉSULTAT DU DUEL DE DÉS !')
        .setColor(duel.winnerId ? 0x10b981 : 0x64748b)
        .setDescription(
          `**${duel.challengerName}** a lancé : \`[${cD1}] + [${cD2}] = ${cTotal}\` 🎲\n` +
          `**${duel.opponentName}** a lancé : \`[${oD1}] + [${oD2}] = ${oTotal}\` 🎲\n\n` +
          `### ${resultText}`
        )
        .setFooter({ text: `5% (${jackpotContribution.toLocaleString('fr-FR')} ${currencySymbol}) reversés au Jackpot Ethone Coin.` })
        .setTimestamp();

      await interaction.update({
        content: null,
        embeds: [embed],
        components: [],
      });
    }
  }

  // --- ROUE DE LA FORTUNE QUOTIDIENNE (DAILY SPIN) ---
  public async dailySpin(guildId: string, user: User): Promise<{ ok: boolean; prize?: number; isJackpot?: boolean; message?: string }> {
    const config = gamesStorage.getConfig(guildId);
    if (!config.enabled || !config.dailySpinEnabled) {
      return { ok: false, message: "La Roue de la Fortune n'est pas activée sur ce serveur." };
    }

    const { name: currencyName, symbol: currencySymbol } = this.getCurrency(guildId);
    const key = `${guildId}:${user.id}:spin`;
    const last = this.userCooldowns.get(key) || 0;
    const now = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (now - last < cooldownMs) {
      const remainingHours = Math.ceil((cooldownMs - (now - last)) / (1000 * 60 * 60));
      return { ok: false, message: `Vous avez déjà tourné la roue aujourd'hui ! Revenez dans environ **${remainingHours}h**.` };
    }

    this.userCooldowns.set(key, now);

    // Tirage avec probabilités
    const rand = Math.random();
    let prize = 100;
    let isJackpot = false;

    if (rand < 0.02) {
      // 2% Jackpot partiel (20% de la cagnotte)
      const currentJackpot = gamesStorage.getJackpot(guildId);
      prize = Math.max(1000, Math.round(currentJackpot * 0.2));
      isJackpot = true;
    } else if (rand < 0.08) {
      prize = 2500;
    } else if (rand < 0.20) {
      prize = 1000;
    } else if (rand < 0.45) {
      prize = 500;
    } else if (rand < 0.75) {
      prize = 250;
    } else {
      prize = 100;
    }

    this.addBalance(guildId, user.id, user.username, prize, isJackpot ? `[Ethone Casino] Cagnotte Jackpot Daily Spin (+${prize} ${currencySymbol})` : `[Ethone Casino] Gain Daily Spin (+${prize} ${currencySymbol})`);

    gamesStorage.recordGame(guildId, {
      guildId,
      userId: user.id,
      username: user.username,
      gameType: 'spin',
      bet: 0,
      payout: prize,
      net: prize,
      won: true,
      detail: isJackpot ? `Jackpot Daily Spin (+${prize} ${currencySymbol})` : `Daily Spin (+${prize} ${currencySymbol})`,
    });

    return { ok: true, prize, isJackpot };
  }
}

export const gamesService = new GamesService();
