import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { TikTokUserResult, TikTokVideoResult } from "../services/tiktokService.js";

export function buildTikTokVideoEmbed(video: TikTokVideoResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0x00f2fe)
    .setTitle("📱 Vidéo TikTok")
    .setURL(video.webUrl)
    .setDescription(video.title)
    .addFields(
      { name: "Créateur", value: `[${video.authorName}](${video.authorUrl})`, inline: true },
      { name: "Plateforme", value: "TikTok", inline: true }
    )
    .setFooter({ text: "Etho TikTok • Flux & Alertes" })
    .setTimestamp();

  if (video.thumbnailUrl) {
    embed.setImage(video.thumbnailUrl);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Ouvrir sur TikTok").setStyle(ButtonStyle.Link).setURL(video.webUrl)
  );

  return { embed, row };
}

export function buildTikTokUserEmbed(user: TikTokUserResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xfe2c55)
    .setTitle(`📱 Profil TikTok ${user.displayName}`)
    .setURL(user.profileUrl)
    .setDescription(`Accédez directement au flux de vidéos, lives et créations de **${user.displayName}**.`)
    .addFields(
      { name: "Pseudo", value: user.username, inline: true },
      { name: "Lien officiel", value: `[Profil TikTok](${user.profileUrl})`, inline: true }
    )
    .setFooter({ text: "Etho TikTok • Créateurs" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Voir le profil").setStyle(ButtonStyle.Link).setURL(user.profileUrl)
  );

  return { embed, row };
}
