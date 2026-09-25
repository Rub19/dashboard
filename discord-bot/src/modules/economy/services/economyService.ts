import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { economyStorage } from '../storage/economyStorage.js';
import { logger } from '../../../utils/logger.js';

type UserRef = { id: string; username: string; avatarUrl?: string | null; bot?: boolean };

export type DailyClaimResult =
  | { ok: true; amount: number; streak: number; streakBonus: number; balance: number }
  | { ok: false; reason: 'disabled' | 'cooldown'; remainingMs?: number };

export type TransferResult =
  | { ok: true; fromBalance: number; toBalance: number }
  | { ok: false; reason: 'disabled' | 'invalid_amount' | 'insufficient_funds' | 'self' | 'bot' };

export type GambleResult =
  | { ok: true; won: boolean; amount: number; payout: number; balance: number }
  | { ok: false; reason: 'disabled' | 'invalid_bet' | 'insufficient_funds' };

export type PurchaseResult =
  | { ok: true; item: { label: string; price: number }; balance: number }
  | { ok: false; reason: 'not_found' | 'insufficient_funds' | 'already_owned' | 'role_unavailable' };

export type WorkResult =
  | { ok: true; amount: number; job: string; balance: number }
  | { ok: false; reason: 'disabled' | 'cooldown'; remainingMs?: number };

export type RobResult =
  | { ok: true; success: true; amount: number; balance: number }
  | { ok: true; success: false; fine: number; balance: number }
  | { ok: false; reason: 'disabled' | 'cooldown' | 'self' | 'bot' | 'target_too_poor' | 'no_funds'; remainingMs?: number };

// Petits boulots de /work : purement cosmétique, le montant vient de la config.
const WORK_JOBS = [
  'livreur de pizzas 🍕',
  'modérateur de nuit 🌙',
  'développeur freelance 💻',
  'barista 🎧',
  'chasseur de bugs 🐛',
  'DJ de la soirée 🎶',
  'jardinier du serveur 🌱',
  'streamer du dimanche 🎥',
];

function remaining(lastIso: string | null, cooldownMs: number): number {
  if (!lastIso) return 0;
  const elapsed = Date.now() - new Date(lastIso).getTime();
  return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
}

class EconomyService {
  public claimDaily(guildId: string, user: UserRef): DailyClaimResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) return { ok: false, reason: 'disabled' };

    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });
    const cooldownMs = config.dailyCooldownHours * 60 * 60 * 1000;
    const left = remaining(wallet.lastDailyClaimAt, cooldownMs);
    if (left > 0) return { ok: false, reason: 'cooldown', remainingMs: left };

    // Série : conservée si la réclamation arrive avant 2x le cooldown (un jour
    // sauté = série perdue), sinon repart de 1.
    let streak = 1;
    if (wallet.lastDailyClaimAt) {
      const elapsed = Date.now() - new Date(wallet.lastDailyClaimAt).getTime();
      if (elapsed < cooldownMs * 2) streak = wallet.dailyStreak + 1;
    }
    const streakBonus = Math.min(config.dailyStreakMaxBonus, (streak - 1) * config.dailyStreakBonus);
    const base = Math.floor(config.dailyAmountMin + Math.random() * (config.dailyAmountMax - config.dailyAmountMin));
    const amount = base + streakBonus;

    // lastDailyClaimAt is set BEFORE the balance write completes below, both
    // synchronously with no await between them — a rapid double-click can't
    // slip through a gap where the cooldown hasn't landed yet.
    economyStorage.updateWalletFields(guildId, user.id, { lastDailyClaimAt: new Date().toISOString(), dailyStreak: streak });
    const updated = economyStorage.applyDelta(guildId, user.id, amount, {
      username: user.username,
      avatarUrl: user.avatarUrl,
      trackEarned: true,
    });
    economyStorage.recordTransaction(guildId, user.id, 'daily', amount, updated.balance, {
      note: streak > 1 ? `Série de ${streak} jours (+${streakBonus})` : null,
    });

    return { ok: true, amount, streak, streakBonus, balance: updated.balance };
  }

  /** Gain passif par message (appelé depuis messageCreate). Renvoie le montant crédité, 0 si rien. */
  public earnPassive(guildId: string, user: UserRef, messageLength: number): number {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled || !config.passiveEarnEnabled) return 0;
    if (messageLength < config.passiveEarnMinMessageLength) return 0;

    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });
    if (remaining(wallet.lastPassiveEarnAt, config.passiveEarnCooldownSeconds * 1000) > 0) return 0;

    const amount = Math.floor(config.passiveEarnMin + Math.random() * (config.passiveEarnMax - config.passiveEarnMin + 1));
    if (amount <= 0) return 0;

    economyStorage.updateWalletFields(guildId, user.id, { lastPassiveEarnAt: new Date().toISOString() });
    const updated = economyStorage.applyDelta(guildId, user.id, amount, { username: user.username, avatarUrl: user.avatarUrl, trackEarned: true });
    // Pas de ligne de transaction par message : ça noierait l'historique. Le
    // total passif reste visible via totalEarned.
    return updated.balance >= 0 ? amount : 0;
  }

  public work(guildId: string, user: UserRef): WorkResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled || !config.workEnabled) return { ok: false, reason: 'disabled' };

    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });
    const left = remaining(wallet.lastWorkAt, config.workCooldownMinutes * 60 * 1000);
    if (left > 0) return { ok: false, reason: 'cooldown', remainingMs: left };

    const amount = Math.floor(config.workAmountMin + Math.random() * (config.workAmountMax - config.workAmountMin + 1));
    const job = WORK_JOBS[Math.floor(Math.random() * WORK_JOBS.length)];
    economyStorage.updateWalletFields(guildId, user.id, { lastWorkAt: new Date().toISOString() });
    const updated = economyStorage.applyDelta(guildId, user.id, amount, { username: user.username, avatarUrl: user.avatarUrl, trackEarned: true });
    economyStorage.recordTransaction(guildId, user.id, 'work', amount, updated.balance, { note: job });
    return { ok: true, amount, job, balance: updated.balance };
  }

  public rob(guildId: string, thief: UserRef, target: UserRef): RobResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled || !config.robEnabled) return { ok: false, reason: 'disabled' };
    if (thief.id === target.id) return { ok: false, reason: 'self' };
    if (target.bot) return { ok: false, reason: 'bot' };

    const thiefWallet = economyStorage.getWallet(guildId, thief.id, { username: thief.username, avatarUrl: thief.avatarUrl });
    const left = remaining(thiefWallet.lastRobAt, config.robCooldownMinutes * 60 * 1000);
    if (left > 0) return { ok: false, reason: 'cooldown', remainingMs: left };

    const targetWallet = economyStorage.getWallet(guildId, target.id, { username: target.username, avatarUrl: target.avatarUrl });
    if (targetWallet.balance < config.robMinTargetBalance) return { ok: false, reason: 'target_too_poor' };
    if (thiefWallet.balance <= 0) return { ok: false, reason: 'no_funds' };

    economyStorage.updateWalletFields(guildId, thief.id, { lastRobAt: new Date().toISOString() });

    if (Math.random() < config.robSuccessRate) {
      const maxSteal = Math.floor(targetWallet.balance * (config.robMaxStealPercent / 100));
      const amount = Math.max(1, Math.floor(maxSteal * (0.5 + Math.random() * 0.5)));
      // Débit + crédit dans le même bloc synchrone (même garantie que /pay).
      const victim = economyStorage.applyDelta(guildId, target.id, -amount, { trackSpent: false });
      const gained = economyStorage.applyDelta(guildId, thief.id, amount, { trackEarned: true });
      economyStorage.recordTransaction(guildId, thief.id, 'rob_gain', amount, gained.balance, { counterpartyId: target.id });
      economyStorage.recordTransaction(guildId, target.id, 'rob_loss', -amount, victim.balance, { counterpartyId: thief.id });
      return { ok: true, success: true, amount, balance: gained.balance };
    }

    const fine = Math.max(1, Math.floor(thiefWallet.balance * (config.robFailPenaltyPercent / 100)));
    const fined = economyStorage.applyDelta(guildId, thief.id, -fine, { trackSpent: true });
    economyStorage.recordTransaction(guildId, thief.id, 'rob_fine', -fine, fined.balance, { counterpartyId: target.id, note: 'Tentative de vol ratée' });
    return { ok: true, success: false, fine, balance: fined.balance };
  }

  public transfer(guildId: string, from: UserRef, to: UserRef, amount: number): TransferResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled || !config.transfersEnabled) return { ok: false, reason: 'disabled' };
    if (from.id === to.id) return { ok: false, reason: 'self' };
    // Un bot n'a pas de portefeuille : les crédits envoyés y seraient perdus.
    if (to.bot) return { ok: false, reason: 'bot' };
    // Montants entiers uniquement (pas de solde fractionnaire).
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };

    const fromWallet = economyStorage.getWallet(guildId, from.id, { username: from.username, avatarUrl: from.avatarUrl });
    if (fromWallet.balance < amount) return { ok: false, reason: 'insufficient_funds' };

    // Both mutations happen synchronously against the same in-process Map,
    // no await between the debit and the credit — this is what makes the
    // transfer atomic in practice despite there being no DB transaction.
    const debited = economyStorage.applyDelta(guildId, from.id, -amount, { trackSpent: true });
    const credited = economyStorage.applyDelta(guildId, to.id, amount, {
      username: to.username,
      avatarUrl: to.avatarUrl,
      trackEarned: true,
    });
    economyStorage.recordTransaction(guildId, from.id, 'transfer_out', -amount, debited.balance, { counterpartyId: to.id });
    economyStorage.recordTransaction(guildId, to.id, 'transfer_in', amount, credited.balance, { counterpartyId: from.id });

    return { ok: true, fromBalance: debited.balance, toBalance: credited.balance };
  }

  public gamble(guildId: string, user: UserRef, bet: number): GambleResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) return { ok: false, reason: 'disabled' };
    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });

    // Never trust the client-supplied bet: clamp to config bounds AND to the
    // user's current balance server-side before touching anything.
    const clampedBet = Math.floor(Math.min(bet, config.gambleMaxBet, wallet.balance));
    if (!Number.isFinite(bet) || bet < config.gambleMinBet) return { ok: false, reason: 'invalid_bet' };
    if (clampedBet < config.gambleMinBet || clampedBet > wallet.balance) return { ok: false, reason: 'insufficient_funds' };

    const won = Math.random() < 0.5;
    // Une victoire rapporte toujours au moins 1 (avec une petite mise, l'arrondi donnait 0 : « gagné » sans gain).
    const delta = won ? Math.max(1, Math.floor(clampedBet * (config.gambleWinMultiplier - 1))) : -clampedBet;
    const updated = economyStorage.applyDelta(guildId, user.id, delta, {
      trackEarned: won,
      trackSpent: !won,
    });
    economyStorage.recordTransaction(guildId, user.id, won ? 'gamble_win' : 'gamble_loss', delta, updated.balance, { note: `Mise ${clampedBet}` });

    return { ok: true, won, amount: clampedBet, payout: won ? delta : 0, balance: updated.balance };
  }

  public async purchaseRole(guildId: string, member: GuildMember, itemId: string): Promise<PurchaseResult> {
    const items = economyStorage.getShopItems(guildId);
    const item = items.find((i) => i.id === itemId && i.enabled);
    if (!item) return { ok: false, reason: 'not_found' };
    if (member.roles.cache.has(item.roleId)) return { ok: false, reason: 'already_owned' };

    const wallet = economyStorage.getWallet(guildId, member.id, {
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL(),
    });
    if (wallet.balance < item.price) return { ok: false, reason: 'insufficient_funds' };

    const botMember = member.guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return { ok: false, reason: 'role_unavailable' };
    }
    const role = member.guild.roles.cache.get(item.roleId);
    if (!role || role.managed || role.position >= botMember.roles.highest.position) {
      return { ok: false, reason: 'role_unavailable' };
    }

    // Débit synchrone AVANT l'attente réseau : deux achats lancés en même temps ne peuvent plus dépenser deux fois
    // le même solde. Si Discord refuse le rôle, le montant est rendu.
    const updated = economyStorage.applyDelta(guildId, member.id, -item.price, { trackSpent: true });
    try {
      await member.roles.add(role, `Achat boutique économie (${item.label})`);
    } catch (err) {
      logger.error(`[Economy] Échec attribution du rôle acheté à ${member.user.tag} :`, err);
      economyStorage.applyDelta(guildId, member.id, item.price);
      return { ok: false, reason: 'role_unavailable' };
    }

    economyStorage.recordTransaction(guildId, member.id, 'purchase', -item.price, updated.balance, { note: item.label });
    return { ok: true, item: { label: item.label, price: item.price }, balance: updated.balance };
  }
}

export const economyService = new EconomyService();
