import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { InstagramPostResult, InstagramUserResult } from "../services/instagramService.js";

export function buildInstagramPostEmbed(post: InstagramPostResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xe1306c)
    .setTitle("📷 Publication Instagram")
    .setURL(post.postUrl)
    .setDescription(post.caption)
    .addFields(
      { name: "Identifiant", value: post.shortcode, inline: true },
      { name: "Plateforme", value: "Instagram", inline: true }
    )
    .setFooter({ text: "Etho Instagram • Posts & Reels" })
    .setTimestamp();

  if (post.thumbnailUrl) {
    embed.setImage(post.thumbnailUrl);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Ouvrir sur Instagram").setStyle(ButtonStyle.Link).setURL(post.postUrl)
  );

  return { embed, row };
}

export function buildInstagramUserEmbed(user: InstagramUserResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xc13584)
    .setTitle(`📷 Profil Instagram @${user.username}`)
    .setURL(user.profileUrl)
    .setDescription(`Accédez au flux photos, reels et stories de **@${user.username}**.`)
    .addFields(
      { name: "Pseudo", value: `@${user.username}`, inline: true },
      { name: "Lien officiel", value: `[Profil Instagram](${user.profileUrl})`, inline: true }
    )
    .setFooter({ text: "Etho Instagram • Flux" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Voir le profil").setStyle(ButtonStyle.Link).setURL(user.profileUrl)
  );

  return { embed, row };
}
