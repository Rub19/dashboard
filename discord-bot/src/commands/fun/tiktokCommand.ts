import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types/command.js";
import { tiktokService } from "../../modules/fun/services/tiktokService.js";
import { buildTikTokUserEmbed, buildTikTokVideoEmbed } from "../../modules/fun/ui/tiktokEmbeds.js";

export const tiktokCommand: Command = {
  name: "tiktok",
  description: "Recherche de profils et inspection de vidéos TikTok",
  category: "Fun",
  aliases: ["tt", "tok"],
  slashData: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Recherche de profils et inspection de vidéos TikTok")
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Affiche le profil et le lien d'un créateur TikTok")
        .addStringOption((opt) => opt.setName("username").setDescription("Pseudo TikTok").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("video")
        .setDescription("Inspecte et affiche une vidéo TikTok")
        .addStringOption((opt) => opt.setName("url").setDescription("URL de la vidéo TikTok").setRequired(true))
    ),
  execute: async (ctx: CommandContext): Promise<void> => {
    if (ctx.isSlash && ctx.interaction) {
      const sub = (ctx.interaction as any).options.getSubcommand();
      if (sub === "user") {
        const username = (ctx.interaction as any).options.getString("username", true);
        const user = tiktokService.getUserInfo(username);
        const { embed, row } = buildTikTokUserEmbed(user);
        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (sub === "video") {
        await ctx.interaction.deferReply();
        const url = (ctx.interaction as any).options.getString("url", true);
        const video = await tiktokService.getVideoInfo(url);
        if (!video) {
          await ctx.interaction.editReply({ content: "❌ URL TikTok invalide ou vidéo inaccessible." });
          return;
        }
        const { embed, row } = buildTikTokVideoEmbed(video);
        await ctx.interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }
    }

    const firstArg = ctx.args[0];
    if (!firstArg) {
      await ctx.reply({
        content: "❌ Utilisation : `!tiktok user <pseudo>` ou `!tiktok video <url>`",
      });
      return;
    }

    if (firstArg.toLowerCase() === "user" || (!firstArg.startsWith("http") && ctx.args.length === 1)) {
      const username = firstArg.toLowerCase() === "user" ? ctx.args.slice(1).join(" ") : firstArg;
      if (!username) {
        await ctx.reply({ content: "❌ Veuillez préciser un pseudo TikTok." });
        return;
      }
      const user = tiktokService.getUserInfo(username);
      const { embed, row } = buildTikTokUserEmbed(user);
      await ctx.reply({ embeds: [embed], components: [row] });
      return;
    }

    const videoUrl = firstArg.toLowerCase() === "video" ? ctx.args.slice(1).join(" ") : firstArg;
    const video = await tiktokService.getVideoInfo(videoUrl);
    if (!video) {
      await ctx.reply({ content: "❌ URL TikTok invalide ou vidéo introuvable." });
      return;
    }
    const { embed, row } = buildTikTokVideoEmbed(video);
    await ctx.reply({ embeds: [embed], components: [row] });
  },
};
