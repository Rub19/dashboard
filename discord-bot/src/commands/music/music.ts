import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { DiscordMusicPanel } from '../../modules/music/ui/discordMusicPanel.js';
import { RepeatMode } from '../../modules/music/types/music.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)] });
const replySuccess = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(msg)] });
const replyInfo = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(msg)] });

export const musicCommand: Command = {
  name: 'music',
  description: 'Contrôle du lecteur de musique',
  category: 'Musique',
  aliases: ['m', 'p', 'player'],
  slashData: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Centre de contrôle musical ETHONE')
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Joue une musique ou l\'ajoute à la file d\'attente')
        .addStringOption((opt) =>
          opt
            .setName('recherche')
            .setDescription('Titre, lien YouTube, Spotify ou SoundCloud')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('pause').setDescription('Met la lecture en pause'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Reprend la lecture'))
    .addSubcommand((sub) => sub.setName('skip').setDescription('Passe à la musique suivante'))
    .addSubcommand((sub) => sub.setName('previous').setDescription('Revient à la musique précédente'))
    .addSubcommand((sub) => sub.setName('stop').setDescription('Arrête la lecture et vide la file'))
    .addSubcommand((sub) => sub.setName('queue').setDescription('Affiche la file d\'attente'))
    .addSubcommand((sub) => sub.setName('nowplaying').setDescription('Affiche la musique en cours'))
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Règle le volume sonore (0-100%)')
        .addIntegerOption((opt) =>
          opt.setName('niveau').setDescription('Niveau de volume (0-100)').setMinValue(0).setMaxValue(100).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('seek')
        .setDescription('Se déplace à un moment précis (en secondes)')
        .addIntegerOption((opt) =>
          opt.setName('secondes').setDescription('Position en secondes').setMinValue(0).setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('shuffle').setDescription('Mélange aléatoirement la file d\'attente'))
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Change le mode de répétition')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Mode de répétition')
            .setRequired(true)
            .addChoices(
              { name: 'Désactivé (OFF)', value: 'OFF' },
              { name: 'Répéter le titre (SONG)', value: 'SONG' },
              { name: 'Répéter la file (QUEUE)', value: 'QUEUE' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire une musique de la file')
        .addIntegerOption((opt) =>
          opt.setName('position').setDescription('Numéro du titre dans la file (1, 2...)').setMinValue(1).setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('clear').setDescription('Vide entièrement la file d\'attente'))
    .addSubcommand((sub) => sub.setName('panel').setDescription('Affiche le panneau de contrôle interactif')),

  execute: async (ctx: CommandContext) => {
    const guild = ctx.guild;
    const member = ctx.member;
    const t = getTranslation(ctx.guildConfig.language);

    if (!guild || !member) {
      await replyError(ctx, t.guild_only_command);
      return;
    }

    // Récupérer le sous-ordre (slash command ou prefix arguments)
    let subcommand = 'panel';
    let queryArg = '';

    if (ctx.isSlash && ctx.interaction) {
      const slash = ctx.interaction as any;
      subcommand = slash.options.getSubcommand?.() || 'panel';
      queryArg =
        slash.options.getString('recherche') ||
        slash.options.getString('mode') ||
        String(slash.options.getInteger('niveau') || slash.options.getInteger('secondes') || slash.options.getInteger('position') || '');
    } else {
      subcommand = ctx.args[0]?.toLowerCase() || 'panel';
      queryArg = ctx.args.slice(1).join(' ');
    }

    // Vérification stricte du salon vocal pour les actions de lecture et de contrôle
    const voiceRequiredSubcommands = [
      'play', 'p', 'pause', 'resume', 'skip', 's', 'previous', 'prev',
      'stop', 'volume', 'vol', 'seek', 'shuffle', 'loop', 'remove', 'clear'
    ];

    if (voiceRequiredSubcommands.includes(subcommand)) {
      const userVoice = member.voice?.channel;
      if (!userVoice) {
        await replyError(ctx, t.voice_required);
        return;
      }

      const botVoice = guild.members.me?.voice?.channel;
      if (botVoice && botVoice.id !== userVoice.id) {
        await replyError(
          ctx,
          formatString(t.voice_different, { channel: `<#${botVoice.id}>` })
        );
        return;
      }
    }

    // Différer immédiatement : la recherche/lecture d'une piste (providers YouTube/Spotify/SoundCloud)
    // et les autres opérations du lecteur peuvent dépasser la fenêtre de 3s de Discord et invalider
    // le token d'interaction ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    switch (subcommand) {
      case 'play':
      case 'p': {
        if (!queryArg.trim()) {
          await replyError(ctx, t.music_no_query);
          return;
        }

        const res = await musicService.play(guild, member, queryArg);
        if (!res.success) {
          await replyError(ctx, res.error || t.music_play_failed);
          return;
        }

        const track = res.track!;
        if (res.playlistCount && res.playlistCount > 1) {
          const embed = ctx
            .createEmbed('success')
            .setTitle('🎶 Playlist ajoutée')
            .setDescription(
              `**${res.playlistCount}** titres ajoutés à la file.\n` +
                (res.queuePosition === 0
                  ? `▶️ Lecture : [${track.title}](${track.url})`
                  : `Prochain : [${track.title}](${track.url})`),
            )
            .setThumbnail(track.thumbnail);
          await ctx.reply({ embeds: [embed] });
        } else if (res.queuePosition === 0) {
          const embed = ctx
            .createEmbed('success')
            .setTitle(t.music_now_playing_title)
            .setDescription(formatString(t.music_now_playing_desc, { title: track.title, url: track.url, artist: track.artist, duration: DiscordMusicPanel.formatTime(track.duration) }))
            .setThumbnail(track.thumbnail);
          await ctx.reply({ embeds: [embed] });
        } else {
          const embed = ctx
            .createEmbed('info')
            .setTitle(t.music_added_queue_title)
            .setDescription(formatString(t.music_added_queue_desc, { title: track.title, url: track.url, position: res.queuePosition ?? 0 }))
            .setThumbnail(track.thumbnail);
          await ctx.reply({ embeds: [embed] });
        }
        break;
      }

      case 'pause': {
        const res = musicService.pause(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, t.music_paused);
        } else {
          await replyError(ctx, res.error || t.music_pause_failed);
        }
        break;
      }

      case 'resume': {
        const res = musicService.resume(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, t.music_resumed);
        } else {
          await replyError(ctx, res.error || t.music_resume_failed);
        }
        break;
      }

      case 'skip':
      case 's': {
        const res = await musicService.skip(guild.id, member);
        if (res.success) {
          if (res.nextTrack) {
            await replySuccess(ctx, formatString(t.music_skipped, { title: res.nextTrack.title }));
          } else {
            await replyInfo(ctx, t.music_queue_end);
          }
        } else {
          await replyError(ctx, res.error || t.music_skip_failed);
        }
        break;
      }

      case 'previous':
      case 'prev': {
        const res = await musicService.previous(guild.id, member);
        if (res.success && res.prevTrack) {
          await replySuccess(ctx, formatString(t.music_previous, { title: res.prevTrack.title }));
        } else {
          await replyError(ctx, res.error || t.music_no_previous);
        }
        break;
      }

      case 'stop': {
        const res = musicService.stop(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, t.music_stopped);
        } else {
          await replyError(ctx, res.error || t.music_stop_failed);
        }
        break;
      }

      case 'volume':
      case 'vol': {
        const vol = parseInt(queryArg, 10);
        if (isNaN(vol) || vol < 0 || vol > 100) {
          const state = musicService.getState(guild.id);
          await replyInfo(ctx, formatString(t.music_current_volume, { volume: state.volume }));
          return;
        }
        const res = musicService.setVolume(guild.id, vol, member);
        if (res.success) {
          await replySuccess(ctx, formatString(t.music_volume_set, { volume: vol }));
        } else {
          await replyError(ctx, res.error || t.music_volume_failed);
        }
        break;
      }

      case 'seek': {
        const sec = parseInt(queryArg, 10);
        if (isNaN(sec) || sec < 0) {
          await replyError(ctx, t.music_seek_invalid);
          return;
        }
        const res = musicService.seek(guild.id, sec, member);
        if (res.success) {
          await replySuccess(ctx, formatString(t.music_seek_set, { time: DiscordMusicPanel.formatTime(sec) }));
        } else {
          await replyError(ctx, res.error || t.music_seek_failed);
        }
        break;
      }

      case 'shuffle': {
        const res = musicService.shuffle(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, t.music_shuffled);
        } else {
          await replyError(ctx, res.error || t.music_shuffle_failed);
        }
        break;
      }

      case 'loop': {
        const mode = (queryArg.toUpperCase() as RepeatMode) || 'OFF';
        const res = musicService.setRepeatMode(guild.id, mode, member);
        if (res.success) {
          await replySuccess(ctx, formatString(t.music_loop_set, { mode }));
        } else {
          await replyError(ctx, res.error || t.music_loop_invalid);
        }
        break;
      }

      case 'remove': {
        const pos = parseInt(queryArg, 10);
        if (isNaN(pos) || pos < 1) {
          await replyError(ctx, t.music_remove_invalid);
          return;
        }
        const res = musicService.removeFromQueue(guild.id, pos - 1, member);
        if (res.success && res.removed) {
          await replySuccess(ctx, formatString(t.music_removed, { title: res.removed.title }));
        } else {
          await replyError(ctx, res.error || t.music_remove_invalid_position);
        }
        break;
      }

      case 'clear': {
        const res = musicService.clearQueue(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, t.music_queue_cleared);
        } else {
          await replyError(ctx, res.error || t.music_queue_clear_failed);
        }
        break;
      }

      case 'nowplaying':
      case 'np': {
        const state = musicService.getState(guild.id);
        const panel = DiscordMusicPanel.buildPanelMessage(state);
        await ctx.reply(panel);
        break;
      }

      case 'panel':
      default: {
        const state = musicService.getState(guild.id);
        const panel = DiscordMusicPanel.buildPanelMessage(state);
        await ctx.reply(panel);
        break;
      }
    }
  },
};
