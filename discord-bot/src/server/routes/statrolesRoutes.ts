import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { statrolesStorage } from '../../modules/statroles/storage/statrolesStorage.js';
import { statrolesEngine, roleIssue } from '../../modules/statroles/services/statrolesEngine.js';
import { StatroleRuleSchema, treeStats, MAX_DEPTH, MAX_NODES, Condition, StatroleRule } from '../../modules/statroles/types/statroles.js';
import { statsStorage } from '../../modules/stats/storage/statsStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

function countLeaves(node: Condition): number {
  return node.kind === 'group' ? node.children.reduce((n, c) => n + countLeaves(c), 0) : 1;
}

/** Validation d'une règle reçue du dashboard : forme (zod), taille de l'arbre, au moins une condition, rôle attribuable. */
function validateRule(client: Client, guildId: string, body: unknown): { rule?: StatroleRule; error?: string } {
  const parsed = StatroleRuleSchema.safeParse(body);
  if (!parsed.success) return { error: `Règle invalide : ${parsed.error.issues[0]?.path.join('.') || ''} ${parsed.error.issues[0]?.message ?? ''}`.trim() };
  const rule = parsed.data;
  const s = treeStats(rule.root);
  if (s.depth > MAX_DEPTH) return { error: `Les groupes sont imbriqués sur trop de niveaux (maximum ${MAX_DEPTH}).` };
  if (s.nodes > MAX_NODES) return { error: `Trop de conditions (maximum ${MAX_NODES}).` };
  if (countLeaves(rule.root) === 0) return { error: 'Ajoutez au moins une condition : une règle sans condition ne correspondrait à personne.' };
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { error: 'Serveur introuvable' };
  const issue = roleIssue(guild, rule.roleId);
  if (issue) return { error: `Ce rôle ne peut pas être attribué : ${issue}.` };
  return { rule };
}

/** API Dashboard du module Statroles (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createStatrolesRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    const config = statrolesStorage.getConfig(guildId);
    res.json({
      config,
      statsEnabled: statsStorage.isEnabled(guildId),
      roles: guild ? guild.roles.cache.filter((r) => r.id !== guild.id).map((r) => ({ id: r.id, name: r.name, color: r.hexColor, assignable: roleIssue(guild, r.id) === null })).sort((a, b) => a.name.localeCompare(b.name)) : [],
    });
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const parsed = z.object({ enabled: z.boolean() }).strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide' });
      return;
    }
    const updated = statrolesStorage.updateConfig(guildId, { enabled: parsed.data.enabled });
    emitConfigUpdated('statroles', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  router.put('/rules/:ruleId', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const v = validateRule(client, guildId, { ...req.body, id: String(req.params.ruleId) });
    if (!v.rule) {
      res.status(400).json({ error: v.error });
      return;
    }
    const isNew = !statrolesStorage.getConfig(guildId).rules.some((r) => r.id === v.rule!.id);
    if (isNew && statrolesStorage.getConfig(guildId).rules.length >= 25) {
      res.status(429).json({ error: 'Limite de 25 règles atteinte.' });
      return;
    }
    const updated = statrolesStorage.upsertRule(guildId, v.rule);
    emitConfigUpdated('statroles', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  router.delete('/rules/:ruleId', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const ok = statrolesStorage.deleteRule(guildId, String(req.params.ruleId));
    if (ok) emitConfigUpdated('statroles', guildId, statrolesStorage.getConfig(guildId), 'DASHBOARD', req.user?.id);
    res.json({ success: ok });
  });

  // Aperçu d'une règle (non enregistrée) : combien de membres correspondent, qui recevrait / perdrait le rôle.
  router.post('/preview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const v = validateRule(client, guildId, { ...req.body, id: 'apercu' });
    if (!v.rule) {
      res.status(400).json({ error: v.error });
      return;
    }
    res.json(await statrolesEngine.preview(client.guilds.cache.get(guildId)!, v.rule));
  });

  router.post('/run', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }
    if (!statrolesStorage.getConfig(guild.id).enabled) {
      res.status(409).json({ error: 'Activez le module avant d’appliquer les règles.' });
      return;
    }
    res.json({ success: true, summary: await statrolesEngine.run(guild) });
  });

  return router;
}
