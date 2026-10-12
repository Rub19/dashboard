import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types/command.js";
import { lastFmStorage } from "../../modules/lastfm/storage/lastfmStorage.js";
import { lastFmService } from "../../modules/lastfm/services/lastfmService.js";
import {
  buildNowPlayingEmbed,
  buildProfileEmbed,
  buildRecentTracksEmbed,
  buildTasteEmbed,
  buildTopAlbumsEmbed,
  buildTopArtistsEmbed,
} from "../../modules/lastfm/ui/lastfmEmbeds.js";
import { funService } from "../../modules/fun/services/funService.js";
import { buildLyricsEmbed } from "../../modules/fun/ui/funEmbeds.js";

function resolveUsername(ctx: CommandContext, explicitUsername?: string | null): string | null {
  if (explicitUsername && explicitUsername.trim()) {
    return explicitUsername.trim();
  }
  return lastFmStorage.getUsername(ctx.author.id);
}

export const lastfmCommand: Command = {
  name: "lastfm",
  description: "Intègre Last.fm à votre profil et affiche vos statistiques d'écoute",
  category: "Fun",
  aliases: ["fm", "lfm"],
  slashData: new SlashCommandBuilder()
    .setName("lastfm")
    .setDescription("Intègre Last.fm à votre profil et affiche vos statistiques d'écoute")
    .addSubcommand((sub) =>
      sub
        .setName("nowplaying")
        .setDescription("Affiche le morceau actuellement en cours d'écoute")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("recent")
        .setDescription("Affiche vos scrobbles récents")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
        .addIntegerOption((opt) => opt.setName("limit").setDescription("Nombre de titres (1-10)").setMinValue(1).setMaxValue(10))
    )
    .addSubcommand((sub) =>
      sub
        .setName("topartists")
        .setDescription("Affiche vos artistes les plus écoutés")
        .addStringOption((opt) =>
          opt
            .setName("period")
            .setDescription("Période d'écoute")
            .addChoices(
              { name: "7 jours", value: "7day" },
              { name: "1 mois", value: "1month" },
              { name: "3 mois", value: "3month" },
              { name: "Global (overall)", value: "overall" }
            )
        )
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("toptracks")
        .setDescription("Affiche vos morceaux les plus écoutés")
        .addStringOption((opt) =>
          opt
            .setName("period")
            .setDescription("Période d'écoute")
            .addChoices(
              { name: "7 jours", value: "7day" },
              { name: "1 mois", value: "1month" },
              { name: "Global (overall)", value: "overall" }
            )
        )
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("topalbums")
        .setDescription("Affiche vos albums les plus écoutés")
        .addStringOption((opt) =>
          opt
            .setName("period")
            .setDescription("Période d'écoute")
            .addChoices(
              { name: "7 jours", value: "7day" },
              { name: "1 mois", value: "1month" },
              { name: "Global (overall)", value: "overall" }
            )
        )
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Affiche le profil et les statistiques Last.fm d'un utilisateur")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("taste")
        .setDescription("Compare vos goûts musicaux avec un autre utilisateur")
        .addUserOption((opt) => opt.setName("target").setDescription("Membre Discord cible").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("login")
        .setDescription("Associe votre pseudo Last.fm à votre compte Discord")
        .addStringOption((opt) => opt.setName("username").setDescription("Votre pseudo Last.fm").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("logout").setDescription("Dissocie votre compte Last.fm de votre profil Discord")
    )
    .addSubcommand((sub) =>
      sub
        .setName("spotify")
        .setDescription("Partage le lien Spotify du morceau actuellement joué sur Last.fm")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("youtube")
        .setDescription("Partage le lien YouTube du morceau actuellement joué sur Last.fm")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("lyrics")
        .setDescription("Affiche les paroles du morceau en cours d'écoute sur Last.fm")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)"))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    let sub = "nowplaying";
    let explicitUser: string | null = null;
    let period = "7day";
    let limit = 5;
    let targetUser: any = null;

    if (ctx.isSlash && ctx.interaction) {
      sub = (ctx.interaction as any).options.getSubcommand(false) || "nowplaying";
      explicitUser = (ctx.interaction as any).options.getString("username");
      period = (ctx.interaction as any).options.getString("period") || "7day";
      limit = (ctx.interaction as any).options.getInteger("limit") || 5;
      targetUser = (ctx.interaction as any).options.getUser("target");
    } else {
      const firstArg = ctx.args[0]?.toLowerCase();
      if (
        [
          "nowplaying",
          "np",
          "recent",
          "topartists",
          "toptracks",
          "topalbums",
          "user",
          "whois",
          "taste",
          "login",
          "set",
          "logout",
          "unset",
          "spotify",
          "youtube",
          "lyrics",
        ].includes(firstArg)
      ) {
        sub = firstArg === "np" ? "nowplaying" : firstArg === "set" ? "login" : firstArg === "unset" ? "logout" : firstArg;
        explicitUser = ctx.args.slice(1).join(" ") || null;
      } else if (ctx.args.length > 0) {
        explicitUser = ctx.args.join(" ");
      }
    }

    if (sub === "login") {
      const username = explicitUser?.trim();
      if (!username) {
        await ctx.reply({ content: "❌ Veuillez renseigner votre pseudo Last.fm (ex: `/lastfm login rj`)." });
        return;
      }
      lastFmStorage.set(ctx.author.id, username);
      await ctx.reply({
        content: `✅ Votre compte Last.fm **${username}** a été associé à votre profil Discord avec succès ! Vous pouvez désormais taper \`/lastfm nowplaying\` sans paramètre.`,
      });
      return;
    }

    if (sub === "logout") {
      const removed = lastFmStorage.delete(ctx.author.id);
      if (removed) {
        await ctx.reply({ content: "✅ Votre compte Last.fm a été dissocié avec succès." });
      } else {
        await ctx.reply({ content: "ℹ️ Aucun compte Last.fm n'était associé à votre profil Discord." });
      }
      return;
    }

    if (sub === "taste") {
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.deferReply();
      }

      const user1 = resolveUsername(ctx);
      if (!user1) {
        const msg = "❌ Vous n'avez pas encore associé votre compte Last.fm. Tapez `/lastfm login <pseudo>` d'abord.";
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }

      const targetId = targetUser?.id || ctx.args[1]?.replace(/[<@!>]/g, "");
      const user2 = targetId ? lastFmStorage.getUsername(targetId) : null;
      if (!user2) {
        const msg = "❌ L'utilisateur cible n'a pas associé son compte Last.fm avec `/lastfm login <pseudo>`.";
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }

      const comp = await lastFmService.compareTaste(user1, user2);
      const embed = buildTasteEmbed(comp);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }

    const username = resolveUsername(ctx, explicitUser);
    if (!username) {
      const msg =
        "❌ Aucun pseudo Last.fm fourni. Associez votre compte avec `/lastfm login <pseudo>` ou précisez le nom : `/lastfm nowplaying username:<pseudo>`.";
      await ctx.reply({ content: msg });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    if (sub === "nowplaying" || sub === "spotify" || sub === "youtube" || sub === "lyrics") {
      const track = await lastFmService.getNowPlaying(username);
      if (!track) {
        const msg = `❌ Impossible de récupérer l'écoute en cours pour **${username}** sur Last.fm.`;
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }

      if (sub === "spotify") {
        const q = encodeURIComponent(`${track.artist} ${track.name}`);
        const link = `https://open.spotify.com/search/${q}`;
        const msg = `🎵 **${track.name}** — **${track.artist}** sur Spotify :\n${link}`;
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }

      if (sub === "youtube") {
        const q = encodeURIComponent(`${track.artist} ${track.name}`);
        const link = `https://www.youtube.com/results?search_query=${q}`;
        const msg = `▶️ **${track.name}** — **${track.artist}** sur YouTube :\n${link}`;
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }

      if (sub === "lyrics") {
        const query = `${track.artist} ${track.name}`;
        const lyrics = await funService.getLyrics(query);
        if (!lyrics) {
          const msg = `❌ Aucune parole trouvée pour **${track.name}** (${track.artist}).`;
          if (ctx.isSlash && ctx.interaction) {
            await ctx.interaction.editReply({ content: msg });
          } else {
            await ctx.reply({ content: msg });
          }
          return;
        }
        const embed = buildLyricsEmbed(lyrics);
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ embeds: [embed] });
        } else {
          await ctx.reply({ embeds: [embed] });
        }
        return;
      }

      const { embed, row } = buildNowPlayingEmbed(username, track);
      const payload = { embeds: [embed], components: row ? [row] : [] };
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply(payload);
      } else {
        await ctx.reply(payload);
      }
      return;
    }

    if (sub === "recent") {
      const tracks = await lastFmService.getRecentTracks(username, limit);
      const embed = buildRecentTracksEmbed(username, tracks);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }

    if (sub === "topartists") {
      const artists = await lastFmService.getTopArtists(username, period, 5);
      const embed = buildTopArtistsEmbed(username, artists, period);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }

    if (sub === "toptracks") {
      const tracks = await lastFmService.getTopTracks(username, period, 5);
      const embed = buildRecentTracksEmbed(username, tracks);
      embed.setTitle(`Top Morceaux de ${username}`);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }

    if (sub === "topalbums") {
      const albums = await lastFmService.getTopAlbums(username, period, 5);
      const embed = buildTopAlbumsEmbed(username, albums, period);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }

    if (sub === "user" || sub === "whois") {
      const profile = await lastFmService.getProfile(username);
      if (!profile) {
        const msg = `❌ Profil Last.fm introuvable pour **${username}**.`;
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ content: msg });
        } else {
          await ctx.reply({ content: msg });
        }
        return;
      }
      const embed = buildProfileEmbed(profile);
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return;
    }
  },
};

export const fmCommand: Command = {
  name: "fm",
  description: "Affiche le titre que vous écoutez actuellement sur Last.fm",
  category: "Fun",
  aliases: ["lastfm-np"],
  slashData: new SlashCommandBuilder()
    .setName("fm")
    .setDescription("Affiche le titre que vous écoutez actuellement sur Last.fm")
    .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Last.fm (optionnel)")),
  execute: async (ctx: CommandContext): Promise<void> => {
    return lastfmCommand.execute(ctx);
  },
};
