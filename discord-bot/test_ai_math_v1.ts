import { MathEvaluator } from './src/modules/ai/services/mathEvaluator.js';
import { AIProviderService } from './src/modules/ai/services/aiProviderService.js';
import { DiscordAiPanel } from './src/modules/ai/ui/discordAiPanel.js';
import { aiRepository } from './src/modules/ai/storage/aiRepository.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING AI MATH EVALUATOR & EMBED AVATAR TESTS');
  console.log('====================================================\n');

  // 1. MathEvaluator.evaluate
  console.log('--- 1. Testing MathEvaluator.evaluate ---');
  const r1 = MathEvaluator.evaluate('1+1');
  assert(r1.success === true && r1.result === 2, '1+1 = 2');

  const r2 = MathEvaluator.evaluate('2 * (3 + 4)');
  assert(r2.success === true && r2.result === 14, '2 * (3 + 4) = 14');

  const r3 = MathEvaluator.evaluate('10 / 2');
  assert(r3.success === true && r3.result === 5, '10 / 2 = 5');

  const r4 = MathEvaluator.evaluate('10 / 0');
  assert(r4.success === false && r4.error === 'DIVISION_BY_ZERO', '10 / 0 detected as DIVISION_BY_ZERO');

  const r5 = MathEvaluator.evaluate('0.1 + 0.2');
  assert(r5.success === true && r5.result === 0.3, '0.1 + 0.2 = 0.3 without IEEE-754 precision glitch');

  const r6 = MathEvaluator.evaluate('2^3');
  assert(r6.success === true && r6.result === 8, '2^3 = 8');

  const r7 = MathEvaluator.evaluate('15 % 4');
  assert(r7.success === true && r7.result === 3, '15 % 4 = 3');

  // 2. MathEvaluator.extractAndEvaluate
  console.log('\n--- 2. Testing MathEvaluator.extractAndEvaluate ---');
  const e1 = MathEvaluator.extractAndEvaluate('combien fais 1+1');
  assert(e1 !== null && e1.success === true && e1.result === 2, '"combien fais 1+1" evaluates to 2');
  assert(e1?.formattedResult?.includes('**2**') === true, 'formattedResult contains bold result **2**');

  const e2 = MathEvaluator.extractAndEvaluate('combien fait 1+1');
  assert(e2 !== null && e2.success === true && e2.result === 2, '"combien fait 1+1" evaluates to 2');

  const e3 = MathEvaluator.extractAndEvaluate('combien font 2+2 ?');
  assert(e3 !== null && e3.success === true && e3.result === 4, '"combien font 2+2 ?" evaluates to 4');

  const e4 = MathEvaluator.extractAndEvaluate('calcule 25 * 4');
  assert(e4 !== null && e4.success === true && e4.result === 100, '"calcule 25 * 4" evaluates to 100');

  const e5 = MathEvaluator.extractAndEvaluate('1+1');
  assert(e5 !== null && e5.success === true && e5.result === 2, 'direct "1+1" evaluates to 2');

  const e6 = MathEvaluator.extractAndEvaluate('combien de membres sur le serveur');
  assert(e6 === null, '"combien de membres sur le serveur" correctly rejected from math evaluation');

  const e7 = MathEvaluator.extractAndEvaluate('combien fait 10 / 0');
  assert(e7 !== null && e7.success === false && e7.formattedResult === 'Impossible de diviser par zéro !', 'division by zero returns clean message');

  // 3. AIProviderService integration
  console.log('\n--- 3. Testing AIProviderService.generateWithIntent ---');
  const settings = aiRepository.getSettings('test-guild-ai-math');
  const completion = await AIProviderService.generateWithIntent({
    settings,
    baseSystemPrompt: 'System Prompt Test',
    messages: [{ role: 'user', content: 'combien fais 1+1', timestamp: new Date().toISOString() }],
  });

  assert(completion.text.includes('2'), 'AI response contains calculated result 2');
  assert(!completion.text.includes('pas sûr de bien saisir'), 'AI response does NOT use generic confusion fallback');
  assert(completion.model === 'builtin-ethone-math', 'AI response uses builtin-ethone-math model');

  const identityCompletion = await AIProviderService.generateWithIntent({
    settings,
    baseSystemPrompt: 'System Prompt Test',
    messages: [{ role: 'user', content: 'qui es-tu', timestamp: new Date().toISOString() }],
  });
  assert(identityCompletion.text.includes(settings.personality.name), 'Identity query returns personality name');

  // 4. DiscordAiPanel embed author icon
  console.log('\n--- 4. Testing DiscordAiPanel Embed Author Icon ---');
  const embedWithBotAvatar = DiscordAiPanel.buildResponseEmbed({
    settings,
    answer: 'Test answer',
    sourcesUsed: [],
    userTag: 'Tester#0001',
    botAvatarUrl: 'https://cdn.discordapp.com/avatars/123/abc.png',
  });
  assert(embedWithBotAvatar.data.author?.icon_url === 'https://cdn.discordapp.com/avatars/123/abc.png', 'Embed uses provided botAvatarUrl');

  const embedFallback = DiscordAiPanel.buildResponseEmbed({
    settings,
    answer: 'Test answer',
    sourcesUsed: [],
    userTag: 'Tester#0001',
  });
  assert(
    embedFallback.data.author?.icon_url?.startsWith('https://ethone.dev/icons/ethone-icon-512.png') === true,
    'Embed falls back to https://ethone.dev/icons/ethone-icon-512.png instead of default Discord blue avatar'
  );
  assert(
    !embedFallback.data.author?.icon_url?.includes('cdn.discordapp.com/embed/avatars'),
    'Embed author icon never contains cdn.discordapp.com/embed/avatars'
  );

  console.log('\n====================================================');
  console.log(`🏁 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
