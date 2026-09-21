import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type VoiceBasedChannel } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { config } from '../../config.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { lavalinkManager } from '../../modules/music/services/lavalinkManager.js';
import { voiceStayService } from '../../modules/music/services/voiceStayService.js';
import type { MusicSource } from '../../modules/music/types/music.js';

/**
 * /join · /disconnect · /voice-status — présence du bot dans un salon vocal, dont le mode
 * « 24h/24 » : le bot reste dans le salon choisi et y revient tout seul (voir voiceStayService).
 */

const SOURCE_LABEL: Record<MusicSource, string> = {
  YOUTUBE: '▶️ YouTube',
  SOUNDCLOUD: '🟠 SoundCloud',
  SPOTIFY: '🟢 Spotify',
  DIRECT: '🔗 Flux direct',
  CUSTOM: '🎼 Personnalisé',
};

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)], ephemeral: true });

/** « 3 j 4 h 12 min » — au plus trois unités, la plus grande d'abord. */
function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} j`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (!d && !h && !m) parts.push(`${s} s`);
  return parts.slice(0, 3).join(' ');
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function progressBar(position: number, duration: number, length = 16): string {
  if (!duration || duration <= 0) return '🔴 flux en direct';
  const filled = Math.min(length, Math.max(0, Math.round((position / duration) * length)));
  return '▰'.repeat(filled) + '▱'.repeat(length - filled);
}

const megabytes = (bytes: number): string => `${Math.round(bytes / 1024 / 1024)} Mo`;

function canManageVoice(ctx: CommandContext): boolean {
  if (ctx.author.id === config.botOwnerId) return true;
  const perms = ctx.member?.permissions;
  return Boolean(perms?.has(PermissionFlagsBits.ManageGuild) || perms?.has(PermissionFlagsBits.MoveMembers));
}

const listenersIn = (channel: VoiceBasedChannel): number => channel.members.filter((m) => !m.user.bot).size;

function voicePing(guildId: string): string {
  if (config.musicBackend !== 'lavalink') return 'n/d';
  const ping = lavalinkManager.getPlayer(guildId)?.ping;
  return typeof ping === 'number' && ping >= 0 ? `${ping} ms` : 'n/d';
}

export const joinCommand: Command = {
  name: 'join',
  description: 'Fait rejoindre le bot dans un salon vocal (et le garde 24h/24)',
  category: 'Musique',
  aliases: ['rejoindre'],
  slashData: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Fait rejoindre le bot dans un salon vocal et l\'y garde 24h/24')
    .addChannelOption((opt) =>
      opt
        .setName('salon')
        .setDescription('Salon vocal à rejoindre (par défaut : celui où tu es)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('permanent')
        .setDescription('Rester en permanence dans le salon, même sans musique (24h/24) — activé par défaut')
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild || !ctx.member) return;
    if (!canManageVoice(ctx)) {
      await replyError(ctx, 'Il te faut la permission **Déplacer des membres** ou **Gérer le serveur** pour utiliser cette commande.');
      return;
    }

    const pickedId = (ctx.interaction?.options.getChannel('salon') as { id: string } | null)?.id;
    const picked = pickedId ? ctx.guild.channels.cache.get(pickedId) : null;
    const target = (picked ?? ctx.member.voice?.channel ?? null) as VoiceBasedChannel | null;
    if (!target || !target.isVoiceBased()) {
      await replyError(ctx, 'Rejoins d\'abord un salon vocal, ou précise-en un avec l\'option `salon`.');
      return;
    }

    const me = ctx.guild.members.me;
    const perms = me ? target.permissionsFor(me) : null;
    const missing: string[] = [];
    if (!perms?.has(PermissionFlagsBits.Connect)) missing.push('Connexion');
    if (!perms?.has(PermissionFlagsBits.Speak)) missing.push('Parler');
    if (missing.length > 0) {
      await replyError(ctx, `Il me manque la permission **${missing.join('** et **')}** dans <#${target.id}>.`);
      return;
    }

    const permanent = ctx.interaction?.options.getBoolean('permanent') ?? true;
    await ctx.deferReply();

    const player = musicService.getPlayer(ctx.guild.id, true);
    if (!player) {
      await replyError(ctx, 'Le lecteur audio est indisponible pour le moment.');
      return;
    }
    const alreadyThere = voiceStayService.isConnected(ctx.guild, target.id);
    const connected = alreadyThere ? true : await player.connect(target);
    if (!connected) {
      await replyError(ctx, `Impossible de rejoindre <#${target.id}>. Le serveur audio est peut-être indisponible, réessaie dans un instant.`);
      return;
    }
    if (!alreadyThere || voiceStayService.getJoinedAt(ctx.guild.id) === null) voiceStayService.markJoined(ctx.guild.id);
    musicService.updateSettings(ctx.guild.id, { stayChannelId: permanent ? target.id : null });

    const embed = ctx
      .createEmbed('success')
      .setTitle('🎧 Connecté au vocal')
      .setDescription(
        permanent
          ? `Je suis dans <#${target.id}> et j'y reste **24h/24**. Si je suis déconnecté, je reviens tout seul.`
          : `Je suis dans <#${target.id}>. Je repartirai après un moment d'inactivité.`
      )
      .addFields(
        { name: '📍 Salon', value: `<#${target.id}>`, inline: true },
        { name: '♾️ Mode 24h/24', value: permanent ? '✅ Activé' : '⏸️ Désactivé', inline: true },
        { name: '👥 Auditeurs', value: `${listenersIn(target)}`, inline: true },
        { name: '📶 Latence vocale', value: voicePing(ctx.guild.id), inline: true }
      );
    await ctx.reply({ embeds: [embed] });
  },
};

export const disconnectCommand: Command = {
  name: 'disconnect',
  description: 'Déconnecte le bot du salon vocal (et désactive le mode 24h/24)',
  category: 'Musique',
  aliases: ['deconnecter', 'dc'],
  slashData: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Déconnecte le bot du salon vocal et désactive le mode 24h/24'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild || !ctx.member) return;
    if (!canManageVoice(ctx)) {
      await replyError(ctx, 'Il te faut la permission **Déplacer des membres** ou **Gérer le serveur** pour utiliser cette commande.');
      return;
    }

    const gid = ctx.guild.id;
    const current = ctx.guild.members.me?.voice.channel ?? null;
    const stayId = voiceStayService.getStayChannelId(gid);
    if (!current && !stayId) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('Je ne suis dans aucun salon vocal.')], ephemeral: true });
      return;
    }

    const state = musicService.getState(gid);
    const joinedAt = voiceStayService.getJoinedAt(gid);
    const cleared = state.queueLength + (state.currentTrack ? 1 : 0);

    // Le mode 24h/24 est retiré AVANT de partir : sinon le service de surveillance ramènerait le bot.
    musicService.updateSettings(gid, { stayChannelId: null });
    musicService.getPlayer(gid, false)?.disconnect();
    voiceStayService.markLeft(gid);
    // Filet de sécurité : si Discord garde encore le bot dans le salon (session orpheline), on l'en retire.
    await ctx.guild.members.me?.voice.disconnect().catch(() => {});

    const where = current?.id ?? stayId;
    const embed = ctx
      .createEmbed('neutral')
      .setTitle('👋 Déconnecté')
      .setDescription(where ? `J'ai quitté <#${where}>.` : "J'ai quitté le salon vocal.")
      .addFields(
        { name: '♾️ Mode 24h/24', value: '❌ Désactivé', inline: true },
        { name: '⏱️ Présence', value: joinedAt ? formatDuration(Date.now() - joinedAt) : 'n/d', inline: true },
        { name: '🎵 File vidée', value: cleared > 0 ? `${cleared} titre${cleared > 1 ? 's' : ''}` : 'vide', inline: true }
      );
    await ctx.reply({ embeds: [embed] });
  },
};

export const voiceStatusCommand: Command = {
  name: 'voice-status',
  description: 'Affiche l\'état du bot dans le vocal : salon, mode 24h/24, lecture, latence et serveur audio',
  category: 'Musique',
  aliases: ['vstatus', 'vocal'],
  slashData: new SlashCommandBuilder()
    .setName('voice-status')
    .setDescription('État du bot dans le vocal : salon, mode 24h/24, lecture, latence et serveur audio'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const gid = ctx.guild.id;
    const guild = ctx.guild;
    const me = guild.members.me;
    const current = me?.voice.channel ?? null;
    const stayId = voiceStayService.getStayChannelId(gid);
    const state = musicService.getState(gid);
    const track = state.currentTrack;
    const connected = Boolean(current);

    const embed = ctx
      .createEmbed(connected ? 'success' : 'neutral')
      .setTitle('📡 Statut vocal')
      .setDescription(
        connected
          ? `🟢 **Connecté** à <#${current!.id}>`
          : stayId
            ? `🟠 **Hors ligne** — je dois être dans <#${stayId}> et j'y retourne dès que possible.`
            : '🔴 **Non connecté** — utilise `/join` pour me faire venir.'
      );

    const thumb = track?.thumbnail || ctx.client.user?.displayAvatarURL();
    if (thumb) embed.setThumbnail(thumb);

    const joinedAt = voiceStayService.getJoinedAt(gid);
    embed.addFields(
      {
        name: '♾️ Mode 24h/24',
        value: stayId ? `✅ Actif · <#${stayId}>` : '❌ Inactif',
        inline: true,
      },
      {
        name: '⏱️ Connecté depuis',
        value: connected && joinedAt ? `<t:${Math.floor(joinedAt / 1000)}:R>` : '—',
        inline: true,
      },
      { name: '👥 Auditeurs', value: current ? `${listenersIn(current)}` : '—', inline: true }
    );

    if (track) {
      const statusIcon = state.status === 'PAUSED' ? '⏸️' : '▶️';
      embed.addFields({
        name: `${statusIcon} En lecture`,
        value: [
          `**${track.title}** — ${track.artist}`,
          `${progressBar(state.position, state.duration)} \`${formatClock(state.position)} / ${state.duration ? formatClock(state.duration) : '∞'}\``,
          `${SOURCE_LABEL[track.source] ?? track.source} · demandé par ${track.requestedBy.tag}`,
        ].join('\n'),
      });
    } else {
      embed.addFields({ name: '🎵 En lecture', value: 'Rien pour le moment.' });
    }

    embed.addFields(
      { name: '🔊 Volume', value: state.muted ? '🔇 Coupé' : `${state.volume}%`, inline: true },
      { name: '🔁 Répétition', value: state.repeatMode === 'OFF' ? 'Désactivée' : state.repeatMode === 'SONG' ? 'Titre' : 'File', inline: true },
      { name: '📜 File d\'attente', value: state.queueLength > 0 ? `${state.queueLength} titre${state.queueLength > 1 ? 's' : ''}` : 'vide', inline: true },
      {
        name: '📶 Latence',
        value: `Discord **${Math.round(ctx.client.ws.ping)} ms**\nVocal **${voicePing(gid)}**`,
        inline: true,
      }
    );

    if (config.musicBackend === 'lavalink') {
      const node = lavalinkManager.getNodeStats();
      embed.addFields({
        name: '🎛️ Serveur audio',
        value: node
          ? [
              `${node.connected ? '🟢' : '🔴'} Lavalink · en ligne depuis ${node.uptimeMs ? formatDuration(node.uptimeMs) : 'n/d'}`,
              `🧠 ${megabytes(node.memoryUsed)} / ${megabytes(node.memoryAllocated)} · ⚙️ CPU ${Math.round(node.cpuLavalink * 100)}%`,
              `🎧 ${node.playing} lecteur${node.playing > 1 ? 's' : ''} actif${node.playing > 1 ? 's' : ''} sur ${node.players}`,
            ].join('\n')
          : '🔴 Lavalink injoignable',
        inline: true,
      });
    }

    const mem = process.memoryUsage();
    embed.addFields({
      name: '🤖 Bot',
      value: [`⏳ ${formatDuration(process.uptime() * 1000)}`, `🧠 ${megabytes(mem.rss)}`, `🌐 ${ctx.client.guilds.cache.size} serveur${ctx.client.guilds.cache.size > 1 ? 's' : ''}`].join('\n'),
      inline: true,
    });

    await ctx.reply({ embeds: [embed] });
  },
};
