import assert from 'node:assert/strict';
import { fetchUserGuilds } from '../src/server/middleware/guildAuth.js';

// Trois requêtes simultanées = un seul appel à Discord.
let calls = 0;
globalThis.fetch = (async () => {
  calls++;
  await new Promise((r) => setTimeout(r, 20));
  return new Response(JSON.stringify([{ id: '1', owner: true, permissions: '8' }]), { status: 200 });
}) as typeof fetch;

const results = await Promise.all([1, 2, 3].map(() => fetchUserGuilds('tok', 'user-dedup')));
assert.equal(calls, 1);
assert.ok(results.every((g) => g[0].id === '1'));
console.log('ok test_user_guilds_dedup_v1');
