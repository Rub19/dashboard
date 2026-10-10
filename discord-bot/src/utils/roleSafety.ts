import { PermissionFlagsBits, type Role } from 'discord.js';

/**
 * Permissions qu'un membre ne doit jamais obtenir sans le staff (rôle libre-service, rôle à l'arrivée, récompense,
 * boutique, commande personnalisée). Un rôle « vérifié » ou « niveau 10 » qui aurait l'une d'elles donnerait les
 * pleins pouvoirs à n'importe qui : il est alors refusé et le refus est journalisé.
 */
const SENSITIVE_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.MentionEveryone,
];

export const isSensitiveRole = (role: Role): boolean => Boolean(role.managed) || SENSITIVE_PERMISSIONS.some((p) => role.permissions?.has?.(p) === true);
