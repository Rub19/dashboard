import { ButtonInteraction, MessageFlags } from 'discord.js';
import { economyStorage } from '../storage/economyStorage.js';
import { economyService } from '../services/economyService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { levelingStorage } from '../../leveling/storage/levelingStorage.js';
import { container, footer, progressBar, separator, text, toneToColor } from '../../../utils/components.js';
import { noticeEmbed } from '../../../utils/embeds.js';

// Boutons rapides sous les cartes /economy (Quotidien, Travailler, Classement,
// Boutique, Rejouer) et le bouton "Classement" de /rank. Les réponses sont
// éphémères : le bouton peut être cliqué par n'importe qui sur un message
// public, chacun voit donc SON résultat sans polluer le salon.

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

const V2_EPHEMERAL = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

export async function handleEconomyButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ embeds: [noticeEmbed('error', 'Disponible uniquement sur un serveur.')], flags: MessageFlags.Ephemeral });
    return;
  }
  const guildId = interaction.guildId;
  const gConf = guildConfigService.getConfig(guildId);
  const config = economyStorage.getConfig(guildId);
  const sym = config.currencySymbol;
  const me = { id: interaction.user.id, username: interaction.user.username, avatarUrl: interaction.user.displayAvatarURL() };
  const id = interaction.customId;

  if (!config.enabled) {
    await interaction.reply({ embeds: [noticeEmbed('neutral', 'L’économie est désactivée sur ce serveur.')], flags: MessageFlags.Ephemeral });
    return;
  }

  if (id === 'eco_btn_daily') {
    const r = economyService.claimDaily(guildId, me);
    if (!r.ok) {
      const msg = r.reason === 'cooldown' ? `⏳ Déjà réclamé. Reviens dans **${humanDuration(r.remainingMs || 0)}**.` : '⚪ Économie désactivée.';
      await interaction.reply({ embeds: [noticeEmbed('info', msg)], flags: MessageFlags.Ephemeral });
      return;
    }
    const card = container(toneToColor('success', gConf.successColor), [
      text(`## 🎁 +${fmt(r.amount, sym)}`),
      text(`${r.streakBonus > 0 ? `🔥 Série ${r.streak} j (+${fmt(r.streakBonus, sym)})\n` : ''}Nouveau solde : **${fmt(r.balance, sym)}**`),
    ]);
    await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
    return;
  }

  if (id === 'eco_btn_work') {
    const r = economyService.work(guildId, me);
    if (!r.ok) {
      const msg = r.reason === 'cooldown' ? `⏳ Prochain boulot dans **${humanDuration(r.remainingMs || 0)}**.` : '⚪ Le travail est désactivé.';
      await interaction.reply({ embeds: [noticeEmbed('info', msg)], flags: MessageFlags.Ephemeral });
      return;
    }
    const card = container(toneToColor('primary', gConf.primaryColor), [
      text(`## 💼 ${r.job}`),
      text(`+**${fmt(r.amount, sym)}** · solde : **${fmt(r.balance, sym)}**`),
    ]);
    await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
    return;
  }

  if (id === 'eco_btn_leaderboard') {
    const entries = economyStorage.getLeaderboard(guildId, config.leaderboardSize);
    if (entries.length === 0) {
      await interaction.reply({ embeds: [noticeEmbed('warning', 'Aucun membre n’a encore de solde.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = entries.map((e, i) => `${medals[i] || `**${e.rank}.**`} <@${e.userId}> — **${fmt(e.balance, sym)}**`);
    const card = container(toneToColor('success', gConf.successColor), [
      text(`## 🏆 Classement — ${config.currencyName}`),
      separator(),
      text(lines.join('\n')),
    ]);
    await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
    return;
  }

  if (id === 'eco_btn_shop') {
    const items = economyStorage.getShopItems(guildId).filter((i) => i.enabled);
    if (items.length === 0) {
      await interaction.reply({ embeds: [noticeEmbed('warning', 'La boutique est vide pour le moment.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const wallet = economyStorage.getWallet(guildId, me.id, me);
    const lines = items.map((i) => `${wallet.balance >= i.price ? '🟢' : '🔴'} **${i.label}** — ${fmt(i.price, sym)}\n-# \`${i.id}\` · ${i.description || 'Rôle exclusif'}`);
    const card = container(toneToColor('info', gConf.infoColor), [
      text(`## 🛍️ Boutique`),
      text(`Ton solde : **${fmt(wallet.balance, sym)}**`),
      separator(),
      text(lines.join('\n\n')),
      separator(false),
      footer('Achète avec /economy buy id:<identifiant>'),
    ]);
    await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
    return;
  }

  if (id.startsWith('eco_btn_gamble_')) {
    const bet = parseInt(id.replace('eco_btn_gamble_', ''), 10);
    const r = economyService.gamble(guildId, me, Number.isFinite(bet) ? bet : config.gambleMinBet);
    if (!r.ok) {
      const msg = r.reason === 'invalid_bet' ? `❌ Mise minimale : ${fmt(config.gambleMinBet, sym)}.` : '❌ Solde insuffisant.';
      await interaction.reply({ embeds: [noticeEmbed('info', msg)], flags: MessageFlags.Ephemeral });
      return;
    }
    const card = container(toneToColor(r.won ? 'success' : 'error', r.won ? gConf.successColor : gConf.errorColor), [
      text(r.won ? `## 🪙 Gagné ! +${fmt(r.payout, sym)}` : `## 🪙 Perdu. -${fmt(r.amount, sym)}`),
      text(`Nouveau solde : **${fmt(r.balance, sym)}**`),
    ]);
    await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
    return;
  }

  await interaction.reply({ embeds: [noticeEmbed('error', 'Action inconnue.')], flags: MessageFlags.Ephemeral });
}

/** Bouton "Classement" sous la carte /rank : classement XP du serveur. */
export async function handleRankButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ embeds: [noticeEmbed('error', 'Disponible uniquement sur un serveur.')], flags: MessageFlags.Ephemeral });
    return;
  }
  const top = levelingStorage.getLeaderboard(interaction.guildId, undefined, 10);
  if (top.length === 0) {
    await interaction.reply({ embeds: [noticeEmbed('info', 'Personne n’a encore gagné d’XP ici.')], flags: MessageFlags.Ephemeral });
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  const lines = top.map((u, i) => `${medals[i] || `**#${i + 1}**`} <@${u.userId}> — **Niveau ${u.level}** · ${u.totalXp.toLocaleString('fr-FR')} XP\n\`${progressBar(u.progressPercentage, 8)}\` ${u.progressPercentage}%`);
  const card = container(toneToColor('warning'), [
    text(`## 🏆 Classement XP — ${interaction.guild.name}`),
    separator(),
    text(lines.join('\n\n')),
  ]);
  await interaction.reply({ components: [card], flags: V2_EPHEMERAL });
}
