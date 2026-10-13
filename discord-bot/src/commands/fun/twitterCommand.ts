import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types/command.js";
import { twitterService } from "../../modules/fun/services/twitterService.js";
import { buildTwitterPostEmbed, buildTwitterUserEmbed } from "../../modules/fun/ui/twitterEmbeds.js";

export const twitterCommand: Command = {
  name: "twitter",
  description: "Recherche de profils et inspection de posts X / Twitter",
  category: "Fun",
  aliases: ["x", "tweet"],
  slashData: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("Recherche de profils et inspection de posts X / Twitter")
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Affiche le profil d'un compte sur X")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo X").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("Inspecte et affiche un post X / Twitter")
        .addStringOption((opt) => opt.setName("url").setDescription("URL ou identifiant du tweet").setRequired(true))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    if (ctx.isSlash && ctx.interaction) {
      const sub = (ctx.interaction as any).options.getSubcommand();
      if (sub === "user") {
        const username = (ctx.interaction as any).options.getString("username", true);
        const user = twitterService.getUserInfo(username);
        const { embed, row } = buildTwitterUserEmbed(user);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (sub === "post") {
        const url = (ctx.interaction as any).options.getString("url", true);
        const post = twitterService.getPostInfo(url);
        const { embed, row } = buildTwitterPostEmbed(post);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
    }

    const firstArg = ctx.args[0];
    if (!firstArg) {
      await ctx.reply({
        content: "❌ Utilisation : `!twitter user <pseudo>` ou `!twitter post <url>`",
      });
      return;
    }

    const sub = firstArg.toLowerCase();
    if (sub === "post" || firstArg.includes("x.com/") || firstArg.includes("twitter.com/")) {
      const postArg = sub === "post" ? ctx.args.slice(1).join(" ") : firstArg;
      if (!postArg) {
        await ctx.reply({ content: "❌ Veuillez préciser une URL de post X." });
        return;
      }
      const post = twitterService.getPostInfo(postArg);
      const { embed, row } = buildTwitterPostEmbed(post);
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const username = sub === "user" ? ctx.args.slice(1).join(" ") : firstArg;
    if (!username) {
      await ctx.reply({ content: "❌ Veuillez préciser un pseudo X." });
      return;
    }
    const user = twitterService.getUserInfo(username);
    const { embed, row } = buildTwitterUserEmbed(user);
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};
