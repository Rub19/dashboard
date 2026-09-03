import { z } from 'zod';

export const ArgumentTypeSchema = z.enum(['string', 'number', 'boolean', 'user', 'role', 'channel']);
export type ArgumentType = z.infer<typeof ArgumentTypeSchema>;

export const CommandArgumentSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_-]+$/i, 'Nom d’argument invalide'),
  description: z.string().default(''),
  type: ArgumentTypeSchema.default('string'),
  required: z.boolean().default(false),
});
export type CommandArgument = z.infer<typeof CommandArgumentSchema>;

export const EmbedFieldSchema = z.object({
  name: z.string(),
  value: z.string(),
  inline: z.boolean().default(false),
});
export type EmbedField = z.infer<typeof EmbedFieldSchema>;

export const CustomEmbedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  color: z.string().default('#6366F1'),
  thumbnailUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  footerText: z.string().optional(),
  fields: z.array(EmbedFieldSchema).default([]),
});
export type CustomEmbed = z.infer<typeof CustomEmbedSchema>;

export const CustomButtonSchema = z.object({
  label: z.string().min(1),
  url: z.string().optional(),
  style: z.enum(['link', 'primary', 'secondary', 'success', 'danger']).default('link'),
  customId: z.string().optional(),
});
export type CustomButton = z.infer<typeof CustomButtonSchema>;

export const CommandResponseBlockSchema = z.object({
  content: z.string().optional(),
  embed: CustomEmbedSchema.optional(),
  buttons: z.array(CustomButtonSchema).default([]),
});
export type CommandResponseBlock = z.infer<typeof CommandResponseBlockSchema>;

export const CommandConditionSchema = z.object({
  type: z.enum(['has_role', 'lacks_role', 'is_admin', 'channel_equals', 'arg_equals', 'arg_contains']),
  targetId: z.string().optional(),
  argName: z.string().optional(),
  value: z.string().optional(),
});
export type CommandCondition = z.infer<typeof CommandConditionSchema>;

export const CommandActionSchema = z.object({
  type: z.enum(['send_response', 'add_role', 'remove_role', 'delete_trigger', 'send_dm']),
  roleId: z.string().optional(),
  response: CommandResponseBlockSchema.optional(),
});
export type CommandAction = z.infer<typeof CommandActionSchema>;

export const CustomCommandSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).regex(/^[a-z0-9_-]+$/i, 'Nom de commande invalide'),
  description: z.string().default('Commande personnalisée'),
  category: z.string().default('Personnalisé'),
  triggerType: z.enum(['slash', 'prefix', 'both']).default('both'),
  enabled: z.boolean().default(true),
  cooldownSeconds: z.number().min(0).default(0),
  requiredRoleIds: z.array(z.string()).default([]),
  requiredPermission: z.string().optional(),
  arguments: z.array(CommandArgumentSchema).default([]),
  conditions: z.array(
    z.object({
      condition: CommandConditionSchema,
      thenActions: z.array(CommandActionSchema),
      elseActions: z.array(CommandActionSchema).optional(),
    })
  ).default([]),
  defaultActions: z.array(CommandActionSchema).default([]),
  usageCount: z.number().default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type CustomCommand = z.infer<typeof CustomCommandSchema>;
