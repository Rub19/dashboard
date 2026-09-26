/** Passerelle de connexion de l'app iOS : code à usage unique, expiration, seul retour mobile autorisé. */
process.env.DISCORD_TOKEN ??= 'test-token';
process.env.CLIENT_ID ??= '1';
const { issueMobileCode, consumeMobileCode, safeReturnUrl, MOBILE_RETURN } = await import('../src/server/routes/authRoutes.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const t0 = 1_000_000;
const code = issueMobileCode('jwt-abc', t0);
ok(typeof code === 'string' && code.length >= 24, 'un code aléatoire est émis');
ok(consumeMobileCode(code, t0 + 1000) === 'jwt-abc', 'le code est échangé contre le jeton');
ok(consumeMobileCode(code, t0 + 1000) === null, 'le code est à usage unique');

const late = issueMobileCode('jwt-late', t0);
ok(consumeMobileCode(late, t0 + 61_000) === null, 'un code expiré est refusé');
ok(consumeMobileCode('inconnu', t0) === null, 'un code inconnu est refusé');
ok(consumeMobileCode(undefined, t0) === null && consumeMobileCode(42, t0) === null, 'une valeur non textuelle est refusée');

ok(safeReturnUrl(MOBILE_RETURN) === MOBILE_RETURN, 'le retour ethone://discord-auth est autorisé');
ok(safeReturnUrl('ethone://autre') === null, 'un autre lien ethone:// est refusé');
ok(safeReturnUrl('https://evil.example/x') === null, 'un site tiers est refusé');
ok(safeReturnUrl('https://ethone.dev/discord') === 'https://ethone.dev/discord', 'le site reste autorisé');

if (fail) {
  console.log(`\n❌ ${fail} échec(s)`);
  process.exit(1);
}
console.log('\n✅ Passerelle mobile OK');
