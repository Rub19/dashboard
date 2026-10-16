import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { spotifyService } from '../../modules/spotify/services/spotifyService.js';
import {
  SPOTIFY_GREEN,
  createSpotifyActionRow,
  createSpotifyEmbed,
  formatMs,
} from '../../modules/spotify/ui/spotifyEmbed.js';
import { trg } from '../../utils/tr.js';

export const spotifyCommand: Command = {
  name: 'spotify',
  description: 'Contrôle complet de Spotify, synchronisation et diffusion vocale',
  category: 'Musique',
  aliases: ['sp', 'spot'],
  slashData: new SlashCommandBuilder()
    .setName('spotify')
    .setDescription('Intégration Spotify complète — contrôle, synchronisation et diffusion vocale')
    .addSubcommand((sub) =>
      sub
        .setName('nowplaying')
        .setDescription('Affiche le titre Spotify en cours d\'écoute')
        .addUserOption((opt) =>
          opt
            .setName('membre')
            .setDescription('Membre Discord dont vous voulez voir l\'écoute Spotify')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Lance la lecture d\'un titre, album ou playlist sur Spotify')
        .addStringOption((opt) =>
          opt
            .setName('recherche')
            .setDescription('Titre, artiste ou lien Spotify à lancer')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('pause').setDescription('Met la lecture Spotify en pause'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Reprend la lecture Spotify'))
    .addSubcommand((sub) => sub.setName('next').setDescription('Passe au titre suivant sur Spotify'))
    .addSubcommand((sub) => sub.setName('previous').setDescription('Revient au titre précédent sur Spotify'))
    .addSubcommand((sub) =>
      sub
        .setName('seek')
        .setDescription('Se déplace à un moment précis dans le titre')
        .addIntegerOption((opt) =>
          opt
            .setName('secondes')
            .setDescription('Position en secondes')
            .setMinValue(0)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Règle le volume de lecture Spotify (0-100%)')
        .addIntegerOption((opt) =>
          opt
            .setName('pourcentage')
            .setDescription('Niveau de volume')
            .setMinValue(0)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('repeat')
        .setDescription('Configure le mode de répétition Spotify')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Mode de répétition')
            .setRequired(true)
            .addChoices(
              { name: 'Désactivé (off)', value: 'off' },
              { name: 'Titre en cours (track)', value: 'track' },
              { name: 'Contexte complet (context)', value: 'context' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('shuffle')
        .setDescription('Active ou désactive la lecture aléatoire Spotify')
        .addStringOption((opt) =>
          opt
            .setName('etat')
            .setDescription('État aléatoire')
            .setRequired(true)
            .addChoices(
              { name: 'Activer (on)', value: 'on' },
              { name: 'Désactiver (off)', value: 'off' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('queue')
        .setDescription('Affiche la file d\'attente ou y ajoute un titre Spotify')
        .addStringOption((opt) =>
          opt
            .setName('titre')
            .setDescription('Titre ou lien Spotify à ajouter à la file')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('like').setDescription('Ajoute le titre en cours à vos favoris Spotify'))
    .addSubcommand((sub) => sub.setName('unlike').setDescription('Retire le titre en cours de vos favoris Spotify'))
    .addSubcommand((sub) =>
      sub
        .setName('device')
        .setDescription('Transfère la lecture Spotify vers un appareil précis')
        .addStringOption((opt) =>
          opt
            .setName('nom')
            .setDescription('Nom ou identifiant de l\'appareil Spotify')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('devices').setDescription('Liste vos appareils connectés à Spotify'))
    .addSubcommand((sub) =>
      sub
        .setName('toptracks')
        .setDescription('Affiche vos titres les plus écoutés sur Spotify')
        .addStringOption((opt) =>
          opt
            .setName('periode')
            .setDescription('Période d\'analyse')
            .setRequired(false)
            .addChoices(
              { name: '4 dernières semaines', value: 'short_term' },
              { name: '6 derniers mois', value: 'medium_term' },
              { name: 'Historique complet', value: 'long_term' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('topartists')
        .setDescription('Affiche vos artistes les plus écoutés sur Spotify')
        .addStringOption((opt) =>
          opt
            .setName('periode')
            .setDescription('Période d\'analyse')
            .setRequired(false)
            .addChoices(
              { name: '4 dernières semaines', value: 'short_term' },
              { name: '6 derniers mois', value: 'medium_term' },
              { name: 'Historique complet', value: 'long_term' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('vc').setDescription('Diffuse votre musique Spotify en cours dans votre salon vocal'))
    .addSubcommand((sub) => sub.setName('login').setDescription('Associe votre compte Spotify avec le bot Etho'))
    .addSubcommand((sub) => sub.setName('logout').setDescription('Dissocie votre compte Spotify')),

  async execute(ctx: CommandContext): Promise<void> {
    const rawSub = ctx.isSlash
      ? ctx.interaction?.options.getSubcommand(false)
      : ctx.args[0]?.toLowerCase();

    let sub = rawSub || 'nowplaying';
    if (!ctx.isSlash && rawSub && !['nowplaying', 'play', 'pause', 'resume', 'next', 'previous', 'skip', 'prev', 'seek', 'volume', 'vol', 'repeat', 'shuffle', 'queue', 'like', 'unlike', 'device', 'devices', 'toptracks', 'topartists', 'vc', 'login', 'logout'].includes(rawSub)) {
      sub = 'nowplaying';
    }

    if (sub === 'skip') sub = 'next';
    if (sub === 'prev') sub = 'previous';
    if (sub === 'vol') sub = 'volume';

    switch (sub) {
      case 'nowplaying': {
        let targetMember: GuildMember | null = null;
        if (ctx.isSlash) {
          const userOption = ctx.interaction?.options.getUser('membre');
          if (userOption && ctx.guild) {
            targetMember = ctx.guild.members.cache.get(userOption.id) || null;
          }
        } else if (ctx.args[0] && ctx.args[0] !== 'nowplaying') {
          const mentionMatch = ctx.args[0].match(/<@!?(\d+)>/);
          const targetId = mentionMatch ? mentionMatch[1] : ctx.args[0];
          if (ctx.guild) {
            targetMember = ctx.guild.members.cache.get(targetId) || null;
          }
        }

        if (!targetMember) {
          targetMember = ctx.member;
        }

        const targetUser = targetMember ? targetMember.user : ctx.author;

        let track = await spotifyService.getPlaybackState(targetUser.id);
        let isPresence = false;

        if (!track && targetMember) {
          track = spotifyService.getDiscordPresenceSpotify(targetMember);
          isPresence = true;
        }

        if (!track) {
          const embed = new EmbedBuilder()
            .setColor(SPOTIFY_GREEN)
            .setAuthor({
              name: trg(ctx, '{username} sur Spotify', { username: targetUser.username }),
              iconURL: targetUser.displayAvatarURL(),
            })
            .setTitle(trg(ctx, 'Aucune écoute en cours'))
            .setDescription(
              targetUser.id === ctx.author.id
                ? trg(ctx, 'Vous n\'écoutez actuellement aucun titre sur Spotify.\n\nLancez Spotify sur votre appareil ou associez votre compte via `/spotify login`.')
                : trg(ctx, '{username} n\'écoute actuellement aucun titre sur Spotify.', { username: targetUser.username })
            );

          if (targetUser.id === ctx.author.id && !spotifyService.isConnected(ctx.author.id)) {
            const loginUrl = spotifyService.getLoginUrl(ctx.author.id);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel(trg(ctx, 'Connecter Spotify'))
                .setURL(loginUrl)
                .setEmoji('🟢')
            );
            await ctx.reply({ embeds: [embed], components: [row] });
            return;
          }

          await ctx.reply({ embeds: [embed] });
          return;
        }

        const embed = createSpotifyEmbed(track, targetUser, isPresence, ctx);
        if (targetUser.id === ctx.author.id && spotifyService.isConnected(ctx.author.id)) {
          const row = createSpotifyActionRow(ctx.author.id, track.isPlaying, track.isSaved);
          await ctx.reply({ embeds: [embed], components: [row] });
        } else {
          await ctx.reply({ embeds: [embed] });
        }
        return;
      }

      case 'play': {
        const query = ctx.isSlash
          ? ctx.interaction?.options.getString('recherche') || undefined
          : ctx.args.slice(1).join(' ') || undefined;

        const res = await spotifyService.play(ctx.author.id, query);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Erreur lors du lancement.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(
                query
                  ? trg(ctx, 'Lecture lancée pour **{query}** sur Spotify.', { query })
                  : trg(ctx, 'Lecture reprise sur votre appareil Spotify actif.')
              ),
          ],
        });
        return;
      }

      case 'pause': {
        const res = await spotifyService.pause(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de mettre en pause.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Lecture Spotify mise en pause ⏸️')),
          ],
        });
        return;
      }

      case 'resume': {
        const res = await spotifyService.resume(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de reprendre la lecture.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Lecture Spotify reprise ▶️')),
          ],
        });
        return;
      }

      case 'next': {
        const res = await spotifyService.next(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de passer au titre suivant.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Passage au titre suivant ⏭️')),
          ],
        });
        return;
      }

      case 'previous': {
        const res = await spotifyService.previous(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de revenir au titre précédent.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Retour au titre précédent ⏮️')),
          ],
        });
        return;
      }

      case 'seek': {
        const seconds = ctx.isSlash
          ? ctx.interaction?.options.getInteger('secondes', true) ?? 0
          : parseInt(ctx.args[1] || '0', 10);

        if (isNaN(seconds) || seconds < 0) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Veuillez indiquer un nombre de secondes valide.'))],
            ephemeral: true,
          });
          return;
        }

        const res = await spotifyService.seek(ctx.author.id, seconds);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de se déplacer.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Position de lecture déplacée à **{v0}** ⏱️', { v0: formatMs(seconds * 1000) })),
          ],
        });
        return;
      }

      case 'volume': {
        const percent = ctx.isSlash
          ? ctx.interaction?.options.getInteger('pourcentage', true) ?? 50
          : parseInt(ctx.args[1] || '50', 10);

        if (isNaN(percent) || percent < 0 || percent > 100) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Le volume doit être compris entre 0 et 100%.'))],
            ephemeral: true,
          });
          return;
        }

        const res = await spotifyService.setVolume(ctx.author.id, percent);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de régler le volume.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Volume Spotify ajusté à **{percent}%** 🔊', { percent })),
          ],
        });
        return;
      }

      case 'repeat': {
        const mode = (
          ctx.isSlash
            ? ctx.interaction?.options.getString('mode', true)
            : ctx.args[1]
        ) as 'off' | 'track' | 'context';

        if (!['off', 'track', 'context'].includes(mode)) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Modes valides : `off`, `track`, `context`.'))],
            ephemeral: true,
          });
          return;
        }

        const res = await spotifyService.setRepeat(ctx.author.id, mode);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de changer le mode.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Mode répétition réglé sur **{mode}** 🔁', { mode })),
          ],
        });
        return;
      }

      case 'shuffle': {
        const stateStr = ctx.isSlash
          ? ctx.interaction?.options.getString('etat', true)
          : ctx.args[1];

        const enabled = stateStr === 'on';
        const res = await spotifyService.setShuffle(ctx.author.id, enabled);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de changer l\'état aléatoire.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Lecture aléatoire **{v0}** 🔀', { v0: enabled ? 'activée' : 'désactivée' })),
          ],
        });
        return;
      }

      case 'queue': {
        const query = ctx.isSlash
          ? ctx.interaction?.options.getString('titre') || undefined
          : ctx.args.slice(1).join(' ') || undefined;

        if (query) {
          const res = await spotifyService.addToQueue(ctx.author.id, query);
          if (!res.success) {
            await ctx.reply({
              embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible d\'ajouter à la file.')],
              ephemeral: true,
            });
            return;
          }

          await ctx.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(SPOTIFY_GREEN)
                .setDescription(trg(ctx, 'Titre ajouté à votre file d\'attente Spotify : **{trackName}** 🎵', { trackName: res.trackName })),
            ],
          });
          return;
        }

        const queueData = await spotifyService.getQueue(ctx.author.id);
        if (!queueData) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Impossible de récupérer votre file d\'attente Spotify.'))],
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(SPOTIFY_GREEN)
          .setTitle(trg(ctx, 'File d\'attente Spotify'))
          .setFooter({ text: trg(ctx, 'Spotify Connect • ETHONE') });

        if (queueData.current) {
          embed.addFields({
            name: trg(ctx, '▶️ En cours de lecture'),
            value: `**${queueData.current.name}** — ${queueData.current.artists.join(', ')} (${formatMs(queueData.current.durationMs)})`,
          });
        }

        if (queueData.queue.length > 0) {
          const queueLines = queueData.queue.map(
            (t, i) => `\`${i + 1}.\` **[${t.name}](${t.url})** — ${t.artists.join(', ')} (${formatMs(t.durationMs)})`
          );
          embed.addFields({
            name: trg(ctx, 'À suivre ({length})', { length: queueData.queue.length }),
            value: queueLines.join('\n'),
          });
        } else {
          embed.addFields({
            name: trg(ctx, 'À suivre'),
            value: trg(ctx, 'La file d\'attente est vide.'),
          });
        }

        await ctx.reply({ embeds: [embed] });
        return;
      }

      case 'like': {
        const res = await spotifyService.likeTrack(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de liker le titre.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, '💚 **{v0}** ajouté à vos titres likés !', { v0: res.trackTitle || 'Titre' })),
          ],
        });
        return;
      }

      case 'unlike': {
        const res = await spotifyService.unlikeTrack(ctx.author.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de retirer des titres likés.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, '💔 **{v0}** retiré de vos titres likés.', { v0: res.trackTitle || 'Titre' })),
          ],
        });
        return;
      }

      case 'devices': {
        const devices = await spotifyService.getDevices(ctx.author.id);
        if (devices.length === 0) {
          await ctx.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(SPOTIFY_GREEN)
                .setTitle(trg(ctx, 'Appareils Spotify'))
                .setDescription(trg(ctx, 'Aucun appareil Spotify actif détecté. Lancez l\'application Spotify sur votre téléphone ou PC.')),
            ],
            ephemeral: true,
          });
          return;
        }

        const lines = devices.map((d) => {
          const status = d.is_active ? '🟢 **Actif**' : '⚪ Inactif';
          const icon = d.type === 'Smartphone' ? '📱' : d.type === 'Computer' ? '💻' : '🔊';
          return `${icon} **${d.name}** (${d.type}) — ${status} • Volume : ${d.volume_percent}% \nID : \`${d.id}\``;
        });

        const embed = new EmbedBuilder()
          .setColor(SPOTIFY_GREEN)
          .setTitle(trg(ctx, 'Vos appareils Spotify connectés'))
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: trg(ctx, 'Utilisez /spotify device <nom/id> pour changer d\'appareil') });

        await ctx.reply({ embeds: [embed] });
        return;
      }

      case 'device': {
        const target = ctx.isSlash
          ? ctx.interaction?.options.getString('nom', true)
          : ctx.args.slice(1).join(' ');

        if (!target) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Veuillez préciser le nom ou l\'ID de l\'appareil cible.'))],
            ephemeral: true,
          });
          return;
        }

        const devices = await spotifyService.getDevices(ctx.author.id);
        const match = devices.find(
          (d) =>
            d.id.toLowerCase() === target.toLowerCase() ||
            d.name.toLowerCase().includes(target.toLowerCase())
        );

        if (!match) {
          await ctx.reply({
            embeds: [
              ctx.createEmbed('error').setDescription(
                trg(ctx, 'Appareil introuvable. Tapez `/spotify devices` pour voir vos appareils disponibles.')
              ),
            ],
            ephemeral: true,
          });
          return;
        }

        const res = await spotifyService.transferPlayback(ctx.author.id, match.id);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de transférer la lecture.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(trg(ctx, 'Lecture Spotify transférée sur **{name}** ({type}) 🎧', { name: match.name, type: match.type })),
          ],
        });
        return;
      }

      case 'toptracks': {
        const period = (
          ctx.isSlash
            ? ctx.interaction?.options.getString('periode')
            : ctx.args[1]
        ) as 'short_term' | 'medium_term' | 'long_term' || 'medium_term';

        const tracks = await spotifyService.getTopTracks(ctx.author.id, period);
        if (tracks.length === 0) {
          await ctx.reply({
            embeds: [
              ctx.createEmbed('error').setDescription(
                trg(ctx, 'Impossible de récupérer vos tops titres. Vérifiez votre connexion Spotify via `/spotify login`.')
              ),
            ],
            ephemeral: true,
          });
          return;
        }

        const periodLabel =
          period === 'short_term'
            ? '4 dernières semaines'
            : period === 'long_term'
            ? 'Historique complet'
            : '6 derniers mois';

        const lines = tracks.map(
          (t, i) => `\`${i + 1}.\` **[${t.name}](${t.url})** — ${t.artist} (${formatMs(t.durationMs)})`
        );

        const embed = new EmbedBuilder()
          .setColor(SPOTIFY_GREEN)
          .setAuthor({
            name: trg(ctx, '{username} — Top Titres Spotify', { username: ctx.author.username }),
            iconURL: ctx.author.displayAvatarURL(),
          })
          .setTitle(trg(ctx, 'Vos titres les plus écoutés ({periodLabel})', { periodLabel }))
          .setDescription(lines.join('\n'))
          .setThumbnail(tracks[0]?.albumArt || null)
          .setFooter({ text: trg(ctx, 'Spotify Statistics • ETHONE') });

        await ctx.reply({ embeds: [embed] });
        return;
      }

      case 'topartists': {
        const period = (
          ctx.isSlash
            ? ctx.interaction?.options.getString('periode')
            : ctx.args[1]
        ) as 'short_term' | 'medium_term' | 'long_term' || 'medium_term';

        const artists = await spotifyService.getTopArtists(ctx.author.id, period);
        if (artists.length === 0) {
          await ctx.reply({
            embeds: [
              ctx.createEmbed('error').setDescription(
                trg(ctx, 'Impossible de récupérer vos tops artistes. Vérifiez votre connexion Spotify via `/spotify login`.')
              ),
            ],
            ephemeral: true,
          });
          return;
        }

        const periodLabel =
          period === 'short_term'
            ? '4 dernières semaines'
            : period === 'long_term'
            ? 'Historique complet'
            : '6 derniers mois';

        const lines = artists.map((a, i) => {
          const genreStr = a.genres.length > 0 ? ` • *${a.genres.join(', ')}*` : '';
          return `\`${i + 1}.\` **[${a.name}](${a.url})**${genreStr}`;
        });

        const embed = new EmbedBuilder()
          .setColor(SPOTIFY_GREEN)
          .setAuthor({
            name: trg(ctx, '{username} — Top Artistes Spotify', { username: ctx.author.username }),
            iconURL: ctx.author.displayAvatarURL(),
          })
          .setTitle(trg(ctx, 'Vos artistes les plus écoutés ({periodLabel})', { periodLabel }))
          .setDescription(lines.join('\n'))
          .setThumbnail(artists[0]?.image || null)
          .setFooter({ text: trg(ctx, 'Spotify Statistics • ETHONE') });

        await ctx.reply({ embeds: [embed] });
        return;
      }

      case 'vc': {
        if (!ctx.guild || !ctx.member) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Cette commande ne peut être exécutée que dans un serveur Discord.'))],
            ephemeral: true,
          });
          return;
        }

        const res = await spotifyService.streamToVoice(ctx.guild, ctx.member);
        if (!res.success) {
          await ctx.reply({
            embeds: [ctx.createEmbed('error').setDescription(res.error || 'Impossible de diffuser le titre dans le salon vocal.')],
            ephemeral: true,
          });
          return;
        }

        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setTitle(trg(ctx, 'Diffusion Spotify vers le salon vocal'))
              .setDescription(
                trg(ctx, '🎶 **{trackTitle}** est diffusé en direct dans le salon **{channelName}** !', { trackTitle: res.trackTitle, channelName: res.channelName })
              )
              .setFooter({ text: trg(ctx, 'Audio Bridge • ETHONE Music Engine') }),
          ],
        });
        return;
      }

      case 'login': {
        const loginUrl = spotifyService.getLoginUrl(ctx.author.id);
        const embed = new EmbedBuilder()
          .setColor(SPOTIFY_GREEN)
          .setTitle(trg(ctx, 'Associer votre compte Spotify'))
          .setDescription(
            'Cliquez sur le bouton ci-dessous pour connecter votre compte Spotify.\n\n' +
              'Cela vous permettra de contrôler votre lecteur, liker des titres et diffuser votre musique directement depuis Discord avec Etho !'
          );

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(trg(ctx, 'Se connecter à Spotify'))
            .setURL(loginUrl)
            .setEmoji('🟢')
        );

        await ctx.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
      }

      case 'logout': {
        const removed = spotifyService.removeTokens(ctx.author.id);
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SPOTIFY_GREEN)
              .setDescription(
                removed
                  ? trg(ctx, 'Votre compte Spotify a été dissocié avec succès.')
                  : trg(ctx, 'Aucun compte Spotify n\'était associé à votre profil.')
              ),
          ],
          ephemeral: true,
        });
        return;
      }

      default:
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(trg(ctx, 'Sous-commande inconnue. Tapez `/spotify` pour voir la liste.'))],
          ephemeral: true,
        });
    }
  },
};
