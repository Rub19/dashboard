import { Guild, GuildMember, TextChannel } from 'discord.js';

export interface VariableContext {
  guild?: Guild | null;
  member?: GuildMember | null;
  channel?: TextChannel | any | null;
  args?: Record<string, any>;
}

export class CommandVariableEngine {
  public static replace(text: string, ctx: VariableContext): string {
    if (!text) return '';

    let res = text;

    // 1. Utilisateur
    if (ctx.member) {
      res = res.replace(/{user}/g, `<@${ctx.member.id}>`);
      res = res.replace(/{username}/g, ctx.member.user.username);
      res = res.replace(/{display_name}/g, ctx.member.displayName);
      res = res.replace(/{user_id}/g, ctx.member.id);
    } else {
      res = res.replace(/{user}/g, '@Utilisateur');
      res = res.replace(/{username}/g, 'Utilisateur');
      res = res.replace(/{display_name}/g, 'Utilisateur');
      res = res.replace(/{user_id}/g, '123456789');
    }

    // 2. Serveur
    if (ctx.guild) {
      res = res.replace(/{server}/g, ctx.guild.name);
      res = res.replace(/{server_id}/g, ctx.guild.id);
      res = res.replace(/{member_count}/g, ctx.guild.memberCount.toString());
    } else {
      res = res.replace(/{server}/g, 'Mon Serveur');
      res = res.replace(/{server_id}/g, '1128633164290596884');
      res = res.replace(/{member_count}/g, '128');
    }

    // 3. Salon
    if (ctx.channel) {
      res = res.replace(/{channel}/g, `<#${ctx.channel.id}>`);
      res = res.replace(/{channel_id}/g, ctx.channel.id);
      res = res.replace(/{channel_name}/g, ctx.channel.name || 'général');
    } else {
      res = res.replace(/{channel}/g, '#salon');
      res = res.replace(/{channel_id}/g, '000000000');
      res = res.replace(/{channel_name}/g, 'général');
    }

    // 4. Date & Heure
    const now = new Date();
    res = res.replace(/{date}/g, now.toLocaleDateString('fr-FR'));
    res = res.replace(/{time}/g, now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    res = res.replace(/{timestamp}/g, `<t:${Math.floor(now.getTime() / 1000)}:f>`);

    // 5. Arguments personnalisés ({args.nom})
    if (ctx.args) {
      for (const [key, val] of Object.entries(ctx.args)) {
        const regex = new RegExp(`{args\\.${key}}`, 'g');
        res = res.replace(regex, String(val ?? ''));
      }
    }

    return res;
  }
}
