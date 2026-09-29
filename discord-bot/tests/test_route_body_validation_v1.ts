/**
 * Plusieurs routes POST/PUT (IA : personnalité/outils/connaissances ; Tickets : catégories/panneaux ;
 * Invitations : récompenses/campagnes/réglages) acceptaient `req.body` sans aucun schéma — un champ au
 * mauvais type ou une chaîne démesurée était stocké tel quel. Vérifie que chaque route rejette maintenant
 * un corps manifestement invalide (400) et accepte toujours un corps valide (200).
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_route_body_validation_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'route-validation-')));
process.on('unhandledRejection', () => undefined);

const { createAiRouter } = await import('../src/server/routes/aiRoutes.js');
const { createTicketRouter } = await import('../src/server/routes/ticketRoutes.js');
const { createInviteRouter } = await import('../src/server/routes/inviteRoutes.js');

const mockClient = { guilds: { cache: new Map() }, users: { cache: new Map() } } as any;

const app = express();
app.use(express.json());
app.use('/api/guilds/:guildId/ai', createAiRouter(mockClient));
app.use('/api/guilds/:guildId/tickets', createTicketRouter(mockClient));
app.use('/api/guilds/:guildId/invites', createInviteRouter(mockClient));

const server = app.listen(0);
const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}/api/guilds/guild_1`;

async function post(path: string, body: unknown, method = 'POST') {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let failed = 0;
function check(condition: boolean, label: string) {
  if (condition) console.log(`  ✅ ${label}`);
  else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

// AI personality: a non-enum tone must be rejected instead of stored as-is.
{
  const bad = await post('/ai/personality', { tone: 'NOT_A_REAL_TONE' }, 'PUT');
  check(bad.status === 400, 'PUT /ai/personality rejects an invalid tone enum');
  const good = await post('/ai/personality', { name: 'Thon', tone: 'FRIENDLY' }, 'PUT');
  check(good.status === 200, 'PUT /ai/personality accepts a valid partial update');
}

// AI tools: a non-boolean permission must be rejected.
{
  const bad = await post('/ai/tools', { moderationAssist: 'yes' }, 'PUT');
  check(bad.status === 400, 'PUT /ai/tools rejects a non-boolean permission');
  const good = await post('/ai/tools', { moderationAssist: true }, 'PUT');
  check(good.status === 200, 'PUT /ai/tools accepts a valid partial update');
}

// AI knowledge: missing required content must be rejected.
{
  const bad = await post('/ai/knowledge', { title: 'Doc' });
  check(bad.status === 400, 'POST /ai/knowledge rejects a missing content field');
  const good = await post('/ai/knowledge', { title: 'Doc', content: 'Le contenu.' });
  check(good.status === 201, 'POST /ai/knowledge accepts a valid source');
}

// Ticket categories: name over the 32-char cap must be rejected (was previously stored unbounded).
{
  const bad = await post('/tickets/categories', { name: 'x'.repeat(500) });
  check(bad.status === 400, 'POST /tickets/categories rejects a name over the length cap');
  const good = await post('/tickets/categories', { id: 'cat_1', name: 'Support' });
  check(good.status === 200, 'POST /tickets/categories accepts a valid category');
}

// Ticket panels: categoryIds must be an array of strings, not an arbitrary object.
{
  const bad = await post('/tickets/panels', { id: 'panel_1', categoryIds: { not: 'an array' } });
  check(bad.status === 400, 'POST /tickets/panels rejects a non-array categoryIds');
  const good = await post('/tickets/panels', { id: 'panel_1', categoryIds: ['cat_1'] });
  check(good.status === 200, 'POST /tickets/panels accepts a valid panel');
}

// Invite rewards: xpAmount must be a number, not a string.
{
  const bad = await post('/invites/rewards', { xpAmount: 'a lot' });
  check(bad.status === 400, 'POST /invites/rewards rejects a non-numeric xpAmount');
  const good = await post('/invites/rewards', { name: 'VIP', xpAmount: 500 });
  check(good.status === 200, 'POST /invites/rewards accepts a valid reward');
}

// Invite campaigns: rewards must be an array of strings, not arbitrary objects.
{
  const bad = await post('/invites/campaigns', { rewards: [{ nested: 'object' }] });
  check(bad.status === 400, 'POST /invites/campaigns rejects a non-string rewards entry');
  const good = await post('/invites/campaigns', { name: 'Été 2026', rewards: ['Rôle VIP'] });
  check(good.status === 200, 'POST /invites/campaigns accepts a valid campaign');
}

// Invite settings: riskSensitivity must be one of the known enum values.
{
  const bad = await post('/invites/settings', { riskSensitivity: 'extreme' }, 'PUT');
  check(bad.status === 400, 'PUT /invites/settings rejects an invalid riskSensitivity enum');
  const good = await post('/invites/settings', { riskSensitivity: 'high' }, 'PUT');
  check(good.status === 200, 'PUT /invites/settings accepts a valid partial update');
}

await new Promise<void>((resolve) => {
  (server as any).closeAllConnections?.();
  server.close(() => resolve());
});

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nTout est bon');
process.exit(0);
