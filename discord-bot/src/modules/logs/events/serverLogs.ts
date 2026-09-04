import { AuditLogEvent, Guild } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleGuildUpdate(oldGuild: Guild, newGuild: Guild): Promise<void> {
  const diffs: { field: string; before: any; after: any }[] = [];

  if (oldGuild.name !== newGuild.name) {
    diffs.push({ field: 'name', before: oldGuild.name, after: newGuild.name });
  }

  if (oldGuild.icon !== newGuild.icon) {
    diffs.push({ field: 'icon', before: oldGuild.iconURL(), after: newGuild.iconURL() });
  }

  if (oldGuild.banner !== newGuild.banner) {
    diffs.push({ field: 'banner', before: oldGuild.bannerURL(), after: newGuild.bannerURL() });
  }

  if (diffs.length === 0) return;

  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    newGuild,
    AuditLogEvent.GuildUpdate
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: newGuild.id,
    module: 'SERVER',
    type: 'SERVER_UPDATE',
    actor,
    target: {
      id: newGuild.id,
      type: 'SERVER',
      name: newGuild.name,
      avatar: newGuild.iconURL(),
    },
    reason: auditRes.reason || 'Modification des paramètres du serveur',
    diff: diffs,
    before: { name: oldGuild.name },
    after: { name: newGuild.name },
  });
}
