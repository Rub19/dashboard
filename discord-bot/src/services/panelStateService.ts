import { ActionRowBuilder, MessageFlags, type Client, type Message } from 'discord.js';
import { ticketRepository } from '../modules/tickets/storage/ticketRepository.js';
import { pollRepository } from '../modules/polls/storage/pollRepository.js';
import { giveawayStorage } from '../modules/giveaways/storage/giveawayStorage.js';
import { logger } from '../utils/logger.js';

/**
 * Panneaux déjà publiés dans les salons (tickets, sondages, tirages) : quand leur module est coupé, leurs boutons sont grisés
 * pour que personne ne clique dans le vide ; à la réactivation, ils redeviennent utilisables. Les messages à composants V2
 * (cartes modernes) ne sont pas touchés : leurs clics sont de toute façon refusés par le filtre des composants.
 */
export const PANEL_MODULES = new Set(['tickets', 'polls', 'giveaways']);

let client: Client | null = null;
export function initializePanelState(c: Client): void {
  client = c;
}

interface PanelRef {
  channelId: string;
  messageId: string;
}

export function panelsOf(guildId: string, moduleId: string): PanelRef[] {
  const refs: PanelRef[] = [];
  if (moduleId === 'tickets') {
    for (const p of ticketRepository.getPanels(guildId)) if (p.channelId && p.messageId) refs.push({ channelId: p.channelId, messageId: p.messageId });
  } else if (moduleId === 'polls') {
    for (const p of pollRepository.getPolls(guildId)) {
      if ((p.status === 'ACTIVE' || p.status === 'PAUSED') && p.panelConfig.channelId && p.panelConfig.messageId) refs.push({ channelId: p.panelConfig.channelId, messageId: p.panelConfig.messageId });
    }
  } else if (moduleId === 'giveaways') {
    for (const g of giveawayStorage.getAll()) {
      if (g.guildId === guildId && g.status === 'active' && g.channelId && g.messageId) refs.push({ channelId: g.channelId, messageId: g.messageId });
    }
  }
  return refs;
}

/** Grise (ou réactive) tous les boutons et menus d'un message à composants classiques. Renvoie true si le message a été modifié. */
export async function setMessageComponentsDisabled(message: Pick<Message, 'components' | 'flags' | 'edit'>, disabled: boolean): Promise<boolean> {
  if (message.flags?.has?.(MessageFlags.IsComponentsV2)) return false;
  const rows = (message.components ?? []).map((row) => ActionRowBuilder.from(row as never) as ActionRowBuilder<never>);
  if (rows.length === 0) return false;
  let changed = false;
  for (const row of rows) {
    for (const component of row.components as Array<{ data: { disabled?: boolean }; setDisabled: (v: boolean) => unknown }>) {
      if (Boolean(component.data.disabled) !== disabled) {
        component.setDisabled(disabled);
        changed = true;
      }
    }
  }
  if (!changed) return false;
  await message.edit({ components: rows as never });
  return true;
}

export async function syncPanels(guildId: string, moduleId: string, enabled: boolean): Promise<number> {
  if (!client || !PANEL_MODULES.has(moduleId)) return 0;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return 0;
  let edited = 0;
  for (const ref of panelsOf(guildId, moduleId)) {
    try {
      const channel = await guild.channels.fetch(ref.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;
      const message = await channel.messages.fetch(ref.messageId).catch(() => null);
      if (!message) continue;
      if (await setMessageComponentsDisabled(message, !enabled)) edited++;
    } catch (err) {
      logger.warn(`[Panneaux] Mise à jour impossible (${moduleId}, message ${ref.messageId}) :`, err);
    }
  }
  if (edited > 0) logger.info(`[Panneaux] ${edited} panneau(x) ${enabled ? 'réactivé(s)' : 'grisé(s)'} pour « ${moduleId} » (guild ${guildId}).`);
  return edited;
}
