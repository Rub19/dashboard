import { z } from 'zod';

export const ShopItemSchema = z.object({
  id: z.string().default(() => `shop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
  roleId: z.string(),
  roleName: z.string().default('Rôle'),
  label: z.string().default('Article boutique'),
  description: z.string().default(''),
  price: z.number().min(0).default(100),
  enabled: z.boolean().default(true),
});

export type ShopItem = z.infer<typeof ShopItemSchema>;
