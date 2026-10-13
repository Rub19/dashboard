import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { TwitterPostResult, TwitterUserResult } from "../services/twitterService.js";

export function buildTwitterPostEmbed(post: TwitterPostResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle("𝕏 Post X / Twitter")
    .setURL(post.webUrl)
    .setDescription(post.caption)
    .addFields(
      { name: "Auteur", value: `@${post.username || "auteur"}`, inline: true },
      { name: "Identifiant", value: post.tweetId, inline: true }
    )
    .setFooter({ text: "Etho X • Posts & Retweets" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Ouvrir sur X").setStyle(ButtonStyle.Link).setURL(post.webUrl),
    new ButtonBuilder().setLabel("Aperçu direct (FxTwitter)").setStyle(ButtonStyle.Link).setURL(post.fixEmbedUrl)
  );

  return { embed, row };
}

export function buildTwitterUserEmbed(user: TwitterUserResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle(`𝕏 Profil X @${user.username}`)
    .setURL(user.profileUrl)
    .setDescription(`Accédez au flux de posts, retweets et réponses de **@${user.username}**.`)
    .addFields(
      { name: "Compte", value: `@${user.username}`, inline: true },
      { name: "Lien officiel", value: `[Profil X](${user.profileUrl})`, inline: true }
    )
    .setFooter({ text: "Etho X • Profils" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Voir le profil sur X").setStyle(ButtonStyle.Link).setURL(user.profileUrl)
  );

  return { embed, row };
}
