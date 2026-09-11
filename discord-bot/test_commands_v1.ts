import { commandRegistry } from './src/handlers/commandHandler.js';

let passed = 0, failed = 0;
const assert = (c: boolean, m: string) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.error(`  ❌ ${m}`), failed++); };

async function run() {
  console.log('🧪 ETHONE Command Registry Test Suite\n');

  const all = commandRegistry.getAllCommands();

  console.log('📦 1. Canonical name always resolves to itself:');
  console.log('   (a command whose own name collides with another command\'s alias must never be shadowed)');
  let shadowed: string[] = [];
  for (const cmd of all) {
    const resolved = commandRegistry.getCommand(cmd.name);
    if (resolved?.name !== cmd.name) shadowed.push(cmd.name);
  }
  assert(shadowed.length === 0, `no canonical command name is shadowed by an alias (found: ${shadowed.join(', ') || 'none'})`);

  console.log('\n📦 2. Known real-world regressions (production crash 2026-09-11):');
  assert(commandRegistry.getCommand('status')?.name === 'status', '/status resolves to the real status command, not /bot');
  assert(commandRegistry.getCommand('resume')?.name === 'resume', '/resume resolves to the real music resume command, not /summarize');

  console.log('\n📦 3. Aliases still resolve correctly when they do not collide with a real command:');
  assert(commandRegistry.getCommand('stats')?.name === 'bot', '!stats still aliases /bot');
  assert(commandRegistry.getCommand('recap')?.name === 'summarize', '!recap still aliases /summarize');
  assert(commandRegistry.getCommand('about')?.name === 'bot', '!about still aliases /bot');

  console.log('\n📦 4. Unknown command name returns undefined:');
  assert(commandRegistry.getCommand('this-command-does-not-exist') === undefined, 'unknown command name is undefined');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
