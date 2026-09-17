import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { economyStorage } from '../storage/economyStorage.js';
import { logger } from '../../../utils/logger.js';

type UserRef = { id: string; username: string; avatarUrl?: string | null };

export type DailyClaimResult =
  | { ok: true; amount: number; balance: number }
  | { ok: false; reason: 'disabled' | 'cooldown'; remainingMs?: number };

export type TransferResult =
  | { ok: true; fromBalance: number; toBalance: number }
  | { ok: false; reason: 'disabled' | 'invalid_amount' | 'insufficient_funds' | 'self' };

export type GambleResult =
  | { ok: true; won: boolean; amount: number; payout: number; balance: number }
  | { ok: false; reason: 'invalid_bet' | 'insufficient_funds' };

export type PurchaseResult =
  | { ok: true; item: { label: string; price: number }; balance: number }
  | { ok: false; reason: 'not_found' | 'insufficient_funds' | 'already_owned' | 'role_unavailable' };

class EconomyService {
  public claimDaily(guildId: string, user: UserRef): DailyClaimResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled) return { ok: false, reason: 'disabled' };

    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });
    const cooldownMs = config.dailyCooldownHours * 60 * 60 * 1000;
    if (wallet.lastDailyClaimAt) {
      const elapsed = Date.now() - new Date(wallet.lastDailyClaimAt).getTime();
      if (elapsed < cooldownMs) {
        return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - elapsed };
      }
    }

    const amount = Math.floor(config.dailyAmountMin + Math.random() * (config.dailyAmountMax - config.dailyAmountMin));
    // lastDailyClaimAt is set BEFORE the balance write completes below, both
    // synchronously with no await between them — a rapid double-click can't
    // slip through a gap where the cooldown hasn't landed yet.
    economyStorage.setLastDailyClaim(guildId, user.id, new Date().toISOString());
    const updated = economyStorage.applyDelta(guildId, user.id, amount, {
      username: user.username,
      avatarUrl: user.avatarUrl,
      trackEarned: true,
    });

    return { ok: true, amount, balance: updated.balance };
  }

  public transfer(guildId: string, from: UserRef, to: UserRef, amount: number): TransferResult {
    const config = economyStorage.getConfig(guildId);
    if (!config.enabled || !config.transfersEnabled) return { ok: false, reason: 'disabled' };
    if (from.id === to.id) return { ok: false, reason: 'self' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };

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

    return { ok: true, fromBalance: debited.balance, toBalance: credited.balance };
  }

  public gamble(guildId: string, user: UserRef, bet: number): GambleResult {
    const config = economyStorage.getConfig(guildId);
    const wallet = economyStorage.getWallet(guildId, user.id, { username: user.username, avatarUrl: user.avatarUrl });

    // Never trust the client-supplied bet: clamp to config bounds AND to the
    // user's current balance server-side before touching anything.
    const clampedBet = Math.floor(Math.min(bet, config.gambleMaxBet, wallet.balance));
    if (!Number.isFinite(bet) || bet < config.gambleMinBet) return { ok: false, reason: 'invalid_bet' };
    if (clampedBet < config.gambleMinBet || clampedBet > wallet.balance) return { ok: false, reason: 'insufficient_funds' };

    const won = Math.random() < 0.5;
    const delta = won ? Math.floor(clampedBet * (config.gambleWinMultiplier - 1)) : -clampedBet;
    const updated = economyStorage.applyDelta(guildId, user.id, delta, {
      trackEarned: won,
      trackSpent: !won,
    });

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

    try {
      await member.roles.add(role, `Achat boutique économie (${item.label})`);
    } catch (err) {
      logger.error(`[Economy] Échec attribution du rôle acheté à ${member.user.tag} :`, err);
      return { ok: false, reason: 'role_unavailable' };
    }

    const updated = economyStorage.applyDelta(guildId, member.id, -item.price, { trackSpent: true });
    return { ok: true, item: { label: item.label, price: item.price }, balance: updated.balance };
  }
}

export const economyService = new EconomyService();
