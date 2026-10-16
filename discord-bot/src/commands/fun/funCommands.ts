import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { funService } from '../../modules/fun/services/funService.js';
import {
  buildGameEmbed,
  buildLyricsEmbed,
  buildMovieEmbed,
  buildQuoteEmbed,
  buildReverseImageEmbed,
  buildTvShowEmbed,
} from '../../modules/fun/ui/funEmbeds.js';
import { trg } from '../../utils/tr.js';

export const lyricsCommand: Command = {
  name: 'lyrics',
  description: 'Gets lyrics for the given song',
  category: 'Fun',
  aliases: ['paroles', 'lyric'],
  slashData: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Gets lyrics for the given song')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Titre du morceau et artiste').setRequired(true)
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    const query = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('query')
      : ctx.args.join(' ');

    if (!query || !query.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser le nom d\'une chanson (ex: `/lyrics Bohemian Rhapsody`).') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const lyrics = await funService.getLyrics(query);
    if (!lyrics) {
      const msg = `❌ Aucune parole trouvée pour **${query}**.`;
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ content: msg });
        return;
      }
      await ctx.reply({ content: msg });
      return;
    }

    const embed = buildLyricsEmbed(lyrics);
    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed] });
      return;
    }
    await ctx.reply({ embeds: [embed] });
  },
};

export const quoteCommand: Command = {
  name: 'quote',
  description: 'Quote a message',
  category: 'Fun',
  aliases: ['citation'],
  slashData: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Quote a message')
    .addStringOption((opt) => opt.setName('text').setDescription('Texte de la citation').setRequired(true))
    .addStringOption((opt) => opt.setName('author').setDescription('Auteur de la citation').setRequired(false)),
  execute: async (ctx: CommandContext): Promise<void> => {
    let text = '';
    let author = '';

    if (ctx.isSlash && ctx.interaction) {
      text = (ctx.interaction as any).options.getString('text') || '';
      author = (ctx.interaction as any).options.getString('author') || '';
    } else {
      text = ctx.args.join(' ');
    }

    if (!text.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez fournir le texte à citer (ex: `/quote "La vie est belle" Coluche`).') });
      return;
    }

    const memberName = author.trim() || ctx.member?.displayName || ctx.user.username;
    const avatar = ctx.user.displayAvatarURL();
    const embed = buildQuoteEmbed(text, memberName, avatar);

    await ctx.reply({ embeds: [embed] });
  },
};

export const duckduckgoimageCommand: Command = {
  name: 'duckduckgoimage',
  description: 'Search duckduckgo for an image',
  category: 'Fun',
  aliases: ['ddgimage', 'ddgimg'],
  slashData: new SlashCommandBuilder()
    .setName('duckduckgoimage')
    .setDescription('Search duckduckgo for an image')
    .addStringOption((opt) => opt.setName('search').setDescription('Recherche d\'image').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    const query = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('search')
      : ctx.args.join(' ');

    if (!query || !query.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez indiquer un sujet de recherche.') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const images = await funService.searchImages(query, 1);
    if (images.length === 0) {
      const ddgWebLink = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
      const embed = new EmbedBuilder()
        .setColor(0xf97316)
        .setTitle(trg(ctx, '🔍 Images DuckDuckGo : {query}', { query }))
        .setDescription(trg(ctx, 'Consultez directement la galerie DuckDuckGo pour : **{query}**', { query }))
        .setURL(ddgWebLink);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel(trg(ctx, 'Ouvrir sur DuckDuckGo')).setStyle(ButtonStyle.Link).setURL(ddgWebLink)
      );

      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const img = images[0];
    const embed = new EmbedBuilder()
      .setColor(0xf97316)
      .setTitle(`🖼️ ${img.title}`)
      .setImage(img.fullUrl)
      .setFooter({ text: trg(ctx, 'Etho Fun • DuckDuckGo Image') })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel(trg(ctx, 'Voir en plein écran')).setStyle(ButtonStyle.Link).setURL(img.fullUrl),
      new ButtonBuilder()
        .setLabel(trg(ctx, 'Recherche DuckDuckGo'))
        .setStyle(ButtonStyle.Link)
        .setURL(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`)
    );

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const imageCommand: Command = {
  name: 'image',
  description: 'Search Google for an image',
  category: 'Fun',
  aliases: ['img', 'googleimage'],
  slashData: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Search Google for an image')
    .addStringOption((opt) => opt.setName('search').setDescription('Recherche d\'image').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    const query = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('search')
      : ctx.args.join(' ');

    if (!query || !query.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez indiquer un sujet de recherche.') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const images = await funService.searchImages(query, 1);
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

    if (images.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x4285f4)
        .setTitle(trg(ctx, '🔍 Google Images : {query}', { query }))
        .setDescription(trg(ctx, 'Consultez directement la galerie Google Images pour : **{query}**', { query }))
        .setURL(googleImagesUrl);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel(trg(ctx, 'Ouvrir sur Google Images')).setStyle(ButtonStyle.Link).setURL(googleImagesUrl)
      );

      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const img = images[0];
    const embed = new EmbedBuilder()
      .setColor(0x4285f4)
      .setTitle(`🖼️ ${img.title}`)
      .setImage(img.fullUrl)
      .setFooter({ text: trg(ctx, 'Etho Fun • Google & Web Image') })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel(trg(ctx, 'Image originale')).setStyle(ButtonStyle.Link).setURL(img.fullUrl),
      new ButtonBuilder().setLabel(trg(ctx, 'Recherche Google')).setStyle(ButtonStyle.Link).setURL(googleImagesUrl)
    );

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const reverseimageCommand: Command = {
  name: 'reverseimage',
  description: 'Reverse Images on Google',
  category: 'Fun',
  aliases: ['reverseimg', 'sbi', 'sauce'],
  slashData: new SlashCommandBuilder()
    .setName('reverseimage')
    .setDescription('Reverse Images on Google')
    .addStringOption((opt) => opt.setName('url').setDescription('URL de l\'image').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    let url = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('url')
      : ctx.args[0];

    if (!url && ctx.message?.attachments?.size) {
      url = ctx.message.attachments.first()?.url;
    }

    if (!url || !url.startsWith('http')) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez fournir une URL d\'image valide (http:// ou https://) ou joindre une image.') });
      return;
    }

    const links = funService.getReverseImageLinks(url);
    const { embed, row } = buildReverseImageEmbed(links);

    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const tvshowCommand: Command = {
  name: 'tvshow',
  description: 'Returns information about the specified TV show title given',
  category: 'Fun',
  aliases: ['serie', 'series', 'tv'],
  slashData: new SlashCommandBuilder()
    .setName('tvshow')
    .setDescription('Returns information about the specified TV show title given')
    .addStringOption((opt) => opt.setName('title').setDescription('Titre de la série').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    const title = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('title')
      : ctx.args.join(' ');

    if (!title || !title.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser le nom d\'une série (ex: `/tvshow Breaking Bad`).') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const show = await funService.getTvShow(title);
    if (!show) {
      const msg = `❌ Aucune série trouvée pour **${title}**.`;
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ content: msg });
        return;
      }
      await ctx.reply({ content: msg });
      return;
    }

    const { embed, row } = buildTvShowEmbed(show);
    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const movieCommand: Command = {
  name: 'movie',
  description: 'Returns information about the specified movie title given',
  category: 'Fun',
  aliases: ['film', 'cinema'],
  slashData: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Returns information about the specified movie title given')
    .addStringOption((opt) => opt.setName('title').setDescription('Titre du film').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    const title = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('title')
      : ctx.args.join(' ');

    if (!title || !title.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser le nom d\'un film (ex: `/movie Inception`).') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const movie = await funService.getMovie(title);
    if (!movie) {
      const msg = `❌ Aucun film trouvé pour **${title}**.`;
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ content: msg });
        return;
      }
      await ctx.reply({ content: msg });
      return;
    }

    const { embed, row } = buildMovieEmbed(movie);
    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const gameCommand: Command = {
  name: 'game',
  description: 'Returns information about the specified game title given',
  category: 'Fun',
  aliases: ['jeu', 'jeux', 'videogame'],
  slashData: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Returns information about the specified game title given')
    .addStringOption((opt) => opt.setName('title').setDescription('Titre du jeu vidéo').setRequired(true)),
  execute: async (ctx: CommandContext): Promise<void> => {
    const title = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options.getString('title')
      : ctx.args.join(' ');

    if (!title || !title.trim()) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser le nom d\'un jeu vidéo (ex: `/game Cyberpunk 2077`).') });
      return;
    }

    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.deferReply();
    }

    const game = await funService.getGame(title);
    if (!game) {
      const msg = `❌ Aucun jeu trouvé pour **${title}**.`;
      if (ctx.isSlash && ctx.interaction) {
        await ctx.interaction.editReply({ content: msg });
        return;
      }
      await ctx.reply({ content: msg });
      return;
    }

    const { embed, row } = buildGameEmbed(game);
    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

export const funMasterCommand: Command = {
  name: 'fun',
  description: 'Commandes de divertissement et médias (lyrics, quote, movie, tvshow, game, image)',
  category: 'Fun',
  aliases: ['divertissement'],
  slashData: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Commandes de divertissement et médias')
    .addSubcommand((sub) =>
      sub
        .setName('lyrics')
        .setDescription('Gets lyrics for the given song')
        .addStringOption((opt) => opt.setName('query').setDescription('Titre du morceau').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('quote')
        .setDescription('Quote a message')
        .addStringOption((opt) => opt.setName('text').setDescription('Texte de la citation').setRequired(true))
        .addStringOption((opt) => opt.setName('author').setDescription('Auteur').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('image')
        .setDescription('Search Google for an image')
        .addStringOption((opt) => opt.setName('search').setDescription('Recherche').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('duckduckgoimage')
        .setDescription('Search duckduckgo for an image')
        .addStringOption((opt) => opt.setName('search').setDescription('Recherche').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reverseimage')
        .setDescription('Reverse Images on Google')
        .addStringOption((opt) => opt.setName('url').setDescription('URL de l\'image').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('tvshow')
        .setDescription('Returns information about the specified TV show title given')
        .addStringOption((opt) => opt.setName('title').setDescription('Titre de la série').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('movie')
        .setDescription('Returns information about the specified movie title given')
        .addStringOption((opt) => opt.setName('title').setDescription('Titre du film').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('game')
        .setDescription('Returns information about the specified game title given')
        .addStringOption((opt) => opt.setName('title').setDescription('Titre du jeu').setRequired(true))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    if (ctx.isSlash && ctx.interaction) {
      const sub = (ctx.interaction as any).options.getSubcommand();
      switch (sub) {
        case 'lyrics':
          return lyricsCommand.execute(ctx);
        case 'quote':
          return quoteCommand.execute(ctx);
        case 'image':
          return imageCommand.execute(ctx);
        case 'duckduckgoimage':
          return duckduckgoimageCommand.execute(ctx);
        case 'reverseimage':
          return reverseimageCommand.execute(ctx);
        case 'tvshow':
          return tvshowCommand.execute(ctx);
        case 'movie':
          return movieCommand.execute(ctx);
        case 'game':
          return gameCommand.execute(ctx);
      }
    }

    const sub = ctx.args[0]?.toLowerCase();
    const restArgs = ctx.args.slice(1);
    const subCtx = new CommandContext({
      message: ctx.message,
      interaction: ctx.interaction,
      args: restArgs,
      prefix: ctx.prefix,
      guildConfig: ctx.guildConfig,
    });

    switch (sub) {
      case 'lyrics':
      case 'paroles':
        return lyricsCommand.execute(subCtx);
      case 'quote':
      case 'citation':
        return quoteCommand.execute(subCtx);
      case 'image':
      case 'img':
        return imageCommand.execute(subCtx);
      case 'duckduckgoimage':
      case 'ddgimage':
        return duckduckgoimageCommand.execute(subCtx);
      case 'reverseimage':
      case 'sauce':
        return reverseimageCommand.execute(subCtx);
      case 'tvshow':
      case 'serie':
        return tvshowCommand.execute(subCtx);
      case 'movie':
      case 'film':
        return movieCommand.execute(subCtx);
      case 'game':
      case 'jeu':
        return gameCommand.execute(subCtx);
      default:
        await ctx.reply({
          content: trg(ctx, '🎮 **Commandes Fun disponibles :**\n• `/lyrics <query>`\n• `/quote <text>`\n• `/image <search>`\n• `/duckduckgoimage <search>`\n• `/reverseimage <url>`\n• `/tiktok <user|video>`\n• `/pinterest <search|pin|user>`\n• `/movie <title>`\n• `/tvshow <title>`\n• `/game <title>`'),
        });
    }
  },
};
