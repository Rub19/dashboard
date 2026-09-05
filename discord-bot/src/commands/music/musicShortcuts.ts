import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { DiscordMusicPanel } from '../../modules/music/ui/discordMusicPanel.js';

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)], ephemeral: true });
const replySuccess = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(msg)] });
const replyInfo = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(msg)] });

function checkVoice(ctx: CommandContext): boolean {
  if (!ctx.guild || !ctx.member) return false;
  const userVoice = ctx.member.voice?.channel;
  if (!userVoice) {
    replyError(
      ctx,
      '❌ **Salon vocal requis** : Vous devez être connecté dans un salon vocal pour utiliser les commandes musicales !'
    );
    return false;
  }
  const botVoice = ctx.guild.members.me?.voice?.channel;
  if (botVoice && botVoice.id !== userVoice.id) {
    replyError(
      ctx,
      `❌ **Salon vocal différent** : Vous devez être dans le même salon vocal que le bot (<#${botVoice.id}>).`
    );
    return false;
  }
  return true;
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
    const query =
      (ctx.isSlash && ctx.interaction
        ? (ctx.interaction as any).options?.getString('recherche')
        : ctx.args.join(' ')) || '';

    if (!query.trim()) {
      await replyError(ctx, '❌ Veuillez spécifier un titre ou un lien à écouter.');
      return;
    }

    const res = await musicService.play(ctx.guild!, ctx.member!, query);
    if (!res.success || !res.track) {
      await replyError(ctx, res.error || 'Impossible de charger cette musique.');
      return;
    }

    const track = res.track;
    if (res.queuePosition === 0) {
      const embed = ctx
        .createEmbed('success')
        .setTitle('▶️ Lecture en cours')
        .setDescription(
          `**[${track.title}](${track.url})**\nArtiste : \`${track.artist}\` • Durée : \`${DiscordMusicPanel.formatTime(
            track.duration
          )}\``
        )
        .setThumbnail(track.thumbnail);
      await ctx.reply({ embeds: [embed] });
    } else {
      const embed = ctx
        .createEmbed('info')
        .setTitle('➕ Ajouté à la file d\'attente')
        .setDescription(
          `**[${track.title}](${track.url})**\nPosition dans la file : **#${res.queuePosition}**`
        )
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
    const res = musicService.skip(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, '⏭️ Titre passé ! Passage au morceau suivant.');
    } else {
      await replyError(ctx, res.error || 'Impossible de passer ce titre.');
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
    const res = musicService.pause(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, '⏸️ La lecture est en pause.');
    } else {
      await replyError(ctx, res.error || 'Impossible de mettre en pause.');
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
    const res = musicService.resume(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, '▶️ La lecture a repris.');
    } else {
      await replyError(ctx, res.error || 'Impossible de reprendre la lecture.');
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
    const res = musicService.stop(ctx.guild!.id, ctx.member!);
    if (res.success) {
      await replySuccess(ctx, '⏹️ Lecture arrêtée et salon vocal quitté.');
    } else {
      await replyError(ctx, res.error || 'Impossible d\'arrêter la lecture.');
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
    const q = musicService.getQueue(ctx.guild.id);
    if (!q || !q.currentTrack) {
      await replyInfo(ctx, 'Aucune musique n\'est actuellement en cours de lecture.');
      return;
    }

    const current = q.currentTrack;
    let desc = `**En cours :** [${current.title}](${current.url}) \`[${DiscordMusicPanel.formatTime(current.duration)}]\`\n\n`;

    if (q.tracks.length === 0) {
      desc += '*La file d\'attente est vide. Ajoutez des titres avec `/play <titre>` !*';
    } else {
      desc += `**À suivre (${q.tracks.length}) :**\n`;
      const nextTracks = q.tracks.slice(0, 10);
      nextTracks.forEach((t, i) => {
        desc += `\`${i + 1}.\` [${t.title}](${t.url}) — \`${DiscordMusicPanel.formatTime(t.duration)}\`\n`;
      });
      if (q.tracks.length > 10) {
        desc += `\n*... et ${q.tracks.length - 10} autre(s) morceau(x)*`;
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
    const q = musicService.getQueue(ctx.guild.id);
    if (!q || !q.currentTrack) {
      await replyInfo(ctx, 'Aucune musique n\'est actuellement en cours de lecture.');
      return;
    }

    const track = q.currentTrack;
    const progress = q.playbackPosition || 0;
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
