import { z } from 'zod';

export type GameType = 'blackjack' | 'roulette' | 'dice' | 'spin';

export const GamesConfigSchema = z.object({
  enabled: z.boolean().default(true),
  allowedChannelIds: z.array(z.string()).default([]),
  minBet: z.number().int().min(1).default(10),
  maxBet: z.number().int().min(10).default(50000),
  blackjackEnabled: z.boolean().default(true),
  rouletteEnabled: z.boolean().default(true),
  diceEnabled: z.boolean().default(true),
  dailySpinEnabled: z.boolean().default(true),
  jackpotPool: z.number().int().min(0).default(5000),
  jackpotContributionPercent: z.number().min(0).max(10).default(2),
  cooldownSeconds: z.number().int().min(0).max(60).default(3),
  houseEdgePercent: z.number().min(0).max(10).default(1),
});

export type GamesConfig = z.infer<typeof GamesConfigSchema>;

export interface GameRecord {
  id: string;
  guildId: string;
  userId: string;
  username: string;
  gameType: GameType;
  bet: number;
  payout: number;
  net: number;
  won: boolean;
  detail: string;
  timestamp: string;
}

export interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  gameType: GameType;
  requiredCount: number;
  rewardCredits: number;
  rewardXp: number;
}

export interface GamesOverview {
  enabled: boolean;
  jackpotPool: number;
  totalGamesPlayed: number;
  totalBets: number;
  totalPayouts: number;
  biggestWin: { username: string; amount: number; game: string; timestamp: string } | null;
  recentGames: GameRecord[];
  topWinners: Array<{ userId: string; username: string; totalWon: number; gamesPlayed: number }>;
}

export interface BlackjackHand {
  cards: Array<{ suit: '♠' | '♥' | '♦' | '♣'; value: string; num: number }>;
  score: number;
  isBlackjack: boolean;
  isBusted: boolean;
}

export interface BlackjackGame {
  id: string;
  guildId: string;
  userId: string;
  username: string;
  channelId: string;
  messageId: string;
  bet: number;
  deck: Array<{ suit: '♠' | '♥' | '♦' | '♣'; value: string; num: number }>;
  playerHand: BlackjackHand;
  dealerHand: BlackjackHand;
  status: 'playing' | 'player_bust' | 'player_stand' | 'dealer_bust' | 'player_win' | 'dealer_win' | 'push' | 'blackjack';
  payout: number;
  createdAt: number;
}

export interface DiceDuel {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  bet: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  challengerRoll?: [number, number];
  opponentRoll?: [number, number];
  winnerId?: string;
  createdAt: number;
}
