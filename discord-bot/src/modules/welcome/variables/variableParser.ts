import { VariableContext } from '../types/variables.js';

export class VariableParser {
  public static parse(template: string, ctx: VariableContext): string {
    if (!template) return '';

    const userReplacement = ctx.mentionUser ? `<@${ctx.userId}>` : ctx.displayName;
    const createdAtStr = ctx.userCreatedAt
      ? ctx.userCreatedAt.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Inconnu';

    let accountAgeStr = ctx.accountAge || '';
    if (!accountAgeStr && ctx.userCreatedAt) {
      const diffMs = Date.now() - ctx.userCreatedAt.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 30) accountAgeStr = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      else if (diffDays < 365) accountAgeStr = `${Math.floor(diffDays / 30)} mois`;
      else accountAgeStr = `${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
    }

    return template
      .replace(/\{user\}/gi, userReplacement)
      .replace(/\{mention\}/gi, `<@${ctx.userId}>`)
      .replace(/\{username\}/gi, ctx.username)
      .replace(/\{displayname\}/gi, ctx.displayName)
      .replace(/\{userid\}/gi, ctx.userId)
      .replace(/\{server\}/gi, ctx.guildName)
      .replace(/\{serverid\}/gi, ctx.guildId)
      .replace(/\{membercount\}/gi, ctx.memberCount.toLocaleString('fr-FR'))
      .replace(/\{usercount\}/gi, ctx.memberCount.toLocaleString('fr-FR'))
      .replace(/\{serverowner\}/gi, ctx.serverOwner || 'Propriétaire')
      .replace(/\{channel\}/gi, ctx.channelId ? `<#${ctx.channelId}>` : '')
      .replace(/\{createdat\}/gi, createdAtStr)
      .replace(/\{accountage\}/gi, accountAgeStr || 'Récent');
  }
}
