import fs from 'fs';
import path from 'path';
import { EconomyConfig, EconomyConfigSchema } from '../types/economyConfig.js';
import { Wallet, WalletSchema, EconomyLeaderboardEntry, Transaction, TransactionSchema, TransactionType } from '../types/wallet.js';
import { ShopItem, ShopItemSchema } from '../types/shopItem.js';
import { logger } from '../../../utils/logger.js';

// Historique borné par serveur : assez pour le dashboard et les audits
// récents, sans faire grossir le JSON indéfiniment.
const MAX_TRANSACTIONS_PER_GUILD = 500;

// Synchronous write-on-mutation (unlike leveling's xpWriteBuffer), on purpose:
// balance changes here come from discrete, cooldown-gated, user-initiated
// commands (/daily, /pay, /gamble), not one write per chat message. Losing a
// real balance mutation on a crash is a much worse user-facing problem
// ("my coins disappeared") than the write-per-command throughput cost, which
// is negligible at this frequency.
class EconomyStorage {
  private configPath = path.resolve(process.cwd(), 'data', 'economy_configs.json');
  private walletsPath = path.resolve(process.cwd(), 'data', 'economy_wallets.json');
  private shopPath = path.resolve(process.cwd(), 'data', 'economy_shop.json');

  private configs = new Map<string, EconomyConfig>();
  // Shared single Map keyed "guildId:userId" — /pay mutates two wallets in
  // one synchronous block against this same Map, so both writes land before
  // any other command can interleave (no separate per-user storage instance
  // to go out of sync).
  private wallets = new Map<string, Wallet>();
  private shopItems = new Map<string, ShopItem[]>(); // guildId -> items
  private transactionsPath = path.resolve(process.cwd(), 'data', 'economy_transactions.json');
  private transactions = new Map<string, Transaction[]>(); // guildId -> newest first

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = EconomyConfigSchema.safeParse(val);
          if (res.success) this.configs.set(gid, res.data);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement economy_configs.json :', err);
    }

    try {
      if (fs.existsSync(this.walletsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.walletsPath, 'utf-8'));
        for (const [key, val] of Object.entries(parsed)) {
          const res = WalletSchema.safeParse(val);
          if (res.success) this.wallets.set(key, res.data);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement economy_wallets.json :', err);
    }

    try {
      if (fs.existsSync(this.shopPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.shopPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.shopItems.set(gid, list as ShopItem[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement economy_shop.json :', err);
    }

    try {
      if (fs.existsSync(this.transactionsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.transactionsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          const valid: Transaction[] = [];
          for (const raw of list as unknown[]) {
            const res = TransactionSchema.safeParse(raw);
            if (res.success) valid.push(res.data);
          }
          this.transactions.set(gid, valid.slice(0, MAX_TRANSACTIONS_PER_GUILD));
        }
      }
    } catch (err) {
      logger.error('Erreur chargement economy_transactions.json :', err);
    }
  }

  private saveTransactions() {
    try {
      const obj = Object.fromEntries(this.transactions.entries());
      fs.writeFileSync(this.transactionsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde economy_transactions.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde economy_configs.json :', err);
    }
  }

  private saveWallets() {
    try {
      const obj = Object.fromEntries(this.wallets.entries());
      fs.writeFileSync(this.walletsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde economy_wallets.json :', err);
    }
  }

  private saveShopItems() {
    try {
      const obj = Object.fromEntries(this.shopItems.entries());
      fs.writeFileSync(this.shopPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde economy_shop.json :', err);
    }
  }

  private walletKey(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  // ==========================================
  // Config
  // ==========================================
  public getConfig(guildId: string): EconomyConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = EconomyConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<EconomyConfig>): EconomyConfig {
    const current = this.getConfig(guildId);
    const valid = EconomyConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  // ==========================================
  // Wallets
  // ==========================================
  public getWallet(guildId: string, userId: string, seed?: { username?: string; avatarUrl?: string | null }): Wallet {
    const key = this.walletKey(guildId, userId);
    let wallet = this.wallets.get(key);
    if (!wallet) {
      const config = this.getConfig(guildId);
      wallet = WalletSchema.parse({
        userId,
        guildId,
        balance: config.startingBalance,
        username: seed?.username,
        avatarUrl: seed?.avatarUrl ?? null,
      });
      this.wallets.set(key, wallet);
      this.saveWallets();
    }
    return wallet;
  }

  // Applies a signed delta (positive = credit, negative = debit) to a wallet
  // and persists synchronously. Callers are responsible for validating the
  // delta (e.g. clamping a bet to the current balance) BEFORE calling this —
  // this method does not reject a delta that would take balance below 0,
  // since debit amounts are checked by the caller first for a clear error
  // message rather than a generic failure here.
  public applyDelta(
    guildId: string,
    userId: string,
    delta: number,
    opts?: { username?: string; avatarUrl?: string | null; trackEarned?: boolean; trackSpent?: boolean }
  ): Wallet {
    const wallet = this.getWallet(guildId, userId, opts);
    wallet.balance = Math.max(0, wallet.balance + delta);
    if (opts?.username) wallet.username = opts.username;
    if (opts?.avatarUrl !== undefined) wallet.avatarUrl = opts.avatarUrl;
    if (delta > 0 && opts?.trackEarned) wallet.totalEarned += delta;
    if (delta < 0 && opts?.trackSpent) wallet.totalSpent += Math.abs(delta);
    this.wallets.set(this.walletKey(guildId, userId), wallet);
    this.saveWallets();
    return wallet;
  }

  public setLastDailyClaim(guildId: string, userId: string, iso: string): void {
    const wallet = this.getWallet(guildId, userId);
    wallet.lastDailyClaimAt = iso;
    this.wallets.set(this.walletKey(guildId, userId), wallet);
    this.saveWallets();
  }

  /** Met à jour des champs de suivi (séries, horodatages de cooldown) sans toucher au solde. */
  public updateWalletFields(guildId: string, userId: string, fields: Partial<Pick<Wallet, 'dailyStreak' | 'lastDailyClaimAt' | 'lastPassiveEarnAt' | 'lastWorkAt' | 'lastRobAt'>>): Wallet {
    const wallet = this.getWallet(guildId, userId);
    Object.assign(wallet, fields);
    this.wallets.set(this.walletKey(guildId, userId), wallet);
    this.saveWallets();
    return wallet;
  }

  // ==========================================
  // Transactions (historique)
  // ==========================================
  public recordTransaction(
    guildId: string,
    userId: string,
    type: TransactionType,
    amount: number,
    balanceAfter: number,
    extra?: { counterpartyId?: string | null; note?: string | null }
  ): Transaction {
    const tx = TransactionSchema.parse({
      id: `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      guildId,
      userId,
      type,
      amount,
      balanceAfter: Math.max(0, balanceAfter),
      counterpartyId: extra?.counterpartyId ?? null,
      note: extra?.note ?? null,
      createdAt: new Date().toISOString(),
    });
    const list = this.transactions.get(guildId) || [];
    list.unshift(tx);
    if (list.length > MAX_TRANSACTIONS_PER_GUILD) list.length = MAX_TRANSACTIONS_PER_GUILD;
    this.transactions.set(guildId, list);
    this.saveTransactions();
    return tx;
  }

  public getTransactions(guildId: string, limit = 50, userId?: string): Transaction[] {
    const list = this.transactions.get(guildId) || [];
    const filtered = userId ? list.filter((t) => t.userId === userId || t.counterpartyId === userId) : list;
    return filtered.slice(0, limit);
  }

  /** Volume total échangé sur 24h et nombre de mouvements — pour l'aperçu dashboard. */
  public getActivitySummary(guildId: string): { transactions24h: number; volume24h: number; totalCirculating: number } {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = (this.transactions.get(guildId) || []).filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    const volume24h = recent.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalCirculating = Array.from(this.wallets.values())
      .filter((w) => w.guildId === guildId)
      .reduce((sum, w) => sum + w.balance, 0);
    return { transactions24h: recent.length, volume24h, totalCirculating };
  }

  public getLeaderboard(guildId: string, limit = 10): EconomyLeaderboardEntry[] {
    const entries = Array.from(this.wallets.values()).filter((w) => w.guildId === guildId);
    entries.sort((a, b) => b.balance - a.balance);
    return entries.slice(0, limit).map((w, idx) => ({ ...w, rank: idx + 1 }));
  }

  // ==========================================
  // Shop
  // ==========================================
  public getShopItems(guildId: string): ShopItem[] {
    return this.shopItems.get(guildId) || [];
  }

  public saveShopItem(guildId: string, data: Partial<ShopItem> & { roleId: string }): ShopItem {
    const list = this.getShopItems(guildId);
    const valid = ShopItemSchema.parse({ ...data, id: data.id || undefined });
    const idx = list.findIndex((i) => i.id === valid.id);
    if (idx >= 0) list[idx] = valid;
    else list.push(valid);
    this.shopItems.set(guildId, list);
    this.saveShopItems();
    return valid;
  }

  public deleteShopItem(guildId: string, itemId: string): boolean {
    const list = this.getShopItems(guildId);
    this.shopItems.set(guildId, list.filter((i) => i.id !== itemId));
    this.saveShopItems();
    return true;
  }
}

export const economyStorage = new EconomyStorage();
