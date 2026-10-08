import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-captcha-'));
process.chdir(tmpDir);

const { newCode, renderCaptcha, onMemberJoin, pendingCount, handleCaptchaButton, handleCaptchaModal } = await import('../src/services/captchaService.js');
const { wearsGuildTag } = await import('../src/services/supportersService.js');
const { guildConfigService } = await import('../src/services/guildConfigService.js');

// Code : 5 caractères, sans caractères ambigus.
for (let i = 0; i < 200; i++) assert.match(newCode(), /^[A-HJKMNP-Z2-9]{5}$/);
assert.deepEqual([...renderCaptcha('AB3CD').subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'image PNG');

// Parcours : arrivée -> bouton -> mauvais code x2 -> bon code => rôle donné, sortie de la file.
const G = '900000000000000009';
const roles = new Set<string>();
const kicked: string[] = [];
const role = { id: '111111111111111111', editable: true };
const member: any = {
  id: '222222222222222222',
  user: { bot: false, id: '222222222222222222' },
  roles: { cache: { has: (r: string) => roles.has(r) }, add: async (l: string[]) => l.forEach((r) => roles.add(r)), remove: async () => {} },
  kickable: true,
  kick: async () => kicked.push(member.id),
  send: async () => null,
};
const guild: any = {
  id: G,
  name: 'Test',
  roles: { cache: new Map([[role.id, role]]) },
  channels: { cache: new Map([['333333333333333333', { id: '333333333333333333', isTextBased: () => true, send: async () => ({ id: 'm' }), messages: { fetch: async () => null, delete: async () => null } }]]) },
  members: { fetch: async () => member },
};
member.guild = guild;
guildConfigService.updateConfig(G, {
  captcha: { ...guildConfigService.getConfig(G).captcha, enabled: true, channelId: '333333333333333333', givenRoles: [role.id], attempts: 3, mentionOnJoin: false },
});

await onMemberJoin(member);
assert.equal(pendingCount(G), 1, 'en attente après l\'arrivée');

let lastReply: any = null;
const button = (customId: string): any => ({ guild, customId, user: { id: member.id }, reply: async (p: any) => (lastReply = p), showModal: async () => null });
const modal = (code: string): any => ({ guild, user: { id: member.id }, fields: { getTextInputValue: () => code }, reply: async (p: any) => (lastReply = p) });

await handleCaptchaButton(button('captcha_start'));
assert.ok(lastReply.files?.length, 'image envoyée');
await handleCaptchaModal(modal('nope!'));
assert.match(lastReply.embeds[0].data.description, /nouveau code/);
await handleCaptchaModal(modal('nope!'));
assert.equal(pendingCount(G), 1, 'encore un essai');

// Le bon code n'est pas exposé : on le retrouve en regénérant via Math.random contrôlé.
const realRandom = Math.random;
Math.random = () => 0; // newCode => "AAAAA"
await handleCaptchaButton(button('captcha_start'));
Math.random = realRandom;
await handleCaptchaModal(modal('aaaaa'));
assert.ok(roles.has(role.id), 'rôle donné après réussite');
assert.equal(pendingCount(G), 0);
assert.equal(kicked.length, 0);

// Échec : plus d'essais => expulsion.
roles.clear();
await onMemberJoin(member);
for (let i = 0; i < 3; i++) {
  await handleCaptchaButton(button('captcha_start'));
  await handleCaptchaModal(modal('zzzzz'));
}
assert.deepEqual(kicked, [member.id], 'expulsé après 3 essais ratés');
assert.equal(pendingCount(G), 0);

// Soutiens : tag du serveur affiché.
assert.equal(wearsGuildTag({ primaryGuild: { identityEnabled: true, identityGuildId: G } } as any, G), true);
assert.equal(wearsGuildTag({ primaryGuild: { identityEnabled: false, identityGuildId: G } } as any, G), false);
assert.equal(wearsGuildTag({ primaryGuild: null } as any, G), false);

console.log('✅ captcha (réussite, échec, expulsion) et soutiens OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
