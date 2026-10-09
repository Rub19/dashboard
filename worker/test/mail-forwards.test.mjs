import assert from "node:assert/strict";
import test from "node:test";
import { codeHash, forwardsFor, safeEmail } from "../src/services/mail-forwards.js";

test("redirections : n'accepte que des adresses valides", () => {
  assert.equal(safeEmail(" Rub@Gmail.com "), "rub@gmail.com");
  assert.equal(safeEmail("pas-une-adresse"), "");
});

test("redirections : l'empreinte du code est liée à la redirection et au secret", async () => {
  const a = await codeHash("secret", "fwd-1", "123456");
  assert.equal(a, await codeHash("secret", "fwd-1", "123456"));
  assert.notEqual(a, await codeHash("secret", "fwd-2", "123456"));
  assert.notEqual(a, await codeHash("autre", "fwd-1", "123456"));
});

test("redirections : seulement vers les destinations confirmées et actives", () => {
  const list = [
    { id: "1", alias_id: null, verified_at: "x", is_active: true },
    { id: "2", alias_id: "a2", verified_at: "x", is_active: true },
    { id: "3", alias_id: null, verified_at: null, is_active: true },
    { id: "4", alias_id: null, verified_at: "x", is_active: false },
  ];
  assert.deepEqual(forwardsFor(list, "a1").map((f) => f.id), ["1"]);
  assert.deepEqual(forwardsFor(list, "a2").map((f) => f.id), ["1", "2"]);
});
