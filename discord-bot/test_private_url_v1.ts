import { isPrivateOrLocalUrl } from './src/modules/music/services/lavalinkManager.js';

let passed = 0;
let failed = 0;
const ok = (c: boolean, m: string) => {
  if (c) { console.log(`  ✅ ${m}`); passed++; } else { console.error(`  ❌ ${m}`); failed++; }
};

console.log('🧪 Refus des adresses privées (SSRF)\n');
for (const u of ['http://localhost/x', 'http://127.0.0.1:2333/', 'http://192.168.1.60:46/a.mp3', 'http://10.0.0.5/', 'http://172.16.3.4/', 'http://172.31.255.1/', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'http://nas.local/a', 'http://0.0.0.0/', 'ftp://???']) {
  ok(isPrivateOrLocalUrl(u), `refusée : ${u}`);
}
for (const u of ['https://www.youtube.com/watch?v=abc', 'https://soundcloud.com/a/b', 'http://8.8.8.8/x.mp3', 'http://172.32.0.1/x', 'http://192.169.0.1/x', 'https://open.spotify.com/track/1']) {
  ok(!isPrivateOrLocalUrl(u), `autorisée : ${u}`);
}
console.log(`\n✅ Passed: ${passed}  ❌ Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
