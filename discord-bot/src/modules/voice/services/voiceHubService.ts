import { CategoryChannel, ChannelType, Guild, PermissionFlagsBits } from 'discord.js';
import { z } from 'zod';
import { voiceRepository } from '../storage/voiceRepository.js';
import type { VoiceHub } from '../types/index.js';

const snowflake = z.string().regex(/^\d{5,25}$/);

const hubFields = {
  name: z.string().trim().min(1).max(60),
  categoryId: snowflake.nullable(),
  namingTemplate: z.string().trim().min(1).max(90),
  userLimit: z.number().int().min(0).max(99),
  bitrate: z.number().int().min(8000).max(384000),
  accessMode: z.enum(['public', 'locked', 'role_only', 'invite_only']),
  autoNumbering: z.boolean(),
  enabled: z.boolean(),
  allowedRoles: z.array(snowflake).max(25),
  excludedRoles: z.array(snowflake).max(25),
  roleRequirementMode: z.enum(['any', 'all']),
};

/** Création : le salon déclencheur est obligatoire, le reste a des valeurs par défaut. */
export const CreateHubSchema = z.object({ ...hubFields, channelId: snowflake, type: z.enum(['voice', 'stage']) }).partial().required({ channelId: true }).strict();
/** Modification : seuls ces champs sont modifiables (jamais id, guildId, createdAt). */
export const UpdateHubSchema = z.object({ ...hubFields, channelId: snowflake }).partial().strict();

export const QUICK_CATEGORY_NAME = '🎙️ SALONS TEMPORAIRES';
export const QUICK_TRIGGER_NAME = '➕ Créer ton salon';
export const QUICK_HUB_NAME = 'Salons temporaires';
export const QUICK_NAMING_TEMPLATE = '🔊 Salon de {username}';

export const VOICE_TEMPLATE_TOKENS = [
  { token: '{username}', description: 'Pseudo Discord du créateur' },
  { token: '{displayName}', description: 'Nom affiché sur le serveur' },
  { token: '{number}', description: 'Numéro du salon (1, 2, 3…)' },
  { token: '{server}', description: 'Nom du serveur' },
];

const newHubId = () => 'hub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

/** Le salon déclencheur doit exister sur CE serveur, être vocal (ou scène) et ne pas déjà servir à un autre hub. */
export function checkTriggerChannel(guild: Guild, channelId: string, type: 'voice' | 'stage', ignoreHubId?: string): string | null {
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return 'Salon introuvable sur ce serveur';
  const want = type === 'stage' ? ChannelType.GuildStageVoice : ChannelType.GuildVoice;
  if (ch.type !== want) return type === 'stage' ? 'Le salon déclencheur doit être un salon de conférence' : 'Le salon déclencheur doit être un salon vocal';
  const clash = voiceRepository.getHubByChannelId(channelId);
  if (clash && clash.id !== ignoreHubId) return `Ce salon est déjà le déclencheur du hub « ${clash.name} »`;
  return null;
}

export function createHub(guild: Guild, input: z.infer<typeof CreateHubSchema>): { hub?: VoiceHub; error?: string } {
  const type = input.type ?? 'voice';
  const problem = checkTriggerChannel(guild, input.channelId!, type);
  if (problem) return { error: problem };
  const trigger = guild.channels.cache.get(input.channelId!);
  const hub: VoiceHub = {
    id: newHubId(),
    guildId: guild.id,
    name: input.name ?? QUICK_HUB_NAME,
    categoryId: input.categoryId ?? trigger?.parentId ?? null,
    channelId: input.channelId!,
    type,
    namingTemplate: input.namingTemplate ?? QUICK_NAMING_TEMPLATE,
    userLimit: input.userLimit ?? 0,
    bitrate: input.bitrate ?? 64000,
    region: null,
    allowedRoles: input.allowedRoles ?? [],
    excludedRoles: input.excludedRoles ?? [],
    roleRequirementMode: input.roleRequirementMode ?? 'any',
    accessMode: input.accessMode ?? 'public',
    autoNumbering: input.autoNumbering ?? true,
    enabled: input.enabled ?? true,
    createdAt: new Date().toISOString(),
  };
  return { hub: voiceRepository.saveHub(hub) };
}

export function updateHub(guild: Guild, hubId: string, patch: z.infer<typeof UpdateHubSchema>): { hub?: VoiceHub; error?: string; notFound?: boolean } {
  const existing = voiceRepository.getHubById(hubId);
  if (!existing || existing.guildId !== guild.id) return { notFound: true, error: 'Hub introuvable' };
  if (patch.channelId && patch.channelId !== existing.channelId) {
    const problem = checkTriggerChannel(guild, patch.channelId, existing.type, existing.id);
    if (problem) return { error: problem };
  }
  return { hub: voiceRepository.saveHub({ ...existing, ...patch, id: existing.id, guildId: existing.guildId, createdAt: existing.createdAt } as VoiceHub) };
}

/**
 * Installation en un clic : catégorie « SALONS TEMPORAIRES » + salon déclencheur + hub par défaut, et activation du module.
 * Réutilise la catégorie/le salon du même nom s'ils existent déjà (relancer ne crée pas de doublon).
 */
export async function quickSetup(guild: Guild): Promise<{ hub: VoiceHub; created: boolean; categoryId: string; channelId: string }> {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('Le bot a besoin de la permission « Gérer les salons » pour créer la catégorie et le salon déclencheur.');
  }
  const existingHub = voiceRepository.getHubs(guild.id).find((h) => guild.channels.cache.has(h.channelId));
  if (existingHub) {
    voiceRepository.updateSettings(guild.id, { enabled: true });
    return { hub: existingHub, created: false, categoryId: existingHub.categoryId ?? '', channelId: existingHub.channelId };
  }

  let category = guild.channels.cache.find((c): c is CategoryChannel => c.type === ChannelType.GuildCategory && c.name === QUICK_CATEGORY_NAME);
  if (!category) {
    category = await guild.channels.create({ name: QUICK_CATEGORY_NAME, type: ChannelType.GuildCategory, reason: 'ETHONE : installation des salons vocaux temporaires' });
  }
  let trigger = guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.parentId === category!.id && c.name === QUICK_TRIGGER_NAME && !voiceRepository.getHubByChannelId(c.id));
  if (!trigger) {
    // Salon où l'on passe seulement : personne n'y parle, on y est déplacé dans son propre salon aussitôt.
    trigger = await guild.channels.create({
      name: QUICK_TRIGGER_NAME,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Speak] }],
      reason: 'ETHONE : salon déclencheur Join-to-Create',
    });
  }
  const res = createHub(guild, { channelId: trigger.id, name: QUICK_HUB_NAME, categoryId: category.id });
  if (!res.hub) throw new Error(res.error || 'Création du hub impossible');
  voiceRepository.updateSettings(guild.id, { enabled: true });
  return { hub: res.hub, created: true, categoryId: category.id, channelId: trigger.id };
}
