import { Client, TextBasedChannel } from 'discord.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

/**
 * Remonte les erreurs de lecture dans le salon texte où /play a été lancé.
 * Avant, un titre refusé par YouTube (login requis, anti-bot…) n'apparaissait
 * que dans les logs du serveur : côté Discord, le bot "jouait" sans un son et
 * sans le moindre message.
 */
class MusicNotifier {
  private client: Client | null = null;
  private channels = new Map<string, string>();
  private lastSent = new Map<string, number>();

  public initialize(client: Client): void {
    this.client = client;
  }

  public rememberChannel(guildId: string, channelId: string | null | undefined): void {
    if (channelId) this.channels.set(guildId, channelId);
  }

  private hint(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('needs to be reloaded')) {
      return "YouTube bloque probablement l'adresse IP de ce serveur (hébergeur). Le bot bascule sur SoundCloud quand c'est possible.";
    }
    if (m.includes('sign in') || m.includes('login') || m.includes('not a bot') || m.includes('confirm you')) {
      return "YouTube demande une connexion : le compte lié à Lavalink doit être ré-associé (voir lavalink/README.md, étape OAuth).";
    }
    if (m.includes('po token') || m.includes('potoken')) {
      return "YouTube exige un PO token pour ce client : vérifie la liste `clients` du plugin YouTube dans application.yml.";
    }
    if (m.includes('unavailable') || m.includes('private') || m.includes('not available')) {
      return "Cette vidéo n'est pas disponible (privée, bloquée dans la région ou retirée).";
    }
    return "Le fournisseur a refusé la lecture de ce titre.";
  }

  /** Garde une ligne par client YouTube ("Client [X] failed: …") au lieu de la trace Java. */
  private summarize(detail: string): string {
    const lines = detail.match(/Client \[[^\]]+\] failed:[^\n]*?(?=\s+at\s|\n|$)/g);
    const text = (lines && lines.length > 0 ? lines.map((l) => l.trim()).join('\n') : detail).trim();
    return text.slice(0, 900);
  }

  public async notice(guildId: string, title: string, text: string): Promise<void> {
    const channelId = this.channels.get(guildId);
    if (!this.client || !channelId) return;
    try {
      const channel = (await this.client.channels.fetch(channelId).catch(() => null)) as TextBasedChannel | null;
      if (!channel || !('send' in channel)) return;
      const embed = baseEmbed('info', { footerText: 'ETHONE • Musique' })
        .setTitle('ℹ️ Lecture via une autre source')
        .setDescription(`**${title.slice(0, 200)}**\n${text}`);
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.warn('[MusicNotifier] envoi impossible :', err);
    }
  }

  public async error(guildId: string, title: string, detail: string): Promise<void> {
    // Anti-spam : au plus un message toutes les 15 s par serveur.
    const now = Date.now();
    if (now - (this.lastSent.get(guildId) ?? 0) < 15_000) return;
    this.lastSent.set(guildId, now);

    const channelId = this.channels.get(guildId);
    if (!this.client || !channelId) return;
    try {
      const channel = (await this.client.channels.fetch(channelId).catch(() => null)) as TextBasedChannel | null;
      if (!channel || !('send' in channel)) return;
      const embed = baseEmbed('warning', { footerText: 'ETHONE • Musique' })
        .setTitle('⚠️ Lecture impossible')
        .setDescription(`**${title.slice(0, 200)}**\n${this.hint(detail)}`)
        .addFields({ name: 'Détail technique', value: `\`\`\`${this.summarize(detail)}\`\`\`` });
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.warn('[MusicNotifier] envoi impossible :', err);
    }
  }
}

export const musicNotifier = new MusicNotifier();
