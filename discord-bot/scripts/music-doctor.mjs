#!/usr/bin/env node
// Diagnostic audio à lancer SUR LE VPS :  node scripts/music-doctor.mjs
// Vérifie tout ce dont /play a besoin pour produire du son et dit
// exactement quoi installer. Ne touche à rien.

import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ok = (m) => console.log(`  ✅ ${m}`);
const ko = (m) => console.log(`  ❌ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
let problems = 0;

console.log('\n=== ETHONE music doctor ===\n');
console.log(`Node ${process.version} · ${process.platform}/${process.arch}\n`);

// 1. @discordjs/voice dependency report
console.log('1) Dépendances @discordjs/voice');
try {
  const voice = await import('@discordjs/voice');
  const report = voice.generateDependencyReport();
  console.log(report.split('\n').map((l) => `     ${l}`).join('\n'));
  if (!/opusscript: \d|@discordjs\/opus: \d/.test(report)) { ko('Aucun encodeur Opus (npm i opusscript)'); problems++; }
  if (!/libsodium-wrappers: \d|sodium-native: \d|sodium: \d|aes-256-gcm: yes/.test(report)) { ko('Aucune lib de chiffrement (npm i libsodium-wrappers)'); problems++; }
  if (/@snazzah\/davey: not found/.test(report)) { warn('@snazzah/davey absent : le chiffrement DAVE (E2EE) est indisponible. Discord peut refuser/couper l’audio. → npm i @snazzah/davey'); problems++; }
  if (/FFmpeg[\s\S]*version: (?!not found)/.test(report)) ok('ffmpeg détecté par prism-media'); else { ko('ffmpeg introuvable par prism-media'); problems++; }
} catch (e) {
  ko(`@discordjs/voice ne charge pas : ${e.message}`); problems++;
}

// 2. ffmpeg-static binary
console.log('\n2) Binaire ffmpeg-static');
try {
  const ffPath = require('ffmpeg-static');
  if (!ffPath) throw new Error('module présent mais chemin null (téléchargement du binaire raté à npm install)');
  accessSync(ffPath, constants.X_OK);
  const size = statSync(ffPath).size;
  const r = spawnSync(ffPath, ['-version'], { encoding: 'utf8' });
  if (r.status === 0) ok(`${ffPath} (${(size / 1e6).toFixed(1)} MB) — ${r.stdout.split('\n')[0]}`);
  else { ko(`${ffPath} ne s’exécute pas (code ${r.status}) : ${(r.stderr || '').trim().slice(0, 200)}`); problems++; }
} catch (e) {
  ko(`ffmpeg-static : ${e.message}`);
  console.log('     → npm rebuild ffmpeg-static  (ou apt install ffmpeg + FFMPEG_PATH=/usr/bin/ffmpeg)');
  problems++;
}

// 3. yt-dlp
console.log('\n3) yt-dlp');
const YT = process.env.YT_DLP_PATH || 'yt-dlp';
const v = spawnSync(YT, ['--version'], { encoding: 'utf8' });
if (v.status !== 0) {
  ko(`"${YT}" introuvable. La musique YouTube/SoundCloud ne peut pas fonctionner.`);
  console.log('     → sudo apt install yt-dlp   ou   pipx install yt-dlp   ou   sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp');
  problems++;
} else {
  const version = v.stdout.trim();
  ok(`yt-dlp ${version}`);
  const [y, m] = version.split('.').map(Number);
  const ageMonths = (new Date().getFullYear() - y) * 12 + (new Date().getMonth() + 1 - m);
  if (ageMonths > 2) warn(`Version vieille de ~${ageMonths} mois : YouTube change souvent, mets à jour (yt-dlp -U ou pipx upgrade yt-dlp).`);
  if (process.env.YT_DLP_COOKIES_FILE) ok(`Cookies : ${process.env.YT_DLP_COOKIES_FILE}`);
  else warn('Pas de YT_DLP_COOKIES_FILE : depuis un VPS, YouTube renvoie souvent « Sign in to confirm you’re not a bot ». Exporte un cookies.txt et définis la variable.');

  // 4. Test réel : récupérer 3 s d’audio d’une vidéo connue
  console.log('\n4) Test de flux réel (YouTube, 8 s max)');
  const extra = (process.env.YT_DLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean);
  if (extra.length) ok(`Options supplémentaires : ${extra.join(' ')}`);
  const jsRuntime = process.env.YT_DLP_JS_RUNTIME || `node:${process.execPath}`;
  const ejs = jsRuntime === 'off' ? [] : ['--js-runtimes', jsRuntime, ...(process.env.YT_DLP_REMOTE_EJS === '0' ? [] : ['--remote-components', 'ejs:github'])];
  if (ejs.length) ok(`Moteur JS pour le défi YouTube : ${jsRuntime}`); else warn('Défi JS désactivé (YT_DLP_JS_RUNTIME=off) — YouTube ne livrera probablement aucun format.');
  const args = ['--no-playlist', '-f', 'bestaudio[acodec=opus]/bestaudio/best', '--socket-timeout', '10',
    ...(process.env.YT_DLP_COOKIES_FILE ? ['--cookies', process.env.YT_DLP_COOKIES_FILE] : []), ...ejs, ...extra, '-o', '-', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'];
  const result = await new Promise((resolve) => {
    const p = spawn(YT, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let bytes = 0; let err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); resolve({ bytes, err, timeout: true }); }, 8000);
    p.stdout.on('data', (c) => { bytes += c.length; if (bytes > 200_000) { clearTimeout(t); p.kill('SIGKILL'); resolve({ bytes, err }); } });
    p.stderr.on('data', (c) => { err = (err + c.toString()).slice(-800); });
    p.on('close', () => { clearTimeout(t); resolve({ bytes, err }); });
    p.on('error', (e) => { clearTimeout(t); resolve({ bytes, err: e.message }); });
  });
  if (result.bytes > 20_000) ok(`${(result.bytes / 1024).toFixed(0)} Ko reçus — yt-dlp sort bien de l’audio`);
  else {
    ko(`Aucun audio reçu (${result.bytes} octets${result.timeout ? ', timeout' : ''}).`);
    if (result.err) console.log(`     stderr : ${result.err.trim().split('\n').slice(-4).join(' | ')}`);
    if (/n challenge solving failed|JavaScript runtime|challenge solver/i.test(result.err)) console.log('     → Le défi JS YouTube n’est pas résolu : vérifie que node est exécutable par yt-dlp (YT_DLP_JS_RUNTIME=node:/chemin/node) et que le VPS peut joindre github.com (téléchargement du solveur). Alternative : installe Deno (curl -fsSL https://deno.land/install.sh | sh) et YT_DLP_JS_RUNTIME=deno.');
    else if (/sign in|confirm you.re not a bot|cookies/i.test(result.err)) console.log('     → YouTube bloque l’IP du VPS : exporte des cookies (extension « Get cookies.txt LOCALLY ») et lance le bot avec YT_DLP_COOKIES_FILE=/chemin/cookies.txt');
    else if (/Unable to extract|Requested format|nsig|needs to be reloaded/i.test(result.err)) {
      console.log('     → Extracteur YouTube cassé/obsolète. 1) mets à jour : sudo yt-dlp -U  (ou réinstalle le binaire depuis GitHub)');
      console.log('       2) si ça persiste, force un autre client dans .env : YT_DLP_EXTRA_ARGS="--extractor-args youtube:player_client=tv,web_safari"');
    }
    problems++;
  }
}

// 5. Réseau UDP sortant (Discord voice utilise UDP 50000-65535)
console.log('\n5) Rappel réseau');
console.log('     Discord voice = UDP sortant vers *.discord.media ports 50000-65535. Si le VPS a un pare-feu strict : ufw allow out 50000:65535/udp');

console.log(`\n=== ${problems === 0 ? 'Tout est OK — si toujours muet, regarde pm2 logs ethone-bot pendant un /play' : `${problems} problème(s) à corriger ci-dessus`} ===\n`);
process.exit(problems === 0 ? 0 : 1);
