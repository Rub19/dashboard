import assert from "node:assert/strict";
import test from "node:test";
import { mailInitials, mailSenderHue } from "./mail.ts";

test("mail initials stay useful for names and addresses", () => {
  assert.equal(mailInitials("Marco Malvataj", "marco@example.com"), "MM");
  assert.equal(mailInitials("", "hello@anthropic.com"), "HE");
  assert.equal(mailInitials("É", "e@example.com"), "É");
});

test("mail sender color is deterministic", () => {
  assert.equal(mailSenderHue("hello@anthropic.com"), mailSenderHue("hello@anthropic.com"));
  assert.ok(mailSenderHue("hello@anthropic.com") >= 0);
  assert.ok(mailSenderHue("hello@anthropic.com") < 360);
});
