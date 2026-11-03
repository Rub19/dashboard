import assert from "node:assert/strict";
import test from "node:test";
import { mailInitials, mailSenderHue, mailTime } from "./mail.ts";

test("mail time shows the hour today, the date otherwise", () => {
  const now = new Date(2026, 10, 3, 18, 0);
  assert.match(mailTime(new Date(2026, 10, 3, 9, 5).toISOString(), now, "fr"), /09:05/);
  assert.match(mailTime(new Date(2026, 9, 31, 9, 5).toISOString(), now, "fr"), /31 oct/);
  assert.match(mailTime(new Date(2025, 9, 31, 9, 5).toISOString(), now, "fr"), /2025/);
  assert.equal(mailTime("pas une date", now, "fr"), "");
});

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
