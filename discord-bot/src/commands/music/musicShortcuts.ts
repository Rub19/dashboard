import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type VoiceBasedChannel } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { DiscordMusicPanel } from '../../modules/music/ui/discordMusicPanel.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)], ephemeral: true });
const replySuccess = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(msg)] });
const replyInfo = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(msg)] });

function checkVoice(ctx: CommandContext): boolean {
  if (!ctx.guild || !ctx.member) return false;
  const t = getTranslation(ctx.guildConfig.language);
  const userVoice = ctx.member.voice?.channel;
  if (!userVoice) {
    replyError(ctx, t.voice_required);
    return false;
  }
  const botVoice = ctx.guild.members.me?.voice?.channel;
  if (botVoice && botVoice.id !== userVoice.id) {
    replyError(
      ctx,
      formatString(t.voice_different, { channel: `<#${botVoice.id}>` })
    );
    return false;
  }
  return true;
}

// Vérifie que le bot a bien Connexion + Parler dans le salon vocal de l'utilisateur
// AVANT de tenter de rejoindre. Sans ce garde-fou, le bot rejoint silencieusement
// un salon où il ne peut pas parler : /play répond "en cours de lecture" (le flux
// audio se crée bien côté code) mais aucun son n'est jamais audible côté Discord,
// et rien ne le signale — exactement la classe de bug "aucune erreur, aucun son"
// qu'on cherchait. On échoue maintenant vite et clairement, avec un DM de secours
// au cas où le message dans le salon passerait inaperçu.
async function checkVoicePermissions(ctx: CommandContext, channel: VoiceBasedChannel): Promise<boolean> {
  const t = getTranslation(ctx.guildConfig.language);
  const botMember = ctx.guild!.members.me;
  if (!botMember) return true;

  const perms = channel.permissionsFor(botMember);
  const missing: string[] = [];
  if (!perms?.has(PermissionFlagsBits.Connect)) missing.push('Connexion');
  if (!perms?.has(PermissionFlagsBits.Speak)) missing.push('Parler');

  if (missing.length === 0) return true;

  const permissionList = missing.join(', ');

  await replyError(
    ctx,
    formatString(t.voice_missing_permission, { channel: `<#${channel.id}>`, permissions: permissionList })
  );

  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(t.voice_missing_permission_dm_title)
      .setDescription(
        formatString(t.voice_missing_permission_dm_desc, {
          guild: ctx.guild!.name,
          channel: channel.name,
          permissions: permissionList,
        })
      )
      .setTimestamp();
    await ctx.author.send({ embeds: [dmEmbed] });
  } catch {
    // MPs fermés : on a déjà prévenu dans le salon, pas grave si le DM échoue.
  }

  return false;
}

export const playCommand: Command = {
  name: 'play',
  description: 'Joue une musique ou l\'ajoute à la file d\'attente (YouTube, Spotify, SoundCloud)',
  category: 'Musique',
  aliases: ['p'],
  slashData: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Joue une musique ou l\'ajoute à la file d\'attente')
    .addStringOption((opt) =>
      opt
        .setName('recherche')
        .setDescription('Titre de musique ou lien YouTube / Spotify / SoundCloud')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute: async (ctx: CommandContext) => {
    if (!checkVoice(ctx)) return;

    const voiceChannel = ctx.member!.voice.channel!;
    // Seul le salon vocal de l'utilisateur importe ici : si le bot est déjà connecté
    // ailleurs, checkVoice() a déjà bloqué la commande plus haut (salons différents).
    if (!(await checkVoicePermissions(ctx, voiceChannel))) return;

    const t = getTranslation(ctx.guildConfig.language);
    const query =
      (ctx.isSlash && ctx.interaction
        ? (ctx.interaction as any).options?.getString('recherche')
        : ctx.args.join(' ')) || '';

    if (!query.trim()) {
      await replyError(ctx, t.music_no_query);
      return;
    }

    // Différer immédiatement : la recherche/résolution du morceau (providers YouTube/Spotify/
    // SoundCloud) peut dépasser la fenêtre de 3s de Discord et invalider le token d'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    const res = await musicService.play(ctx.guild!, ctx.member!, query);
    if (!res.success || !res.track) {
      await replyError(ctx, res.error || t.music_play_failed);
      return;
    }

    const track = res.track;
    if (res.queuePosition === 0) {
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
  },
};

export const skipCommand: Command = {
  name: 'skip',
  description: 'Passe à la musique suivante dans la file d\'attente',
  category: 'Musique',
  aliases: ['s', 'next'],
  slashData: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Passe à la musique suivante dans la file d\'attente'),
  execute: async (ctx: CommandContext) => {
    if (!checkVoice(ctx)) return;
    const t = getTranslation(ctx.guildConfig.language);
    await ctx.deferReply();
    const res = await musicService.skip(ctx.guild!.id, ctx.member!);
    if (res.success) {
      if (res.nextTrack) {
        await replySuccess(ctx, formatString(t.music_skipped, { title: res.nextTrack.title }));
      } else {
        await replyInfo(ctx, t.music_queue_end);
      }
    } else {
      await replyError(ctx, res.error || t.music_skip_failed);
    }
  },
};

export const pauseCommand: Command = {
  name: 'pause',
  description: 'Met en pause la lecture de la musique actuelle',
  category: 'Musique',
  slashData: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Met en pause la lecture de la musique actuelle'),
  execute: async (ctx: CommandContext) => {
    if (!checkVoice(ctx)) return;
    const t = getTranslation(ctx.guildConfig.language);
    const res = musicService.pause(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, t.music_paused);
    } else {
      await replyError(ctx, res.error || t.music_pause_failed);
    }
  },
};

export const resumeCommand: Command = {
  name: 'resume',
  description: 'Reprend la lecture de la musique mise en pause',
  category: 'Musique',
  aliases: ['unpause'],
  slashData: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reprend la lecture de la musique mise en pause'),
  execute: async (ctx: CommandContext) => {
    if (!checkVoice(ctx)) return;
    const t = getTranslation(ctx.guildConfig.language);
    const res = musicService.resume(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, t.music_resumed);
    } else {
      await replyError(ctx, res.error || t.music_resume_failed);
    }
  },
};

export const stopCommand: Command = {
  name: 'stop',
  description: 'Arrête la musique, vide la file et quitte le salon vocal',
  category: 'Musique',
  aliases: ['leave', 'disconnect'],
  slashData: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Arrête la musique, vide la file et quitte le salon vocal'),
  execute: async (ctx: CommandContext) => {
    if (!checkVoice(ctx)) return;
    const t = getTranslation(ctx.guildConfig.language);
    const res = musicService.stop(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, t.music_stopped);
    } else {
      await replyError(ctx, res.error || t.music_stop_failed);
    }
  },
};

export const queueCommand: Command = {
  name: 'queue',
  description: 'Affiche la liste des morceaux dans la file d\'attente musicale',
  category: 'Musique',
  aliases: ['q'],
  slashData: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Affiche la liste des morceaux dans la file d\'attente musicale'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const q = musicService.getPlayer(ctx.guild.id, false)?.getState();
    if (!q || !q.currentTrack) {
      await replyInfo(ctx, 'Aucune musique n\'est actuellement en cours de lecture.');
      return;
    }

    const current = q.currentTrack;
    let desc = `**En cours :** [${current.title}](${current.url}) \`[${DiscordMusicPanel.formatTime(current.duration)}]\`\n\n`;

    if (q.queue.length === 0) {
      desc += '*La file d\'attente est vide. Ajoutez des titres avec `/play <titre>` !*';
    } else {
      desc += `**À suivre (${q.queue.length}) :**\n`;
      const nextTracks = q.queue.slice(0, 10);
      nextTracks.forEach((t, i) => {
        desc += `\`${i + 1}.\` [${t.title}](${t.url}) — \`${DiscordMusicPanel.formatTime(t.duration)}\`\n`;
      });
      if (q.queue.length > 10) {
        desc += `\n*... et ${q.queue.length - 10} autre(s) morceau(x)*`;
      }
    }

    const embed = ctx
      .createEmbed('info')
      .setTitle(`🎶 File d'attente • ${ctx.guild.name}`)
      .setDescription(desc)
      .setFooter({ text: `Mode répétition : ${q.repeatMode} • Volume : ${q.volume}%` });

    await ctx.reply({ embeds: [embed] });
  },
};

export const nowPlayingCommand: Command = {
  name: 'nowplaying',
  description: 'Affiche des détails et la barre de progression du titre en cours',
  category: 'Musique',
  aliases: ['np'],
  slashData: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Affiche des détails et la barre de progression du titre en cours'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const q = musicService.getPlayer(ctx.guild.id, false)?.getState();
    if (!q || !q.currentTrack) {
      await replyInfo(ctx, 'Aucune musique n\'est actuellement en cours de lecture.');
      return;
    }

    const track = q.currentTrack;
    const progress = q.position || 0;
    const total = track.duration || 180;
    const percent = Math.min(1, Math.max(0, progress / total));
    const totalBars = 16;
    const filledBars = Math.round(percent * totalBars);
    const progressBar = '▬'.repeat(filledBars) + '🔘' + '▬'.repeat(Math.max(0, totalBars - filledBars));

    const embed = ctx
      .createEmbed('info')
      .setTitle('🎧 Titre en cours de lecture')
      .setDescription(
        `**[${track.title}](${track.url})**\n` +
        `Artiste : \`${track.artist}\`\n\n` +
        `\`${DiscordMusicPanel.formatTime(progress)}\` ${progressBar} \`${DiscordMusicPanel.formatTime(total)}\`\n\n` +
        `• **Demandé par :** <@${track.requestedBy}>\n` +
        `• **Volume :** \`${q.volume}%\` • **Répétition :** \`${q.repeatMode}\``
      )
      .setThumbnail(track.thumbnail);

    await ctx.reply({ embeds: [embed] });
  },
};
