import assert from 'node:assert/strict';
import { MODULES, isModuleEnabled, moduleForCommand, setModuleEnabled } from '../src/services/moduleRegistry.js';
import { disabledModuleEmbeds, disabledComponentEmbed } from '../src/services/moduleGate.js';

const G = 'guild-test-registry';
let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`  ✅ PASS: ${name}`);
};

console.log('🧩 MODULE REGISTRY & GATE');

check('chaque commande n\'appartient qu\'à un seul module', () => {
  const seen = new Map<string, string>();
  for (const m of MODULES) for (const c of m.commands) {
    assert.ok(!seen.has(c), `commande ${c} déclarée par ${seen.get(c)} et ${m.id}`);
    seen.set(c, m.id);
  }
});

check('les commandes de base ne sont jamais rattachées à un module', () => {
  for (const c of ['help', 'ping', 'module', 'settings', 'bot', 'language', 'prefix', 'permissions', 'status']) {
    assert.equal(moduleForCommand(c), undefined, c);
  }
});

check('module sans interrupteur propre : actif par défaut, désactivable, réactivable', () => {
  assert.equal(isModuleEnabled(G, 'polls'), true);
  assert.equal(setModuleEnabled(G, 'polls', false, 'DISCORD_COMMAND', 'u1'), true);
  assert.equal(isModuleEnabled(G, 'polls'), false);
  assert.equal(isModuleEnabled('autre-serveur', 'polls'), true, 'un autre serveur n\'est pas affecté');
  setModuleEnabled(G, 'polls', true);
  assert.equal(isModuleEnabled(G, 'polls'), true);
});

check('identifiant inconnu : refusé', () => {
  assert.equal(setModuleEnabled(G, 'nimportequoi', true), false);
  assert.equal(isModuleEnabled(G, 'nimportequoi'), true);
});

check('commande d\'un module désactivé : erreur pour tout le monde, seconde carte pour le staff', () => {
  setModuleEnabled(G, 'polls', false);
  const member = disabledModuleEmbeds({ guildId: G, commandName: 'poll', isStaff: false, prefix: null });
  assert.equal(member?.length, 1);
  const staff = disabledModuleEmbeds({ guildId: G, commandName: 'poll', isStaff: true, prefix: null });
  assert.equal(staff?.length, 2);
  assert.match(String(staff?.[1].data.description), /\/module nom:polls activer:True/);
  const prefixed = disabledModuleEmbeds({ guildId: G, commandName: 'poll', isStaff: true, prefix: '!' });
  assert.match(String(prefixed?.[1].data.description), /!module polls on/);
  setModuleEnabled(G, 'polls', true);
});

check('module actif ou commande de base : aucune interception', () => {
  assert.equal(disabledModuleEmbeds({ guildId: G, commandName: 'poll', isStaff: false, prefix: null }), null);
  setModuleEnabled(G, 'polls', false);
  assert.equal(disabledModuleEmbeds({ guildId: G, commandName: 'help', isStaff: false, prefix: null }), null);
  assert.equal(disabledModuleEmbeds({ guildId: G, commandName: 'module', isStaff: false, prefix: null }), null);
  assert.equal(disabledModuleEmbeds({ guildId: null, commandName: 'poll', isStaff: false, prefix: null }), null, 'hors serveur');
  setModuleEnabled(G, 'polls', true);
});

check('module à interrupteur propre (starboard) : lu et écrit dans sa configuration', () => {
  setModuleEnabled(G, 'starboard', true);
  assert.equal(isModuleEnabled(G, 'starboard'), true);
  setModuleEnabled(G, 'starboard', false);
  assert.equal(isModuleEnabled(G, 'starboard'), false);
  setModuleEnabled(G, 'starboard', true);
  assert.equal(isModuleEnabled(G, 'starboard'), true);
});

check('composants (boutons, formulaires) d’un module désactivé : refusés, les autres passent', () => {
  setModuleEnabled(G, 'tickets', false);
  setModuleEnabled(G, 'polls', true);
  assert.ok(disabledComponentEmbed(G, 'ticket_create:cat-support'));
  assert.ok(disabledComponentEmbed(G, 'modal_ticket_x'));
  assert.equal(disabledComponentEmbed(G, 'poll_vote:abc'), null);
  assert.equal(disabledComponentEmbed(G, 'music_pause'), null);
  assert.equal(disabledComponentEmbed(null, 'ticket_create:x'), null);
  setModuleEnabled(G, 'tickets', true);
  assert.equal(disabledComponentEmbed(G, 'ticket_create:cat-support'), null);
});

console.log(`\n🏁 ${passed} PASSED`);
