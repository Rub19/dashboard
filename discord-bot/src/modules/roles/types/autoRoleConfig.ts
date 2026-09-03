import { z } from 'zod';

export const AutoRoleConfigSchema = z.object({
  enabled: z.boolean().default(false),
  roleIds: z.array(z.string()).default([]),
  applyToHumans: z.boolean().default(true),
  applyToBots: z.boolean().default(false),
});

export type AutoRoleConfig = z.infer<typeof AutoRoleConfigSchema>;
