import assert from "node:assert/strict";
import test from "node:test";
import { generateTotpSecret, isSealedSecret, openTotpSecret, sealTotpSecret, verifyBackupCode } from "../src/services/totp-service.js";

const KEY = "k".repeat(48);
const OTHER_KEY = "z".repeat(48);
const withKey = { TOTP_ENCRYPTION_KEY: KEY };

test("le secret TOTP est chiffré au repos et se relit à l'identique", async () => {
  const sealed = await sealTotpSecret(withKey, "JBSWY3DPEHPK3PXP");
  assert.ok(isSealedSecret(sealed));
  assert.ok(!sealed.includes("JBSWY3DPEHPK3PXP"));
  assert.equal(await openTotpSecret(withKey, sealed), "JBSWY3DPEHPK3PXP");
});

test("deux chiffrements du même secret diffèrent (IV aléatoire)", async () => {
  assert.notEqual(await sealTotpSecret(withKey, "ABCDEFGH"), await sealTotpSecret(withKey, "ABCDEFGH"));
});

test("un secret chiffré ne se relit pas avec une autre clé, ni sans clé", async () => {
  const sealed = await sealTotpSecret(withKey, "JBSWY3DPEHPK3PXP");
  await assert.rejects(() => openTotpSecret({ TOTP_ENCRYPTION_KEY: OTHER_KEY }, sealed));
  await assert.rejects(() => openTotpSecret({}, sealed));
});

test("ancien format en clair : relu tel quel, et rien n'est chiffré sans clé configurée", async () => {
  assert.equal(await openTotpSecret(withKey, "JBSWY3DPEHPK3PXP"), "JBSWY3DPEHPK3PXP");
  assert.equal(await sealTotpSecret({}, "JBSWY3DPEHPK3PXP"), "JBSWY3DPEHPK3PXP");
});

test("les codes de secours sont hachés avec un poivre et à usage unique", async () => {
  const { backupCodes, backupCodeHashes } = await generateTotpSecret("u", "a@b.c", withKey);
  assert.ok(backupCodeHashes.every((h) => h.startsWith("h2:")));
  const first = await verifyBackupCode(backupCodeHashes, backupCodes[0], withKey);
  assert.equal(first.valid, true);
  assert.equal(first.remainingHashes.length, backupCodeHashes.length - 1);
  // sans le poivre (base volée seule), les empreintes ne sont pas rejouables
  assert.equal((await verifyBackupCode(backupCodeHashes, backupCodes[1], {})).valid, false);
  assert.equal((await verifyBackupCode(backupCodeHashes, backupCodes[1], { TOTP_ENCRYPTION_KEY: OTHER_KEY })).valid, false);
});

test("anciens codes de secours (SHA-256 simple) toujours acceptés", async () => {
  const { backupCodes, backupCodeHashes } = await generateTotpSecret("u", "a@b.c");
  assert.ok(!backupCodeHashes[0].startsWith("h2:"));
  assert.equal((await verifyBackupCode(backupCodeHashes, backupCodes[0], withKey)).valid, true);
});
