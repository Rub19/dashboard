import type { EmbedBuilder } from 'discord.js';
import { noticeEmbed } from '../../../utils/embeds.js';

const groups = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/** Explique comment ajouter la clé dans une application d'authentification (affiché à l'invité uniquement, en éphémère). */
export function buildSetupEmbed(secret: string, uri: string): EmbedBuilder {
  return noticeEmbed(
    'info',
    [
      '**1.** Dans ton application d’authentification (Google Authenticator, Authy, 1Password…), ajoute un compte **par clé** (saisie manuelle) :',
      `\`\`\`${groups(secret)}\`\`\``,
      'Type : basé sur l’heure · 6 chiffres · 30 secondes.',
      '**2.** Envoie le code affiché : `/elevate code:123456`.',
      `Lien direct pour les applications qui le supportent :\n\`${uri}\``,
      '⚠️ Cette clé n’est montrée qu’à toi et ne sera plus réaffichée une fois activée. Ne la partage jamais.',
    ].join('\n\n'),
    { title: 'Configurer la double authentification' }
  );
}

export function buildGrantedEmbed(expiresAt: Date): EmbedBuilder {
  const ts = Math.floor(expiresAt.getTime() / 1000);
  return noticeEmbed('success', `Permissions activées jusqu’à <t:${ts}:t> (<t:${ts}:R>). Elles seront retirées automatiquement. Tu peux les retirer avant avec \`/elevate terminer:True\`.`, { title: 'Session élevée' });
}
