import { randomInt, randomUUID } from 'node:crypto';
import { gamesStorage } from '../storage/gamesStorage.js';
import { gamesService } from './gamesService.js';
import { economyStorage } from '../../economy/storage/economyStorage.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import type { GameRecord, GameType } from '../types/games.js';

/**
 * Casino du dashboard : le bot tire les cartes, la bille et les dés, et calcule le gain. Le navigateur n'envoie que
 * la mise et le choix du joueur, jamais le résultat (sinon n'importe qui pourrait se créditer des pièces).
 */

export type Card = { suit: '♠' | '♥' | '♦' | '♣'; value: string; num: number };
type Player = { guildId: string; userId: string; username: string };
export type CasinoError = { error: string; message: string; httpStatus: number };

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACKJACK_TTL_MS = 15 * 60_000;

function shuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, num: value === 'A' ? 11 : ['J', 'Q', 'K'].includes(value) ? 10 : Number(value) });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function handScore(cards: Card[]): number {
  let score = cards.reduce((s, c) => s + c.num, 0);
  let aces = cards.filter((c) => c.value === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

/** Vérifie que le jeu est ouvert et que la mise est un entier dans les limites et couvert par le solde. */
function checkBet(p: Player, gameType: GameType, rawBet: unknown, extra = 0): CasinoError | number {
  const config = gamesStorage.getConfig(p.guildId);
  const eco = economyStorage.getConfig(p.guildId);
  const enabledKey = { blackjack: 'blackjackEnabled', roulette: 'rouletteEnabled', dice: 'diceEnabled' }[gameType as string] as
    | 'blackjackEnabled'
    | 'rouletteEnabled'
    | 'diceEnabled'
    | undefined;
  if (!config.enabled || !eco.enabled || (enabledKey && !config[enabledKey])) {
    return { error: 'disabled', message: 'Ce jeu est désactivé sur ce serveur.', httpStatus: 403 };
  }
  const bet = Number(rawBet);
  if (!Number.isInteger(bet) || bet < config.minBet || bet > config.maxBet) {
    return { error: 'invalid_bet', message: `La mise doit être un nombre entier entre ${config.minBet} et ${config.maxBet}.`, httpStatus: 400 };
  }
  const balance = gamesService.getBalance(p.guildId, p.userId, p.username);
  if (balance < bet + extra) {
    const symbol = eco.currencySymbol || '🪙';
    return {
      error: 'insufficient_funds',
      message: `Solde insuffisant (${balance.toLocaleString('fr-FR')} ${symbol} disponible, ${(bet + extra).toLocaleString('fr-FR')} ${symbol} requis).`,
      httpStatus: 400,
    };
  }
  return bet;
}

/** Prélève la mise et la part de cagnotte. */
function takeBet(p: Player, gameType: GameType, bet: number): void {
  gamesService.deductBalance(p.guildId, p.userId, p.username, bet, `[Casino Web] ${gameType.toUpperCase()} : mise`);
  const config = gamesStorage.getConfig(p.guildId);
  gamesStorage.addToJackpot(p.guildId, Math.max(1, Math.round((bet * (config.jackpotContributionPercent || 2)) / 100)));
}

/** Verse le gain (0 si perdu), enregistre la partie et prévient le dashboard en direct. */
function settle(p: Player, gameType: GameType, bet: number, payout: number, detail: string) {
  if (payout > 0) {
    gamesService.addBalance(p.guildId, p.userId, p.username, payout, `[Casino Web] ${gameType.toUpperCase()} : ${detail}`);
  }
  const record: GameRecord = gamesStorage.recordGame(p.guildId, {
    guildId: p.guildId,
    userId: p.userId,
    username: p.username,
    gameType,
    bet,
    payout,
    net: payout - bet,
    won: payout > bet,
    detail,
  });
  const newBalance = gamesService.getBalance(p.guildId, p.userId, p.username);
  const jackpotPool = gamesStorage.getJackpot(p.guildId);
  emitConfigUpdated('games', p.guildId, { action: 'game_played', record, jackpotPool }, 'DASHBOARD', p.userId);
  emitConfigUpdated('economy', p.guildId, { action: 'balance_updated', userId: p.userId, newBalance }, 'DASHBOARD', p.userId);
  return { record, newBalance, jackpotPool, payout, net: payout - bet };
}

// --- Roulette ---------------------------------------------------------------

export function playRoulette(p: Player, rawBet: unknown, rawChoice: unknown) {
  const choice = String(rawChoice ?? '');
  const isNumber = /^\d{1,2}$/.test(choice) && Number(choice) <= 36;
  if (!['rouge', 'noir', 'pair', 'impair'].includes(choice) && !isNumber) {
    return { error: 'invalid_choice', message: 'Choix de roulette invalide.', httpStatus: 400 } as CasinoError;
  }
  const bet = checkBet(p, 'roulette', rawBet);
  if (typeof bet !== 'number') return bet;
  takeBet(p, 'roulette', bet);

  const number = randomInt(37);
  const color: 'rouge' | 'noir' | 'vert' = number === 0 ? 'vert' : RED_NUMBERS.has(number) ? 'rouge' : 'noir';
  const multiplier =
    (choice === 'rouge' && color === 'rouge') ||
    (choice === 'noir' && color === 'noir') ||
    (choice === 'pair' && number > 0 && number % 2 === 0) ||
    (choice === 'impair' && number % 2 === 1)
      ? 2
      : isNumber && Number(choice) === number
        ? 36
        : 0;
  const result = settle(p, 'roulette', bet, bet * multiplier, `Roulette : ${color.toUpperCase()} n°${number}${multiplier ? ` (x${multiplier})` : ''}`);
  return { ...result, number, color, multiplier };
}

// --- Dés ----------------------------------------------------------------------

export function playDice(p: Player, rawBet: unknown) {
  const bet = checkBet(p, 'dice', rawBet);
  if (typeof bet !== 'number') return bet;
  takeBet(p, 'dice', bet);

  const player: [number, number] = [randomInt(1, 7), randomInt(1, 7)];
  const house: [number, number] = [randomInt(1, 7), randomInt(1, 7)];
  const a = player[0] + player[1];
  const b = house[0] + house[1];
  const payout = a > b ? bet * 2 : a === b ? bet : 0;
  const detail = a > b ? `Duel gagné ${a} contre ${b}` : a === b ? `Égalité ${a} partout` : `Duel perdu ${a} contre ${b}`;
  return { ...settle(p, 'dice', bet, payout, detail), player, house };
}

// --- Blackjack ------------------------------------------------------------------

type BlackjackSession = Player & {
  id: string;
  bet: number;
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  expiresAt: number;
};

// ponytail: sessions en mémoire, une main en cours est perdue (mise comprise) si le bot redémarre ; à persister si ça gêne.
const sessions = new Map<string, BlackjackSession>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, s] of sessions) if (s.expiresAt < now) sessions.delete(id);
}

function view(s: BlackjackSession, status: 'playing' | 'won' | 'lost' | 'push' | 'blackjack', settled?: ReturnType<typeof settle>) {
  const over = status !== 'playing';
  return {
    gameId: s.id,
    status,
    bet: s.bet,
    playerCards: s.playerCards,
    // Tant que la main est en cours, la carte cachée du croupier ne quitte pas le serveur.
    dealerCards: over ? s.dealerCards : s.dealerCards.slice(0, 1),
    playerScore: handScore(s.playerCards),
    dealerScore: handScore(over ? s.dealerCards : s.dealerCards.slice(0, 1)),
    ...(settled ?? {}),
  };
}

function finish(s: BlackjackSession) {
  sessions.delete(s.id);
  const pScore = handScore(s.playerCards);
  if (pScore > 21) return view(s, 'lost', settle(s, 'blackjack', s.bet, 0, `Bust (${pScore})`));
  while (handScore(s.dealerCards) < 17) s.dealerCards.push(s.deck.pop()!);
  const dScore = handScore(s.dealerCards);
  if (dScore > 21 || pScore > dScore) {
    return view(s, 'won', settle(s, 'blackjack', s.bet, s.bet * 2, dScore > 21 ? `Croupier bust (${dScore})` : `Victoire ${pScore} contre ${dScore}`));
  }
  if (pScore < dScore) return view(s, 'lost', settle(s, 'blackjack', s.bet, 0, `Défaite ${pScore} contre ${dScore}`));
  return view(s, 'push', settle(s, 'blackjack', s.bet, s.bet, `Égalité ${pScore} partout`));
}

export function startBlackjack(p: Player, rawBet: unknown) {
  purgeExpired();
  const bet = checkBet(p, 'blackjack', rawBet);
  if (typeof bet !== 'number') return bet;
  takeBet(p, 'blackjack', bet);

  const deck = shuffledDeck();
  const s: BlackjackSession = {
    ...p,
    id: randomUUID(),
    bet,
    deck,
    playerCards: [deck.pop()!, deck.pop()!],
    dealerCards: [deck.pop()!, deck.pop()!],
    expiresAt: Date.now() + BLACKJACK_TTL_MS,
  };
  if (handScore(s.playerCards) === 21) {
    return view(s, 'blackjack', settle(s, 'blackjack', bet, Math.round(bet * 2.5), 'Blackjack naturel (3:2)'));
  }
  sessions.set(s.id, s);
  return view(s, 'playing');
}

export function actBlackjack(p: Player, gameId: string, action: unknown) {
  purgeExpired();
  const s = sessions.get(gameId);
  if (!s || s.userId !== p.userId || s.guildId !== p.guildId) {
    return { error: 'not_found', message: 'Main introuvable ou expirée.', httpStatus: 404 } as CasinoError;
  }
  if (action === 'hit') {
    s.playerCards.push(s.deck.pop()!);
    return handScore(s.playerCards) > 21 ? finish(s) : view(s, 'playing');
  }
  if (action === 'stand') return finish(s);
  if (action === 'double') {
    if (s.playerCards.length !== 2) return { error: 'invalid_action', message: 'On ne peut doubler que sur les deux premières cartes.', httpStatus: 400 } as CasinoError;
    const check = checkBet(p, 'blackjack', s.bet);
    if (typeof check !== 'number') return check;
    takeBet(p, 'blackjack', s.bet);
    s.bet *= 2;
    s.playerCards.push(s.deck.pop()!);
    return finish(s);
  }
  return { error: 'invalid_action', message: 'Action inconnue.', httpStatus: 400 } as CasinoError;
}
