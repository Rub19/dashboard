import { z } from 'zod';

export const RoleItemStyleSchema = z.enum(['Primary', 'Secondary', 'Success', 'Danger']);
export type RoleItemStyle = z.infer<typeof RoleItemStyleSchema>;

export const RolePanelItemSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  label: z.string().min(1).max(80),
  emoji: z.string().nullable().default(null),
  description: z.string().max(100).nullable().default(null),
  style: RoleItemStyleSchema.default('Secondary'),
  prerequisiteRoleId: z.string().nullable().default(null),
  mutuallyExclusiveRoleIds: z.array(z.string()).default([]),
});

export type RolePanelItem = z.infer<typeof RolePanelItemSchema>;

export const RoleGroupModeSchema = z.enum(['toggle', 'single_exclusive', 'multi_limit']);
export type RoleGroupMode = z.infer<typeof RoleGroupModeSchema>;

export const RolePanelGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: RoleGroupModeSchema.default('toggle'),
  minSelect: z.number().min(0).default(0),
  maxSelect: z.number().min(1).default(1),
  itemIds: z.array(z.string()).default([]),
});

export type RolePanelGroup = z.infer<typeof RolePanelGroupSchema>;

export const RolePanelSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).max(50).default('Panneau de Rôles'),
  channelId: z.string().nullable().default(null),
  messageId: z.string().nullable().default(null),
  componentType: z.enum(['buttons', 'select_menu']).default('buttons'),
  placeholder: z.string().default('Sélectionnez vos rôles...'),
  title: z.string().default('🎭 Choisissez vos Rôles'),
  description: z
    .string()
    .default('Cliquez sur les boutons ci-dessous pour obtenir ou retirer vos rôles de profil et notifications.'),
  color: z.string().default('#5865F2'),
  thumbnail: z.string().nullable().default(null),
  image: z.string().nullable().default(null),
  footer: z.string().default('Système de Rôles'),
  items: z.array(RolePanelItemSchema).default([]),
  groups: z.array(RolePanelGroupSchema).default([]),
  status: z.enum(['active', 'draft', 'error']).default('draft'),
  lastSyncAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RolePanel = z.infer<typeof RolePanelSchema>;
