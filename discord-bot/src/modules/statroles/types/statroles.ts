import { z } from 'zod';

/**
 * Statroles — rôles attribués (et retirés) automatiquement selon l'activité d'un membre dans la durée : messages, temps
 * vocal, ancienneté sur le serveur ou du compte, rôle possédé. Contrairement à un rôle de niveau, un statrole se retire tout
 * seul quand le membre ne remplit plus les conditions. Les conditions forment un arbre : des groupes « TOUT » (ET) ou
 * « AU MOINS UN » (OU), pouvant contenir d'autres groupes.
 */

export const OPERATORS = ['>=', '>', '<=', '<', '='] as const;
export const OperatorSchema = z.enum(OPERATORS);
export type Operator = z.infer<typeof OperatorSchema>;

const days = z.number().int().min(1).max(365);

export const MessagesConditionSchema = z.object({ kind: z.literal('messages'), days, op: OperatorSchema.default('>='), value: z.number().int().min(0).max(10_000_000) });
export const VoiceConditionSchema = z.object({ kind: z.literal('voice'), days, op: OperatorSchema.default('>='), hours: z.number().min(0).max(100_000) });
export const JoinedAgeConditionSchema = z.object({ kind: z.literal('joinedAge'), op: OperatorSchema.default('>='), days: z.number().int().min(0).max(10_000) });
export const AccountAgeConditionSchema = z.object({ kind: z.literal('accountAge'), op: OperatorSchema.default('>='), days: z.number().int().min(0).max(10_000) });
export const HasRoleConditionSchema = z.object({ kind: z.literal('hasRole'), roleId: z.string().regex(/^\d{5,25}$/), not: z.boolean().default(false) });

export type LeafCondition =
  | z.infer<typeof MessagesConditionSchema>
  | z.infer<typeof VoiceConditionSchema>
  | z.infer<typeof JoinedAgeConditionSchema>
  | z.infer<typeof AccountAgeConditionSchema>
  | z.infer<typeof HasRoleConditionSchema>;

export interface GroupCondition {
  kind: 'group';
  match: 'ALL' | 'ANY';
  children: Condition[];
}
export type Condition = LeafCondition | GroupCondition;

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    MessagesConditionSchema,
    VoiceConditionSchema,
    JoinedAgeConditionSchema,
    AccountAgeConditionSchema,
    HasRoleConditionSchema,
    z.object({ kind: z.literal('group'), match: z.enum(['ALL', 'ANY']), children: z.array(ConditionSchema).max(20) }),
  ])
) as z.ZodType<Condition>;

export const GroupSchema = z.object({ kind: z.literal('group'), match: z.enum(['ALL', 'ANY']), children: z.array(ConditionSchema).max(20) });

export const MAX_DEPTH = 4;
export const MAX_NODES = 30;

/** Profondeur maximale et nombre total de nœuds : l'arbre reste lisible et son évaluation bornée. */
export function treeStats(node: Condition, depth = 1): { depth: number; nodes: number } {
  if (node.kind !== 'group') return { depth, nodes: 1 };
  return node.children.reduce(
    (acc, child) => {
      const s = treeStats(child, depth + 1);
      return { depth: Math.max(acc.depth, s.depth), nodes: acc.nodes + s.nodes };
    },
    { depth, nodes: 1 }
  );
}

export const StatroleRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{3,40}$/),
  name: z.string().min(1).max(60),
  roleId: z.string().regex(/^\d{5,25}$/),
  root: GroupSchema,
  /** Retire le rôle quand le membre ne remplit plus les conditions (c'est ce qui distingue un statrole d'un rôle de niveau). */
  removeWhenNotMatching: z.boolean().default(true),
  enabled: z.boolean().default(true),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type StatroleRule = z.infer<typeof StatroleRuleSchema>;

export const StatrolesConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  rules: z.array(StatroleRuleSchema).max(25).default([]),
  lastRunAt: z.string().nullable().default(null),
  lastRun: z.object({ added: z.number().int(), removed: z.number().int(), errors: z.number().int(), skipped: z.number().int() }).nullable().default(null),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type StatrolesConfig = z.infer<typeof StatrolesConfigSchema>;

export interface RunSummary {
  added: number;
  removed: number;
  errors: number;
  skipped: number;
  issues: string[];
}

export interface RulePreview {
  matching: number;
  holders: number;
  toAdd: number;
  toRemove: number;
  sample: Array<{ id: string; name: string }>;
  warnings: string[];
}
