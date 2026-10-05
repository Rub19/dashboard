import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  MessageActionRowComponentBuilder,
  TextChannel,
} from 'discord.js';
import { streamerStorage } from '../storage/streamerStorage.js';
import {
  LiveStreamDetails,
  StreamPlatform,
  StreamerConfig,
  StreamerItem,
} from '../types/streamer.js';
import { logger } from '../../../utils/logger.js';
import { getAppEmoji } from '../../../services/appEmojis.js';
import { BRAND_COLORS } from '../../../utils/embeds.js';

const PLATFORM_COLORS: Record<StreamPlatform, number> = {
  twitch: 0x9146ff,
  youtube: 0xff0000,
  kick: 0x53fc18,
};

const PLATFORM_NAMES: Record<StreamPlatform, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  kick: 'Kick',
};

const PLATFORM_ICONS: Record<StreamPlatform, string> = {
  twitch: 'https://assets.stickpng.com/images/580b57fcd9996e24bc43c540.png',
  youtube: 'https://assets.stickpng.com/images/580b57fcd9996e24bc43c545.png',
  kick: 'https://images.seeklogo.com/logo-png/47/1/kick-logo-png_seeklogo-476774.png',
};

export class StreamerService {
  private client: Client | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;

  public init(client: Client): void {
    this.client = client;
    this.startScheduler();
    logger.info('[Streamers] Service d\'alertes de streaming initialisé.');
  }

  public startScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    // Vérification automatique toutes les 2 minutes
    this.timer = setInterval(() => {
      void this.checkAllStreamers();
    }, 120_000);
  }

  public stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Vérifie le statut d'un streamer sur la plateforme cible (Twitch, YouTube, Kick).
   */
  public async fetchLiveStatus(
    platform: StreamPlatform,
    username: string
  ): Promise<LiveStreamDetails> {
    const cleanUser = username.trim().toLowerCase();

    if (platform === 'kick') {
      try {
        const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(cleanUser)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          const live = data?.livestream;
          return {
            platform: 'kick',
            username: cleanUser,
            displayName: data?.user?.username || cleanUser,
            isLive: Boolean(live && live.is_live),
            streamId: live?.id ? String(live.id) : undefined,
            title: live?.session_title || `${cleanUser} en direct sur Kick`,
            game: live?.categories?.[0]?.name || 'Just Chatting',
            viewers: live?.viewer_count || 0,
            thumbnailUrl: live?.thumbnail?.url || data?.user?.profile_pic,
            avatarUrl: data?.user?.profile_pic,
            streamUrl: `https://kick.com/${cleanUser}`,
          };
        }
      } catch (err) {
        logger.debug(`[Streamers] Erreur API Kick pour ${cleanUser}:`, err);
      }
      return {
        platform: 'kick',
        username: cleanUser,
        displayName: cleanUser,
        isLive: false,
        streamUrl: `https://kick.com/${cleanUser}`,
      };
    }

    if (platform === 'twitch') {
      // Tentative via endpoint de métadonnées ou scrape public rapide
      try {
        const res = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(cleanUser)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const uptime = await res.text();
          const isLive = !uptime.includes('offline') && !uptime.includes('not found') && uptime.trim().length > 0;
          let title = '';
          let game = '';
          let viewers = 0;

          if (isLive) {
            try {
              const [titleRes, gameRes, viewRes] = await Promise.all([
                fetch(`https://decapi.me/twitch/title/${encodeURIComponent(cleanUser)}`),
                fetch(`https://decapi.me/twitch/game/${encodeURIComponent(cleanUser)}`),
                fetch(`https://decapi.me/twitch/viewercount/${encodeURIComponent(cleanUser)}`),
              ]);
              if (titleRes.ok) title = await titleRes.text();
              if (gameRes.ok) game = await gameRes.text();
              if (viewRes.ok) viewers = parseInt(await viewRes.text(), 10) || 0;
            } catch {
              // fallback
            }
          }

          return {
            platform: 'twitch',
            username: cleanUser,
            displayName: cleanUser,
            isLive,
            title: title || `${cleanUser} est en direct sur Twitch !`,
            game: game || 'Just Chatting',
            viewers,
            thumbnailUrl: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${cleanUser}-1280x720.jpg?v=${Date.now()}`,
            streamUrl: `https://twitch.tv/${cleanUser}`,
          };
        }
      } catch (err) {
        logger.debug(`[Streamers] Erreur API Twitch pour ${cleanUser}:`, err);
      }
      return {
        platform: 'twitch',
        username: cleanUser,
        displayName: cleanUser,
        isLive: false,
        streamUrl: `https://twitch.tv/${cleanUser}`,
      };
    }

    if (platform === 'youtube') {
      try {
        const streamUrl = cleanUser.startsWith('http')
          ? cleanUser
          : `https://www.youtube.com/@${cleanUser.replace(/^@/, '')}/live`;
        const res = await fetch(streamUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const html = await res.text();
          const isLive =
            html.includes('"isLive":true') ||
            html.includes('"isLiveBroadcast":true') ||
            html.includes('LIVE_NOW');
          const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
          const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)">/);

          return {
            platform: 'youtube',
            username: cleanUser,
            displayName: cleanUser,
            isLive,
            title: titleMatch?.[1] || `${cleanUser} est en direct sur YouTube !`,
            game: 'Live YouTube',
            thumbnailUrl: thumbMatch?.[1],
            streamUrl,
          };
        }
      } catch (err) {
        logger.debug(`[Streamers] Erreur scraping YouTube pour ${cleanUser}:`, err);
      }
      return {
        platform: 'youtube',
        username: cleanUser,
        displayName: cleanUser,
        isLive: false,
        streamUrl: `https://www.youtube.com/@${cleanUser.replace(/^@/, '')}/live`,
      };
    }

    return {
      platform,
      username: cleanUser,
      displayName: cleanUser,
      isLive: false,
      streamUrl: `https://${platform}.com/${cleanUser}`,
    };
  }

  /**
   * Vérifie tous les streamers enregistrés pour l'ensemble des guildes actives.
   */
  public async checkAllStreamers(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;
    try {
      const activeStreamers = streamerStorage.getAllActiveStreamers();
      for (const streamer of activeStreamers) {
        await this.checkStreamer(streamer);
      }
    } catch (err) {
      logger.error('[Streamers] Erreur générale lors de la vérification des flux :', err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Vérifie un streamer spécifique et déclenche l'alerte Discord si nécessaire.
   */
  public async checkStreamer(streamer: StreamerItem): Promise<LiveStreamDetails> {
    const live = await this.fetchLiveStatus(streamer.platform, streamer.username);
    const wasLive = streamer.isLive;

    if (live.isLive && !wasLive) {
      // Le streamer vient de lancer son live !
      await this.dispatchLiveAlert(streamer, live);
      streamerStorage.updateStreamer(streamer.guildId, streamer.id, {
        isLive: true,
        lastLiveAt: new Date().toISOString(),
        lastStreamId: live.streamId ?? Date.now().toString(),
        title: live.title,
        game: live.game,
        viewers: live.viewers,
        thumbnailUrl: live.thumbnailUrl,
        avatarUrl: live.avatarUrl,
        streamUrl: live.streamUrl,
      });
    } else if (!live.isLive && wasLive) {
      // Le streamer a terminé son live
      await this.handleStreamEnded(streamer);
      streamerStorage.updateStreamer(streamer.guildId, streamer.id, {
        isLive: false,
      });
    } else if (live.isLive) {
      // Mise à jour continue des métadonnées (titre, spectateurs)
      streamerStorage.updateStreamer(streamer.guildId, streamer.id, {
        title: live.title,
        game: live.game,
        viewers: live.viewers,
        thumbnailUrl: live.thumbnailUrl,
      });
    }

    return live;
  }

  /**
   * Envoie l'embed d'alerte et applique les rôles configurés.
   */
  public async dispatchLiveAlert(
    streamer: StreamerItem,
    live: LiveStreamDetails
  ): Promise<string | null> {
    if (!this.client) return null;
    const config = streamerStorage.getConfig(streamer.guildId);
    if (!config.enabled) return null;

    const channelId = streamer.channelId || config.defaultChannelId;
    if (!channelId) return null;

    try {
      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) return null;

      // Construction du message de notification et du ping
      let pingContent = '';
      if (streamer.pingRoleId) {
        if (streamer.pingRoleId === '@everyone') pingContent = '@everyone';
        else if (streamer.pingRoleId === '@here') pingContent = '@here';
        else pingContent = `<@&${streamer.pingRoleId}>`;
      } else if (config.defaultPing === 'everyone') {
        pingContent = '@everyone';
      } else if (config.defaultPing === 'here') {
        pingContent = '@here';
      } else if (config.defaultPing === 'role' && config.defaultRoleId) {
        pingContent = `<@&${config.defaultRoleId}>`;
      }

      const rawTemplate = streamer.customMessage || config.defaultMessage;
      const formattedMessage = rawTemplate
        .replace(/{streamer}/g, live.displayName)
        .replace(/{platform}/g, PLATFORM_NAMES[streamer.platform])
        .replace(/{title}/g, live.title || 'Live en cours')
        .replace(/{game}/g, live.game || 'En direct')
        .replace(/{url}/g, live.streamUrl);

      const onlineEmoji = getAppEmoji('etho_a_online') || '🔴';
      const sparklesEmoji = getAppEmoji('etho_a_sparkles') || '✨';

      const embed = new EmbedBuilder()
        .setColor(PLATFORM_COLORS[streamer.platform])
        .setAuthor({
          name: `${PLATFORM_NAMES[streamer.platform]} · En Direct`,
          iconURL: PLATFORM_ICONS[streamer.platform],
          url: live.streamUrl,
        })
        .setTitle(`${onlineEmoji} ${live.displayName} est en LIVE !`)
        .setURL(live.streamUrl)
        .setDescription(
          `**${live.title || 'Diffusion en direct'}**\n\n` +
            `🎮 **Catégorie :** \`${live.game || 'Général'}\`\n` +
            (live.viewers ? `👥 **Spectateurs :** \`${live.viewers.toLocaleString('fr-FR')}\`\n` : '') +
            `\n${sparklesEmoji} *Cliquez sur le bouton ci-dessous pour rejoindre la diffusion !*`
        )
        .setTimestamp();

      if (live.thumbnailUrl) {
        embed.setImage(live.thumbnailUrl);
      }
      if (live.avatarUrl) {
        embed.setThumbnail(live.avatarUrl);
      }
      embed.setFooter({
        text: `ETHONE Stream Alerts · ${PLATFORM_NAMES[streamer.platform]}`,
        iconURL: this.client.user?.displayAvatarURL() || undefined,
      });

      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(`Regarder sur ${PLATFORM_NAMES[streamer.platform]}`)
          .setStyle(ButtonStyle.Link)
          .setURL(live.streamUrl)
          .setEmoji('📺')
      );

      const sent = await channel.send({
        content: pingContent ? `${pingContent}\n${formattedMessage}` : formattedMessage,
        embeds: [embed],
        components: [row],
      });

      streamerStorage.updateStreamer(streamer.guildId, streamer.id, {
        lastAlertMessageId: sent.id,
        lastAlertChannelId: channel.id,
      });

      // Gestion du rôle @En Live automatique
      if (config.autoLiveRoleEnabled && config.liveRoleId) {
        await this.assignLiveRole(streamer.guildId, streamer.username, config.liveRoleId, true);
      }

      logger.info(
        `[Streamers] Alerte live envoyée pour ${streamer.username} (${streamer.platform}) sur le serveur ${streamer.guildId}`
      );
      return sent.id;
    } catch (err) {
      logger.error(`[Streamers] Échec de l'envoi de l'alerte pour ${streamer.username}:`, err);
      return null;
    }
  }

  /**
   * Traitement quand le live se termine (nettoyage de message ou retrait de rôle).
   */
  public async handleStreamEnded(streamer: StreamerItem): Promise<void> {
    if (!this.client) return;
    const config = streamerStorage.getConfig(streamer.guildId);

    // Retrait du rôle @En Live
    if (config.autoLiveRoleEnabled && config.liveRoleId) {
      await this.assignLiveRole(streamer.guildId, streamer.username, config.liveRoleId, false);
    }

    // Nettoyage éventuel du message
    if (config.cleanUpFinishedStreams && streamer.lastAlertChannelId && streamer.lastAlertMessageId) {
      try {
        const channel = await this.client.channels.fetch(streamer.lastAlertChannelId).catch(() => null);
        if (channel && channel instanceof TextChannel) {
          const msg = await channel.messages.fetch(streamer.lastAlertMessageId).catch(() => null);
          if (msg) {
            await msg.delete().catch(() => null);
          }
        }
      } catch {
        // silencieux
      }
    }
  }

  /**
   * Associe ou retire le rôle en live aux membres de la guilde dont le pseudo correspond.
   */
  private async assignLiveRole(
    guildId: string,
    streamerUsername: string,
    roleId: string,
    add: boolean
  ): Promise<void> {
    if (!this.client) return;
    try {
      const guild = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const members = await guild.members.fetch();
      const target = members.find(
        (m) =>
          m.user.username.toLowerCase() === streamerUsername.toLowerCase() ||
          m.displayName.toLowerCase() === streamerUsername.toLowerCase()
      );
      if (!target) return;

      if (add) {
        if (!target.roles.cache.has(roleId)) {
          await target.roles.add(roleId).catch(() => null);
        }
      } else {
        if (target.roles.cache.has(roleId)) {
          await target.roles.remove(roleId).catch(() => null);
        }
      }
    } catch {
      // Ignoré
    }
  }
}

export const streamerService = new StreamerService();
