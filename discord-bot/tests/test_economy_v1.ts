/**
 * Économie : garde-fous du service (bots, montants entiers, pari, achat en simultané).
 * Le stockage écrit dans ./data du dossier courant : le test se place d'abord dans un dossier temporaire
 * pour ne jamais toucher aux vraies données du bot.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-eco-test-')));
const { economyService } = await import('../src/modules/economy/services/economyService.js');
const { economyStorage } = await import('../src/modules/economy/storage/economyStorage.js');

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}

const G = 'test-guild-economy';
const alice = { id: 'alice', username: 'alice' };
const bob = { id: 'bob', username: 'bob' };
const robot = { id: 'robot', username: 'robot', bot: true };

economyStorage.updateConfig(G, { enabled: true, transfersEnabled: true, gambleMinBet: 1, gambleMaxBet: 1000, gambleWinMultiplier: 1.9, robEnabled: true });
economyStorage.applyDelta(G, alice.id, 100, { username: 'alice', trackEarned: true });

console.log('\nTransferts');
const toBot = economyService.transfer(G, alice, robot, 10);
ok(!toBot.ok && toBot.reason === 'bot', 'un transfert vers un bot est refusé');
ok(economyStorage.getWallet(G, alice.id).balance === 100, 'le solde n’a pas bougé après le refus');
const frac = economyService.transfer(G, alice, bob, 0.5);
ok(!frac.ok && frac.reason === 'invalid_amount', 'un montant fractionnaire est refusé');
const good = economyService.transfer(G, alice, bob, 30);
ok(good.ok && economyStorage.getWallet(G, alice.id).balance === 70 && economyStorage.getWallet(G, bob.id).balance === 30, 'un transfert entier fonctionne (70 / 30)');

console.log('\nVol');
const robBot = economyService.rob(G, alice, robot);
ok(!robBot.ok && robBot.reason === 'bot', 'voler un bot est refusé');

console.log('\nPari');
let wins = 0;
for (let i = 0; i < 200; i++) {
  economyStorage.applyDelta(G, 'gambler', 5);
  const before = economyStorage.getWallet(G, 'gambler').balance;
  const r = economyService.gamble(G, { id: 'gambler', username: 'g' }, 1);
  if (r.ok && r.won) {
    wins++;
    if (economyStorage.getWallet(G, 'gambler').balance <= before) {
      ok(false, 'une victoire à 1 de mise rapporte au moins 1');
      break;
    }
  }
}
ok(wins > 0, `des victoires ont bien eu lieu (${wins}/200) et rapportent toutes au moins 1`);
economyStorage.updateConfig(G, { enabled: false });
const off = economyService.gamble(G, alice, 1);
ok(!off.ok && off.reason === 'disabled', 'le pari est refusé quand l’économie est désactivée');
economyStorage.updateConfig(G, { enabled: true });

console.log('\nAchat en simultané (le solde ne peut pas devenir négatif ni être dépensé deux fois)');
economyStorage.applyDelta(G, 'buyer', 100);
let assigned = 0;
const fakeMember = (id: string) =>
  ({
    id: 'buyer',
    user: { username: 'buyer', tag: 'buyer#0', displayAvatarURL: () => null },
    roles: { cache: new Map(), add: async () => { await new Promise((r) => setTimeout(r, 20)); assigned++; } },
    guild: {
      members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } },
      roles: { cache: new Map([[id, { managed: false, position: 1 }]]) },
    },
  }) as any;
economyStorage.saveShopItem(G, { id: 'a', roleId: 'ra', label: 'Rôle A', price: 80, description: '', enabled: true });
economyStorage.saveShopItem(G, { id: 'b', roleId: 'rb', label: 'Rôle B', price: 80, description: '', enabled: true });
const shop = economyStorage.getShopItems(G);
if (shop.length >= 2) {
  const [r1, r2] = await Promise.all([economyService.purchaseRole(G, fakeMember('ra'), 'a'), economyService.purchaseRole(G, fakeMember('rb'), 'b')]);
  const success = [r1, r2].filter((r) => r.ok).length;
  ok(success === 1, `un seul des deux achats de 80 passe avec 100 crédits (${success} réussi)`);
  ok(economyStorage.getWallet(G, 'buyer').balance === 20, 'solde final = 20');
  ok(assigned === 1, 'un seul rôle attribué');
} else {
  console.log('  ⚠️ boutique non alimentable via l’API de stockage : test d’achat sauté');
}

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
