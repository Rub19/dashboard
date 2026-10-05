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
    // Vérification périodique automatique toutes les 2 minutes
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
        if (!streamer.paused) {
          await this.checkStreamer(streamer);
        }
      }
    } catch (err) {
      logger.error('[Streamers] Erreur générale lors de la vérification des flux :', err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Détermine le salon de notification cible selon la hiérarchie :
   * 1. Salon spécifique au streamer
   * 2. Salon spécifique à la plateforme (Twitch, YouTube, Kick)
   * 3. Salon par défaut de la guilde
   */
  public resolveTargetChannelId(streamer: StreamerItem, config: StreamerConfig): string | null {
    if (streamer.channelId) return streamer.channelId;
    if (streamer.platform === 'twitch' && config.twitchChannelId) return config.twitchChannelId;
    if (streamer.platform === 'youtube' && config.youtubeChannelId) return config.youtubeChannelId;
    if (streamer.platform === 'kick' && config.kickChannelId) return config.kickChannelId;
    return config.defaultChannelId;
  }

  /**
   * Détermine le contenu de la mention (ping) selon la hiérarchie :
   * 1. Mode spécifique au streamer (none, here, everyone, role)
   * 2. Rôle spécifique à la plateforme
   * 3. Réglage par défaut du serveur
   */
  public resolvePingContent(streamer: StreamerItem, config: StreamerConfig): string {
    const mode = streamer.pingMode || 'default';

    if (mode === 'none') return '';
    if (mode === 'here') return '@here';
    if (mode === 'everyone') return '@everyone';
    if (mode === 'role') {
      return streamer.pingRoleId ? `<@&${streamer.pingRoleId}>` : '';
    }

    // mode === 'default' -> Vérifie d'abord les rôles par plateforme
    if (streamer.platform === 'twitch' && config.twitchRoleId) {
      return `<@&${config.twitchRoleId}>`;
    }
    if (streamer.platform === 'youtube' && config.youtubeRoleId) {
      return `<@&${config.youtubeRoleId}>`;
    }
    if (streamer.platform === 'kick' && config.kickRoleId) {
      return `<@&${config.kickRoleId}>`;
    }

    // Fallback sur la configuration globale
    if (config.defaultPing === 'everyone') return '@everyone';
    if (config.defaultPing === 'here') return '@here';
    if (config.defaultPing === 'role' && config.defaultRoleId) {
      return `<@&${config.defaultRoleId}>`;
    }

    return '';
  }

  /**
   * Vérifie un streamer spécifique et déclenche l'alerte Discord si nécessaire.
   */
  public async checkStreamer(streamer: StreamerItem): Promise<LiveStreamDetails> {
    if (streamer.paused) {
      return {
        platform: streamer.platform,
        username: streamer.username,
        displayName: streamer.displayName || streamer.username,
        isLive: false,
        streamUrl: streamer.streamUrl || `https://${streamer.platform}.com/${streamer.username}`,
      };
    }

    const live = await this.fetchLiveStatus(streamer.platform, streamer.username);
    const wasLive = streamer.isLive;
    const config = streamerStorage.getConfig(streamer.guildId);

    if (live.isLive && !wasLive) {
      // Vérification du filtre de jeu/catégorie si spécifié
      if (streamer.gameFilter && streamer.gameFilter.trim()) {
        const filter = streamer.gameFilter.toLowerCase().trim();
        const currentGame = (live.game || '').toLowerCase();
        if (!currentGame.includes(filter)) {
          logger.info(`[Streamers] Live ignoré pour ${streamer.username}: le jeu "${live.game}" ne correspond pas au filtre "${streamer.gameFilter}".`);
          return live;
        }
      }

      // Vérification du seuil minimal de spectateurs
      if (streamer.minViewers > 0 && (live.viewers || 0) < streamer.minViewers) {
        logger.info(`[Streamers] Live ignoré pour ${streamer.username}: viewers ${live.viewers} < seuil ${streamer.minViewers}.`);
        return live;
      }

      // Vérification du cooldown anti-spam (ex: reconnexion après coupure de live de quelques minutes)
      if (streamer.lastLiveAt && config.cooldownMinutes > 0) {
        const diffMs = Date.now() - new Date(streamer.lastLiveAt).getTime();
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes < config.cooldownMinutes && streamer.lastAlertMessageId) {
          logger.info(`[Streamers] Cooldown actif (${Math.round(diffMinutes)}m < ${config.cooldownMinutes}m) pour ${streamer.username}.`);
          // Ne re-notifie pas, mais met à jour l'état
          streamerStorage.updateStreamer(streamer.guildId, streamer.id, {
            isLive: true,
            title: live.title,
            game: live.game,
            viewers: live.viewers,
          });
          return live;
        }
      }

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

    const channelId = this.resolveTargetChannelId(streamer, config);
    if (!channelId) return null;

    try {
      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) return null;

      // Construction du message de notification et du ping
      const pingContent = this.resolvePingContent(streamer, config);

      const rawTemplate = streamer.customMessage || config.defaultMessage;
      const formattedMessage = rawTemplate
        .replace(/{streamer}/g, live.displayName)
        .replace(/{platform}/g, PLATFORM_NAMES[streamer.platform])
        .replace(/{title}/g, live.title || 'Live en cours')
        .replace(/{game}/g, live.game || 'En direct')
        .replace(/{url}/g, live.streamUrl);

      const onlineEmoji = getAppEmoji('etho_a_online') || '🔴';
      const sparklesEmoji = getAppEmoji('etho_a_sparkles') || '✨';

      // Couleur de l'embed : personnalisée streamer > globale config > couleur de plateforme
      let embedColor = PLATFORM_COLORS[streamer.platform];
      if (streamer.customColor) {
        const parsed = parseInt(streamer.customColor.replace('#', ''), 16);
        if (!isNaN(parsed)) embedColor = parsed;
      } else if (config.embedColor) {
        const parsed = parseInt(config.embedColor.replace('#', ''), 16);
        if (!isNaN(parsed)) embedColor = parsed;
      }

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
          name: `${PLATFORM_NAMES[streamer.platform]} · En Direct`,
          iconURL: PLATFORM_ICONS[streamer.platform],
          url: live.streamUrl,
        })
        .setTitle(`${onlineEmoji} ${live.displayName} est en LIVE !`)
        .setURL(live.streamUrl);

      // Description conditionnelle
      let desc = `**${live.title || 'Diffusion en direct'}**\n\n`;
      if (config.showGame !== false) {
        desc += `🎮 **Catégorie :** \`${live.game || 'Général'}\`\n`;
      }
      if (config.showViewers !== false && live.viewers !== undefined) {
        desc += `👥 **Spectateurs :** \`${live.viewers.toLocaleString('fr-FR')}\`\n`;
      }
      desc += `\n${sparklesEmoji} *Cliquez sur le bouton ci-dessous pour rejoindre la diffusion !*`;
      embed.setDescription(desc);
      embed.setTimestamp();

      if (config.showThumbnail !== false && live.thumbnailUrl) {
        embed.setImage(live.thumbnailUrl);
      }
      if (live.avatarUrl) {
        embed.setThumbnail(live.avatarUrl);
      }
      embed.setFooter({
        text: `ETHONE Stream Alerts · ${PLATFORM_NAMES[streamer.platform]}`,
        iconURL: this.client.user?.displayAvatarURL() || undefined,
      });

      const buttonLabel = config.customButtonText || `Regarder sur ${PLATFORM_NAMES[streamer.platform]}`;
      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(buttonLabel)
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

      // Gestion du rôle @En Live automatique (via discordUserId si lié, sinon nom d'utilisateur)
      if (config.autoLiveRoleEnabled && config.liveRoleId) {
        await this.assignLiveRole(streamer.guildId, streamer, config.liveRoleId, true);
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
   * Traitement quand le live se termine (nettoyage de message ou mise à jour hors-ligne).
   */
  public async handleStreamEnded(streamer: StreamerItem): Promise<void> {
    if (!this.client) return;
    const config = streamerStorage.getConfig(streamer.guildId);

    // Retrait du rôle @En Live
    if (config.autoLiveRoleEnabled && config.liveRoleId) {
      await this.assignLiveRole(streamer.guildId, streamer, config.liveRoleId, false);
    }

    if (!streamer.lastAlertChannelId || !streamer.lastAlertMessageId) return;

    try {
      const channel = await this.client.channels.fetch(streamer.lastAlertChannelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) return;

      const msg = await channel.messages.fetch(streamer.lastAlertMessageId).catch(() => null);
      if (!msg) return;

      if (config.offlineAction === 'delete' || config.cleanUpFinishedStreams) {
        await msg.delete().catch(() => null);
      } else if (config.offlineAction === 'update_offline') {
        const offlineEmbed = new EmbedBuilder()
          .setColor(0x475569) // slate gray
          .setAuthor({
            name: `${PLATFORM_NAMES[streamer.platform]} · Diffusion terminée`,
            iconURL: PLATFORM_ICONS[streamer.platform],
          })
          .setTitle(`⚫ ${streamer.displayName || streamer.username} a terminé son direct`)
          .setDescription(
            `La diffusion sur **${PLATFORM_NAMES[streamer.platform]}** est terminée.\nMerci à toutes et à tous d'avoir suivi le stream !`
          )
          .setFooter({ text: 'ETHONE Stream Alerts · Stream hors ligne' })
          .setTimestamp();

        const replayRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(`Voir la chaîne ${PLATFORM_NAMES[streamer.platform]}`)
            .setStyle(ButtonStyle.Link)
            .setURL(streamer.streamUrl || `https://${streamer.platform}.com/${streamer.username}`)
            .setEmoji('🎬')
        );

        await msg.edit({
          content: null,
          embeds: [offlineEmbed],
          components: [replayRow],
        }).catch(() => null);
      }
    } catch {
      // silencieux
    }
  }

  /**
   * Associe ou retire le rôle en direct.
   * Utilise en priorité `discordUserId` s'il est renseigné, sinon cherche par concordance de pseudo.
   */
  private async assignLiveRole(
    guildId: string,
    streamer: StreamerItem,
    roleId: string,
    add: boolean
  ): Promise<void> {
    if (!this.client) return;
    try {
      const guild = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      let targetMember = null;

      // 1. Liaison directe Discord ID
      if (streamer.discordUserId) {
        targetMember = await guild.members.fetch(streamer.discordUserId).catch(() => null);
      }

      // 2. Fallback par nom d'utilisateur Discord
      if (!targetMember) {
        const members = await guild.members.fetch();
        const streamerName = streamer.username.toLowerCase();
        targetMember = members.find(
          (m) =>
            m.user.username.toLowerCase() === streamerName ||
            m.displayName.toLowerCase() === streamerName
        );
      }

      if (!targetMember) return;

      if (add) {
        if (!targetMember.roles.cache.has(roleId)) {
          await targetMember.roles.add(roleId).catch(() => null);
          logger.info(`[Streamers] Rôle @En Live attribué à ${targetMember.user.tag} (${targetMember.id})`);
        }
      } else {
        if (targetMember.roles.cache.has(roleId)) {
          await targetMember.roles.remove(roleId).catch(() => null);
          logger.info(`[Streamers] Rôle @En Live retiré de ${targetMember.user.tag} (${targetMember.id})`);
        }
      }
    } catch (err) {
      logger.debug(`[Streamers] Erreur gestion rôle en live:`, err);
    }
  }
}

export const streamerService = new StreamerService();
