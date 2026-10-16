import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types/command.js";
import { pinterestService } from "../../modules/fun/services/pinterestService.js";
import {
  buildPinterestPinEmbed,
  buildPinterestSearchEmbed,
  buildPinterestUserEmbed,
} from "../../modules/fun/ui/pinterestEmbeds.js";
import { trg } from '../../utils/tr.js';

export const pinterestCommand: Command = {
  name: "pinterest",
  description: "Recherche visuelle d'épingles, profils et tableaux Pinterest",
  category: "Fun",
  aliases: ["pin", "pinit"],
  slashData: new SlashCommandBuilder()
    .setName("pinterest")
    .setDescription("Recherche visuelle d'épingles, profils et tableaux Pinterest")
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Recherche des épingles et inspirations visuelles sur Pinterest")
        .addStringOption((opt) => opt.setName("query").setDescription("Mots-clés de recherche").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("pin")
        .setDescription("Affiche et inspecte une épingle Pinterest")
        .addStringOption((opt) => opt.setName("url").setDescription("URL ou identifiant de l'épingle").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Affiche le profil et les tableaux d'un créateur Pinterest")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Pinterest").setRequired(true))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    if (ctx.isSlash && ctx.interaction) {
      const sub = (ctx.interaction as any).options.getSubcommand();
      if (sub === "search") {
        const query = (ctx.interaction as any).options.getString("query", true);
        const res = pinterestService.searchPins(query);
        const { embed, row } = buildPinterestSearchEmbed(res);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (sub === "pin") {
        const url = (ctx.interaction as any).options.getString("url", true);
        const pin = pinterestService.getPinInfo(url);
        const { embed, row } = buildPinterestPinEmbed(pin);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (sub === "user") {
        const username = (ctx.interaction as any).options.getString("username", true);
        const user = pinterestService.getUserInfo(username);
        const { embed, row } = buildPinterestUserEmbed(user);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
    }

    const firstArg = ctx.args[0];
    if (!firstArg) {
      await ctx.reply({
        content: trg(ctx, '❌ Utilisation : `!pinterest search <mots-clés>`, `!pinterest pin <url>`, ou `!pinterest user <pseudo>`'),
      });
      return;
    }

    const sub = firstArg.toLowerCase();
    if (sub === "pin") {
      const pinArg = ctx.args.slice(1).join(" ");
      if (!pinArg) {
        await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser une URL ou un ID d\'épingle Pinterest.') });
        return;
      }
      const pin = pinterestService.getPinInfo(pinArg);
      const { embed, row } = buildPinterestPinEmbed(pin);
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (sub === "user") {
      const userArg = ctx.args.slice(1).join(" ");
      if (!userArg) {
        await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser un pseudo Pinterest.') });
        return;
      }
      const user = pinterestService.getUserInfo(userArg);
      const { embed, row } = buildPinterestUserEmbed(user);
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const query = sub === "search" ? ctx.args.slice(1).join(" ") : ctx.args.join(" ");
    if (!query) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser des mots-clés de recherche Pinterest.') });
      return;
    }
    const res = pinterestService.searchPins(query);
    const { embed, row } = buildPinterestSearchEmbed(res);
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};
