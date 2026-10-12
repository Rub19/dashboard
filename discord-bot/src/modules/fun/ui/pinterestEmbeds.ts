import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { PinterestPinResult, PinterestSearchResult, PinterestUserResult } from "../services/pinterestService.js";

export function buildPinterestPinEmbed(pin: PinterestPinResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xe60023)
    .setTitle(`📌 ${pin.title}`)
    .setURL(pin.pinUrl)
    .setDescription(`Épingle consultable directement sur Pinterest avec visuels haute résolution et tableaux associés.`)
    .addFields(
      { name: "ID Épingle", value: pin.pinId, inline: true },
      { name: "Lien Pinterest", value: `[Ouvrir l'épingle](${pin.pinUrl})`, inline: true }
    )
    .setFooter({ text: "Etho Pinterest • Recherche Lens" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Ouvrir l'épingle").setStyle(ButtonStyle.Link).setURL(pin.pinUrl)
  );

  return { embed, row };
}

export function buildPinterestUserEmbed(user: PinterestUserResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xe60023)
    .setTitle(`📌 Profil Pinterest @${user.username}`)
    .setURL(user.profileUrl)
    .setDescription(`Retrouvez tous les tableaux, épingles sauvegardées et inspirations de **@${user.username}**.`)
    .addFields(
      { name: "Créateur", value: user.username, inline: true },
      { name: "Profil", value: `[pinterest.com/${user.username}](${user.profileUrl})`, inline: true }
    )
    .setFooter({ text: "Etho Pinterest • Tableaux & Inspirations" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Voir le profil Pinterest").setStyle(ButtonStyle.Link).setURL(user.profileUrl)
  );

  return { embed, row };
}

export function buildPinterestSearchEmbed(res: PinterestSearchResult): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const embed = new EmbedBuilder()
    .setColor(0xe60023)
    .setTitle(`🔍 Recherche Pinterest : ${res.query}`)
    .setURL(res.searchUrl)
    .setDescription(`Découvrez les idées visuelles, designs, illustrations et tableaux liés à **${res.query}**.`)
    .addFields(
      { name: "Mots-clés", value: res.query, inline: true },
      { name: "Flux visuel", value: `[Explorer les résultats](${res.searchUrl})`, inline: true }
    )
    .setFooter({ text: "Etho Pinterest • Recherche visuelle" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Explorer sur Pinterest").setStyle(ButtonStyle.Link).setURL(res.searchUrl)
  );

  return { embed, row };
}
