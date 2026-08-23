import { EmbedBuilder } from 'discord.js';

export const Colors = {
  primary: 0x5865F2,
  success: 0x57F287,
  error: 0xED4245,
  warning: 0xFEE75C,
  info: 0x5865F2,
};

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(Colors.success).setTitle(`✅ ${title}`).setDescription(description);
}

export function errorEmbed(description) {
  return new EmbedBuilder().setColor(Colors.error).setTitle('❌ Erreur').setDescription(description);
}

export function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(Colors.primary).setTitle(title).setDescription(description);
}

export function warningEmbed(title, description) {
  return new EmbedBuilder().setColor(Colors.warning).setTitle(`⚠️ ${title}`).setDescription(description);
}
