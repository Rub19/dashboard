import { AutoModerationActionType, AutoModerationRuleTriggerType, AutoModerationRuleEventType, ChannelType } from 'discord.js';
import { nativeAutomodService, NativeAutomodError } from '../src/modules/nativeAutomod/services/nativeAutomodService.js';

let failed = 0;
function assert(cond: boolean, label: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${label}`);
  if (!cond) failed++;
}
async function rejects(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof NativeAutomodError ? e.message : `RAW:${(e as Error).message}`;
  }
}

/** Faux guild : `autoModerationRules` en mémoire, appels enregistrés. */
function makeGuild(opts: { failWith?: any } = {}) {
  const store = new Map<string, any>();
  const calls: any[] = [];
  let n = 0;
  const build = (id: string, o: any, prev?: any) => ({
    id,
    name: o.name ?? prev.name,
    creatorId: 'bot',
    enabled: o.enabled ?? prev?.enabled ?? true,
    eventType: o.eventType ?? prev.eventType,
    triggerType: o.triggerType ?? prev.triggerType,
    triggerMetadata: {
      keywordFilter: [], regexPatterns: [], presets: [], allowList: [], mentionTotalLimit: null, mentionRaidProtectionEnabled: false,
      ...(o.triggerMetadata ?? prev?.triggerMetadata),
    },
    actions: (o.actions ?? prev.actions).map((a: any) => ({ type: a.type, metadata: { channelId: a.metadata?.channel ?? a.metadata?.channelId, durationSeconds: a.metadata?.durationSeconds, customMessage: a.metadata?.customMessage } })),
    exemptRoles: new Map((o.exemptRoles ?? [...(prev?.exemptRoles?.keys() ?? [])]).map((x: string) => [x, {}])),
    exemptChannels: new Map((o.exemptChannels ?? [...(prev?.exemptChannels?.keys() ?? [])]).map((x: string) => [x, {}])),
  });
  const guild: any = {
    id: 'g1',
    members: { me: { permissions: { has: () => true } } },
    channels: { cache: new Map([['111111111111111111', { id: '111111111111111111', type: ChannelType.GuildText, isTextBased: () => true }], ['222222222222222222', { id: '222222222222222222', type: ChannelType.GuildVoice, isTextBased: () => false }]]) },
    autoModerationRules: {
      fetch: async () => {
        if (opts.failWith) throw opts.failWith;
        return new Map(store);
      },
      create: async (o: any) => {
        calls.push(['create', o]);
        if (opts.failWith) throw opts.failWith;
        const r = build(`r${++n}`, o);
        store.set(r.id, r);
        return r;
      },
      edit: async (id: string, o: any) => {
        calls.push(['edit', id, o]);
        if (opts.failWith) throw opts.failWith;
        const prev = store.get(id);
        if (!prev) throw Object.assign(new Error('Unknown Auto Moderation Rule'), { status: 404, code: 10066 });
        const r = build(id, o, prev);
        store.set(id, r);
        return r;
      },
      delete: async (id: string, reason?: string) => {
        calls.push(['delete', id, reason]);
        store.delete(id);
      },
    },
  };
  return { guild, calls, store };
}

const ALERT = '111111111111111111';
const keywordRule = {
  name: 'Insultes maison',
  triggerType: 'keyword',
  keywords: ['foo*', '*bar'],
  regexPatterns: ['^spam\\d+$'],
  allowList: ['barista'],
  actions: [
    { type: 'block_message', customMessage: 'Interdit' },
    { type: 'send_alert', channelId: ALERT },
    { type: 'timeout', durationSeconds: 600 },
  ],
  exemptRoles: ['333333333333333333'],
};

// --- Création : mapping du payload
{
  const { guild, calls } = makeGuild();
  const view = await nativeAutomodService.create(guild, keywordRule, 'test');
  const p = calls[0][1];
  assert(p.triggerType === AutoModerationRuleTriggerType.Keyword && p.eventType === AutoModerationRuleEventType.MessageSend, 'create: trigger + event mappés');
  assert(p.triggerMetadata.keywordFilter.join() === 'foo*,*bar' && p.triggerMetadata.regexPatterns.length === 1 && p.triggerMetadata.allowList[0] === 'barista', 'create: keywordFilter/regex/allowList');
  assert(p.actions[0].type === AutoModerationActionType.BlockMessage && p.actions[0].metadata.customMessage === 'Interdit', 'create: block + message perso');
  assert(p.actions[1].type === AutoModerationActionType.SendAlertMessage && p.actions[1].metadata.channel === ALERT, 'create: alerte -> channel');
  assert(p.actions[2].type === AutoModerationActionType.Timeout && p.actions[2].metadata.durationSeconds === 600, 'create: timeout -> durationSeconds');
  assert(p.exemptRoles[0] === '333333333333333333' && p.reason === 'test' && p.enabled === true, 'create: exemptRoles + reason + enabled');
  assert(view.triggerType === 'keyword' && view.actions.length === 3 && view.actions[1].channelId === ALERT && view.exemptRoles.length === 1, 'create: vue JSON');
  assert((await nativeAutomodService.list(guild)).length === 1, 'list: 1 règle');

  const pre = await nativeAutomodService.create(guild, { name: 'Langage', triggerType: 'keyword_preset', presets: ['profanity', 'slurs'], actions: [{ type: 'block_message' }] });
  assert(pre.triggerMetadata.presets.join() === 'profanity,slurs', 'preset: aller-retour des presets');
  const ms = await nativeAutomodService.create(guild, { name: 'Mentions', triggerType: 'mention_spam', mentionTotalLimit: 5, mentionRaidProtection: true, actions: [{ type: 'block_message' }] });
  assert(ms.triggerMetadata.mentionTotalLimit === 5 && ms.triggerMetadata.mentionRaidProtectionEnabled, 'mention_spam: limite + raid protection');
}

// --- Quotas
{
  const { guild, calls } = makeGuild();
  for (let i = 0; i < 6; i++) await nativeAutomodService.create(guild, { ...keywordRule, name: `K${i}` });
  const e1 = await rejects(nativeAutomodService.create(guild, { ...keywordRule, name: 'K7' }));
  assert(!!e1 && e1.includes('6') && e1.includes('Mots-clés'), 'quota: 7e règle mots-clés refusée (FR)');
  const n = calls.length;
  await nativeAutomodService.create(guild, { name: 'S', triggerType: 'spam', actions: [{ type: 'block_message' }] });
  const e2 = await rejects(nativeAutomodService.create(guild, { name: 'S2', triggerType: 'spam', actions: [{ type: 'block_message' }] }));
  assert(!!e2 && e2.includes('1 règle') && calls.length === n + 1, 'quota: 2e règle spam refusée sans appel Discord');
}

// --- Validation
{
  const { guild, calls } = makeGuild();
  const cases: Array<[string, unknown, string]> = [
    ['nom vide', { ...keywordRule, name: ' ' }, 'nom'],
    ['nom > 100', { ...keywordRule, name: 'x'.repeat(101) }, '100'],
    ['mot-clé > 60', { ...keywordRule, keywords: ['x'.repeat(61)] }, '60'],
    ['> 1000 mots-clés', { ...keywordRule, keywords: Array.from({ length: 1001 }, (_, i) => `k${i}`) }, '1000'],
    ['> 10 regex', { ...keywordRule, regexPatterns: Array.from({ length: 11 }, (_, i) => `a${i}`) }, '10'],
    ['regex > 260', { ...keywordRule, regexPatterns: ['x'.repeat(261)] }, '260'],
    ['allowList > 100', { ...keywordRule, allowList: Array.from({ length: 101 }, (_, i) => `a${i}`) }, '100'],
    ['keyword sans mot-clé', { ...keywordRule, keywords: [], regexPatterns: [] }, 'mot-clé'],
    ['mention 0', { name: 'M', triggerType: 'mention_spam', mentionTotalLimit: 0, actions: [{ type: 'block_message' }] }, '50'],
    ['mention 51', { name: 'M', triggerType: 'mention_spam', mentionTotalLimit: 51, actions: [{ type: 'block_message' }] }, '50'],
    ['timeout 30s', { ...keywordRule, actions: [{ type: 'timeout', durationSeconds: 30 }] }, '28 jours'],
    ['timeout 29j', { ...keywordRule, actions: [{ type: 'timeout', durationSeconds: 29 * 86400 }] }, '28 jours'],
    ['alerte sans salon', { ...keywordRule, actions: [{ type: 'send_alert' }] }, 'salon'],
    ['aucune action', { ...keywordRule, actions: [] }, 'action'],
    ['preset vide', { name: 'P', triggerType: 'keyword_preset', presets: [], actions: [{ type: 'block_message' }] }, 'prédéfinie'],
    ['timeout sur spam', { name: 'S', triggerType: 'spam', actions: [{ type: 'timeout', durationSeconds: 120 }] }, 'exclusion'],
    ['type inconnu', { ...keywordRule, triggerType: 'nope' }, 'inconnu'],
    ['salon d\'alerte inconnu', { ...keywordRule, actions: [{ type: 'send_alert', channelId: '999999999999999999' }] }, 'introuvable'],
    ['salon d\'alerte vocal', { ...keywordRule, actions: [{ type: 'send_alert', channelId: '222222222222222222' }] }, 'textuel'],
  ];
  for (const [label, input, needle] of cases) {
    const msg = await rejects(nativeAutomodService.create(guild, input));
    assert(!!msg && !msg.startsWith('RAW:') && msg.toLowerCase().includes(needle.toLowerCase()), `validation: ${label}`);
  }
  assert(calls.length === 0, 'validation: aucun appel Discord pour une entrée invalide');
  const ok = await rejects(nativeAutomodService.create(guild, { ...keywordRule, actions: [{ type: 'timeout', durationSeconds: 60 }, { type: 'block_message' }] }));
  assert(ok === null, 'validation: timeout 60 s accepté');
  const ok28 = await rejects(nativeAutomodService.create(guild, { ...keywordRule, name: 'k28', actions: [{ type: 'timeout', durationSeconds: 28 * 86400 }] }));
  assert(ok28 === null, 'validation: timeout 28 j accepté');
}

// --- Permissions du bot
{
  const { guild, calls } = makeGuild();
  guild.members.me.permissions.has = () => false;
  const msg = await rejects(nativeAutomodService.create(guild, keywordRule));
  assert(!!msg && msg.includes('Gérer le serveur') && calls.length === 0, 'permission bot: refus FR avant appel Discord');
}

// --- Update / toggle / remove
{
  const { guild, calls } = makeGuild();
  const created = await nativeAutomodService.create(guild, keywordRule);
  const t = await nativeAutomodService.toggle(guild, created.id, false, 'r');
  assert(t.enabled === false && calls.at(-1)[2].enabled === false && calls.at(-1)[2].reason === 'r', 'toggle: enabled=false envoyé');
  assert((await nativeAutomodService.toggle(guild, created.id, true)).enabled === true, 'toggle: réactivation');
  const bad = await rejects(nativeAutomodService.toggle(guild, created.id, 'yes' as any));
  assert(!!bad && bad.includes('vrai ou faux'), 'toggle: valeur non booléenne refusée');

  const u = await nativeAutomodService.update(guild, created.id, { keywords: ['nouveau'], name: 'Renommée' });
  assert(u.name === 'Renommée' && u.triggerMetadata.keywordFilter.join() === 'nouveau' && u.actions.length === 3, 'update: patch partiel fusionné avec la règle existante');
  const eu = calls.at(-1)[2];
  assert(eu.triggerType === undefined && eu.eventType === undefined, 'update: type de déclencheur non renvoyé à Discord');
  const badPatch = await rejects(nativeAutomodService.update(guild, created.id, { keywords: [], regexPatterns: [] }));
  assert(!!badPatch && badPatch.includes('mot-clé'), 'update: patch invalide refusé');
  const nf = await rejects(nativeAutomodService.update(guild, 'nope', { name: 'x' }));
  assert(!!nf && nf.includes('introuvable'), 'update: règle inconnue -> introuvable');

  await nativeAutomodService.remove(guild, created.id, 'bye');
  assert(calls.at(-1)[0] === 'delete' && calls.at(-1)[2] === 'bye' && (await nativeAutomodService.list(guild)).length === 0, 'remove: supprimée');
}

// --- Règles recommandées
{
  const { guild, calls } = makeGuild();
  await nativeAutomodService.create(guild, { name: 'Spam existant', triggerType: 'spam', actions: [{ type: 'block_message' }] });
  const res = await nativeAutomodService.createRecommended(guild, { alertChannelId: ALERT });
  assert(res.created.length === 2 && res.skipped.length === 1 && res.skipped[0].name.includes('Spam'), 'recommandées: crée 2, ignore le spam déjà présent');
  const preset = calls.find((c) => c[0] === 'create' && c[1].triggerType === AutoModerationRuleTriggerType.KeywordPreset)![1];
  assert(preset.triggerMetadata.presets.length === 3 && preset.actions.some((a: any) => a.type === AutoModerationActionType.SendAlertMessage), 'recommandées: 3 presets + alerte');
}

// --- Mapping des erreurs Discord (jamais de texte brut)
{
  const mk = (o: any) => makeGuild({ failWith: Object.assign(new Error('Missing Permissions SECRET-RAW'), o) }).guild;
  const cases: Array<[string, any, string]> = [
    ['50013', { code: 50013, status: 403 }, 'Gérer le serveur'],
    ['404', { code: 10066, status: 404 }, 'introuvable'],
    ['200xxx', { code: 200000, status: 400 }, 'nombre maximal'],
    ['429', { status: 429 }, 'limite'],
    ['inconnue', { status: 500 }, 'Impossible de contacter Discord'],
  ];
  for (const [label, o, needle] of cases) {
    const msg = await rejects(nativeAutomodService.list(mk(o)));
    assert(!!msg && msg.includes(needle) && !msg.includes('SECRET-RAW'), `erreur Discord ${label} -> message FR sans fuite`);
  }
  const g = makeGuild().guild;
  g.autoModerationRules.fetch = async () => new Map();
  g.autoModerationRules.create = async () => { throw Object.assign(new Error('SECRET-RAW'), { code: 50013, status: 403 }); };
  const msg = await rejects(nativeAutomodService.create(g, keywordRule));
  assert(!!msg && msg.includes('Gérer le serveur') && !msg.includes('SECRET-RAW'), 'erreur Discord à la création mappée');
}

process.exit(failed ? 1 : 0);
