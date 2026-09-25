/**
 * /play : la réponse ne doit plus attendre la connexion vocale ni la préparation du son au-delà de 2,5 s.
 * Le lecteur et le fournisseur sont simulés ; dossier temporaire pour le stockage.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-play-test-')));
const { config } = await import('../src/config.js');
(config as any).musicBackend = 'lavalink';
const { musicService } = await import('../src/modules/music/services/musicService.js');
const { musicProviderManager } = await import('../src/modules/music/providers/musicProvider.js');
const { musicNotifier } = await import('../src/modules/music/services/musicNotifier.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const track = { id: 't1', title: 'Titre test', artist: 'Artiste', album: null, duration: 100, thumbnail: '', url: 'https://x/y', source: 'SPOTIFY', requestedBy: { id: 'u', tag: 'u#0', avatar: null }, addedAt: '' } as any;
(musicProviderManager as any).resolveMany = async () => [track];

const notified: string[] = [];
(musicNotifier as any).error = async (_g: string, title: string, msg: string) => { notified.push(`${title}: ${msg}`); };

function fakePlayer(opts: { connectMs: number; connectOk: boolean; playMs: number }) {
  let started = false;
  return {
    getState: () => ({ status: started ? 'PLAYING' : 'IDLE', currentTrack: started ? track : null, voiceChannel: null }),
    connect: async () => { await sleep(opts.connectMs); return opts.connectOk; },
    playTrack: async () => { await sleep(opts.playMs); started = true; return true; },
    queue: { add: () => ({ success: true }), addNext: () => {}, size: () => 1 },
  };
}
const guild = { id: 'g-play-test', channels: { cache: new Map([['vc', { id: 'vc', name: 'vc', isVoiceBased: () => true, members: new Map() }]]) }, members: { me: null } } as any;
const play = () => musicService.play(guild, null, 'titre', { channelId: 'vc', textChannelId: 'txt' });

console.log('\nConnexion vocale lente (6 s) + préparation lente (4 s)');
(musicService as any).getPlayer = () => fakePlayer({ connectMs: 6000, connectOk: true, playMs: 4000 });
let t0 = Date.now();
let res = await play();
let took = Date.now() - t0;
ok(res.success && res.queuePosition === 0, 'la commande réussit avec le titre demandé');
ok(took < 3500, `elle répond en ${took} ms (avant : 10 s et plus)`);

console.log('\nConnexion impossible, détectée vite');
(musicService as any).getPlayer = () => fakePlayer({ connectMs: 100, connectOk: false, playMs: 10 });
res = await play();
ok(!res.success && /connecter/.test(res.error || ''), 'erreur claire « Impossible de se connecter »');

console.log('\nConnexion impossible, détectée tard (après la réponse)');
notified.length = 0;
(musicService as any).getPlayer = () => fakePlayer({ connectMs: 3500, connectOk: false, playMs: 10 });
t0 = Date.now();
res = await play();
took = Date.now() - t0;
ok(res.success && took < 3500, `réponse rapide (${took} ms) malgré une connexion qui échouera`);
await sleep(1500);
ok(notified.length === 1 && /connecter/.test(notified[0]), 'l’échec tardif est signalé dans le salon');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
