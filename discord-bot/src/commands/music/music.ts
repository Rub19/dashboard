import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { DiscordMusicPanel } from '../../modules/music/ui/discordMusicPanel.js';
import { RepeatMode } from '../../modules/music/types/music.js';

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)] });
const replySuccess = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(msg)] });
const replyInfo = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(msg)] });

export const musicCommand: Command = {
  name: 'music',
  description: 'Contrôle complet du lecteur de musique ETHONE 2.0',
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
    if (!guild || !member) {
      await replyError(ctx, 'Cette commande doit être exécutée dans un serveur Discord.');
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
        await replyError(
          ctx,
          '❌ **Salon vocal requis** : Vous devez impérativement être connecté dans un salon vocal pour lancer ou contrôler la musique !'
        );
        return;
      }

      const botVoice = guild.members.me?.voice?.channel;
      if (botVoice && botVoice.id !== userVoice.id) {
        await replyError(
          ctx,
          `❌ **Salon vocal différent** : Vous devez être dans le même salon vocal que le bot (<#${botVoice.id}>) pour contrôler la musique.`
        );
        return;
      }
    }

    switch (subcommand) {
      case 'play':
      case 'p': {
        if (!queryArg.trim()) {
          await replyError(ctx, 'Veuillez spécifier un titre ou un lien à jouer.');
          return;
        }

        const res = await musicService.play(guild, member, queryArg);
        if (!res.success) {
          await replyError(ctx, res.error || 'Impossible de lancer cette musique.');
          return;
        }

        const track = res.track!;
        if (res.queuePosition === 0) {
          const embed = ctx
            .createEmbed('success')
            .setTitle('▶️ Lecture en cours')
            .setDescription(`**[${track.title}](${track.url})**\nArtiste : ${track.artist}\nDurée : ${DiscordMusicPanel.formatTime(track.duration)}`)
            .setThumbnail(track.thumbnail);
          await ctx.reply({ embeds: [embed] });
        } else {
          const embed = ctx
            .createEmbed('info')
            .setTitle('➕ Ajouté à la file d\'attente')
            .setDescription(`**[${track.title}](${track.url})**\nPosition dans la file : **#${res.queuePosition}**`)
            .setThumbnail(track.thumbnail);
          await ctx.reply({ embeds: [embed] });
        }
        break;
      }

      case 'pause': {
        const res = musicService.pause(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, 'La lecture est désormais en pause ⏸️.');
        } else {
          await replyError(ctx, res.error || 'Impossible de mettre en pause.');
        }
        break;
      }

      case 'resume': {
        const res = musicService.resume(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, 'Lecture reprise ▶️.');
        } else {
          await replyError(ctx, res.error || 'Impossible de reprendre la lecture.');
        }
        break;
      }

      case 'skip':
      case 's': {
        const res = await musicService.skip(guild.id, member);
        if (res.success) {
          if (res.nextTrack) {
            await replySuccess(ctx, `Piste suivante : **${res.nextTrack.title}** ⏭️.`);
          } else {
            await replyInfo(ctx, 'Fin de la file d\'attente. Lecture arrêtée.');
          }
        } else {
          await replyError(ctx, res.error || 'Impossible de passer à la suivante.');
        }
        break;
      }

      case 'previous':
      case 'prev': {
        const res = await musicService.previous(guild.id, member);
        if (res.success && res.prevTrack) {
          await replySuccess(ctx, `Retour au titre : **${res.prevTrack.title}** ⏮️.`);
        } else {
          await replyError(ctx, res.error || 'Aucune musique précédente dans l\'historique.');
        }
        break;
      }

      case 'stop': {
        const res = musicService.stop(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, 'Lecture arrêtée et file d\'attente réinitialisée ⏹️.');
        } else {
          await replyError(ctx, res.error || 'Impossible d\'arrêter la lecture.');
        }
        break;
      }

      case 'volume':
      case 'vol': {
        const vol = parseInt(queryArg, 10);
        if (isNaN(vol) || vol < 0 || vol > 100) {
          const state = musicService.getState(guild.id);
          await replyInfo(ctx, `Le volume actuel est de **${state.volume}%**.`);
          return;
        }
        const res = musicService.setVolume(guild.id, vol, member);
        if (res.success) {
          await replySuccess(ctx, `Volume réglé sur **${vol}%** 🔊.`);
        } else {
          await replyError(ctx, res.error || 'Impossible de modifier le volume.');
        }
        break;
      }

      case 'seek': {
        const sec = parseInt(queryArg, 10);
        if (isNaN(sec) || sec < 0) {
          await replyError(ctx, 'Veuillez spécifier un temps valide en secondes.');
          return;
        }
        const res = musicService.seek(guild.id, sec, member);
        if (res.success) {
          await replySuccess(ctx, `Position déplacée à **${DiscordMusicPanel.formatTime(sec)}** ⏩.`);
        } else {
          await replyError(ctx, res.error || 'Impossible de déplacer la position.');
        }
        break;
      }

      case 'shuffle': {
        const res = musicService.shuffle(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, 'File d\'attente mélangée aléatoirement 🔀 !');
        } else {
          await replyError(ctx, res.error || 'Impossible de mélanger la file.');
        }
        break;
      }

      case 'loop': {
        const mode = (queryArg.toUpperCase() as RepeatMode) || 'OFF';
        const res = musicService.setRepeatMode(guild.id, mode, member);
        if (res.success) {
          await replySuccess(ctx, `Mode de répétition défini sur : **${mode}** 🔁.`);
        } else {
          await replyError(ctx, res.error || 'Mode invalide.');
        }
        break;
      }

      case 'remove': {
        const pos = parseInt(queryArg, 10);
        if (isNaN(pos) || pos < 1) {
          await replyError(ctx, 'Veuillez spécifier la position du titre à retirer (ex: 1).');
          return;
        }
        const res = musicService.removeFromQueue(guild.id, pos - 1, member);
        if (res.success && res.removed) {
          await replySuccess(ctx, `Titre retiré : **${res.removed.title}**.`);
        } else {
          await replyError(ctx, res.error || 'Position invalide dans la file.');
        }
        break;
      }

      case 'clear': {
        const res = musicService.clearQueue(guild.id, member);
        if (res.success) {
          await replySuccess(ctx, 'La file d\'attente a été vidée 🧹.');
        } else {
          await replyError(ctx, res.error || 'Impossible de vider la file.');
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
