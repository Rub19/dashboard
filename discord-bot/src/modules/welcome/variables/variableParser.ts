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
      .replace(/\{channel\}/gi, ctx.channelId ? `<#${ctx.channelId}>` : '')
      .replace(/\{createdat\}/gi, createdAtStr);
  }
}
