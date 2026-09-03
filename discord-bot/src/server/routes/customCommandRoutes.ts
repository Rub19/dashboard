import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { customCommandStorage } from '../../modules/customCommands/storage/customCommandStorage.js';
import { CustomCommandSchema } from '../../modules/customCommands/types/customCommand.js';
import { CUSTOM_COMMAND_TEMPLATES } from '../../modules/customCommands/services/commandTemplates.js';
import { CommandVariableEngine } from '../../modules/customCommands/services/commandVariableEngine.js';
import { CommandActionExecutor } from '../../modules/customCommands/services/commandActionExecutor.js';
import { logger } from '../../utils/logger.js';

const MAX_COMMANDS_PER_GUILD = 50;

export function createCustomCommandRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. List
  router.get('/list', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const commands = customCommandStorage.getCommands(guildId);
    res.json({ commands });
  });

  // 2. Templates list
  router.get('/templates', (_req: Request, res: Response): void => {
    res.json({ templates: CUSTOM_COMMAND_TEMPLATES });
  });

  // 3. Detail
  router.get('/:id', (req: Request, res: Response): void => {
    const id = String(req.params.id);
    const cmd = customCommandStorage.getById(id);
    if (!cmd) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    res.json({ command: cmd });
  });

  // 4. Create
  router.post('/create', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const existing = customCommandStorage.getCommands(guildId);

    if (existing.length >= MAX_COMMANDS_PER_GUILD) {
      res.status(400).json({ error: `Limite de ${MAX_COMMANDS_PER_GUILD} commandes atteinte.` });
      return;
    }

    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nom de commande requis' });
      return;
    }

    const conflictBuiltin = ['help', 'ping', 'prefix', 'settings', 'ticket', 'ban', 'kick', 'warn', 'clear', 'rank', 'leaderboard', 'xp', 'giveaway', 'suggest'];
    if (conflictBuiltin.includes(name.toLowerCase())) {
      res.status(400).json({ error: 'Ce nom est réservé par une commande système existante.' });
      return;
    }

    const existsAlready = customCommandStorage.getByName(guildId, name);
    if (existsAlready) {
      res.status(409).json({ error: `Une commande nommée "${name}" existe déjà.` });
      return;
    }

    try {
      const cmd = customCommandStorage.create({ ...req.body, guildId });
      res.json({ success: true, command: cmd });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de commande invalides' });
    }
  });

  // 5. Create from template
  router.post('/from-template', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const { templateName } = req.body;

    const tpl = CUSTOM_COMMAND_TEMPLATES.find((t) => t.name === templateName);
    if (!tpl) {
      res.status(404).json({ error: 'Template introuvable' });
      return;
    }

    let name = tpl.name!;
    const existing = customCommandStorage.getByName(guildId, name);
    if (existing) {
      name = `${name}_copy`;
    }

    try {
      const cmd = customCommandStorage.create({ ...tpl, name, guildId });
      res.json({ success: true, command: cmd });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erreur création depuis template' });
    }
  });

  // 6. Update
  router.put('/:id', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const existing = customCommandStorage.getById(id);

    if (!existing || existing.guildId !== guildId) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    try {
      const updated = customCommandStorage.update(id, req.body);
      res.json({ success: true, command: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  // 7. Duplicate
  router.post('/:id/duplicate', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const existing = customCommandStorage.getById(id);

    if (!existing || existing.guildId !== guildId) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const dup = customCommandStorage.duplicate(id);
    if (!dup) {
      res.status(500).json({ error: 'Erreur lors de la duplication' });
      return;
    }

    res.json({ success: true, command: dup });
  });

  // 8. Toggle enabled
  router.post('/:id/toggle', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const existing = customCommandStorage.getById(id);

    if (!existing || existing.guildId !== guildId) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const updated = customCommandStorage.update(id, { enabled: !existing.enabled });
    res.json({ success: true, command: updated });
  });

  // 9. Delete
  router.delete('/:id', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const existing = customCommandStorage.getById(id);

    if (!existing || existing.guildId !== guildId) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const ok = customCommandStorage.delete(id);
    res.json({ success: ok });
  });

  // 10. Test / Preview (simulation only, no real dangerous actions)
  router.post('/:id/test', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const cmd = customCommandStorage.getById(id);

    if (!cmd || cmd.guildId !== guildId) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const mockCtx = {
      guild: { name: 'Mon Serveur', id: guildId, memberCount: 128 } as any,
      member: {
        id: '000000001',
        displayName: 'ExampleUser',
        user: { username: 'ExampleUser', id: '000000001' },
      } as any,
      channel: { name: 'général', id: '000000002' } as any,
      args: req.body.args || {},
    };

    const previews: any[] = [];

    const replyFn = async (payload: any) => {
      previews.push({
        content: payload.content || null,
        embed: payload.embeds?.[0]?.toJSON?.() || null,
        buttons: payload.components?.length > 0,
      });
    };

    try {
      // Only execute send_response type actions in test mode
      for (const block of cmd.conditions) {
        const condResult = true; // Always true in test mode
        const actions = condResult ? block.thenActions : (block.elseActions || []);
        for (const action of actions.filter((a) => a.type === 'send_response')) {
          if (action.response) {
            await replyFn(CommandActionExecutor.buildReply(action.response, mockCtx as any));
          }
        }
      }

      for (const action of cmd.defaultActions.filter((a) => a.type === 'send_response')) {
        if (action.response) {
          await replyFn(CommandActionExecutor.buildReply(action.response, mockCtx as any));
        }
      }

      res.json({ success: true, previews });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur de simulation' });
    }
  });

  // 11. Variable preview
  router.post('/preview-variables', (req: Request, res: Response): void => {
    const { text, args } = req.body;
    const mockCtx = {
      guild: { name: 'Mon Serveur', id: String(req.params.guildId), memberCount: 128 } as any,
      member: {
        id: '000000001',
        displayName: 'ExampleUser',
        user: { username: 'ExampleUser', id: '000000001' },
      } as any,
      channel: { name: 'général', id: '000000002' } as any,
      args: args || {},
    };

    const resolved = CommandVariableEngine.replace(String(text || ''), mockCtx as any);
    res.json({ resolved });
  });

  return router;
}
