import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types/command.js";
import { instagramService } from "../../modules/fun/services/instagramService.js";
import { buildInstagramPostEmbed, buildInstagramUserEmbed } from "../../modules/fun/ui/instagramEmbeds.js";
import { trg } from '../../utils/tr.js';

export const instagramCommand: Command = {
  name: "instagram",
  description: "Recherche de profils et inspection de publications Instagram",
  category: "Fun",
  aliases: ["insta", "ig"],
  slashData: new SlashCommandBuilder()
    .setName("instagram")
    .setDescription("Recherche de profils et inspection de publications Instagram")
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Affiche le profil et les photos d'un compte Instagram")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo Instagram").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("Inspecte et affiche une publication Instagram")
        .addStringOption((opt) => opt.setName("url").setDescription("URL ou identifiant du post").setRequired(true))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    if (ctx.isSlash && ctx.interaction) {
      const sub = (ctx.interaction as any).options.getSubcommand();
      if (sub === "user") {
        const username = (ctx.interaction as any).options.getString("username", true);
        const user = instagramService.getUserInfo(username);
        const { embed, row } = buildInstagramUserEmbed(user);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (sub === "post") {
        const url = (ctx.interaction as any).options.getString("url", true);
        const post = instagramService.getPostInfo(url);
        const { embed, row } = buildInstagramPostEmbed(post);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
    }

    const firstArg = ctx.args[0];
    if (!firstArg) {
      await ctx.reply({
        content: trg(ctx, '❌ Utilisation : `!instagram user <pseudo>` ou `!instagram post <url>`'),
      });
      return;
    }

    const sub = firstArg.toLowerCase();
    if (sub === "post" || firstArg.includes("instagram.com/p/") || firstArg.includes("instagram.com/reel/")) {
      const postArg = sub === "post" ? ctx.args.slice(1).join(" ") : firstArg;
      if (!postArg) {
        await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser une URL de publication Instagram.') });
        return;
      }
      const post = instagramService.getPostInfo(postArg);
      const { embed, row } = buildInstagramPostEmbed(post);
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const username = sub === "user" ? ctx.args.slice(1).join(" ") : firstArg;
    if (!username) {
      await ctx.reply({ content: trg(ctx, '❌ Veuillez préciser un pseudo Instagram.') });
      return;
    }
    const user = instagramService.getUserInfo(username);
    const { embed, row } = buildInstagramUserEmbed(user);
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};
