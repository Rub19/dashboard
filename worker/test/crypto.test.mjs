import test from "node:test";
import assert from "node:assert/strict";
import { base64UrlBytes, decodeJwtPart, stableDigest, timingSafeEqual } from "../src/utils/crypto.js";
import { base64Url, encodeJwtPart } from "../src/utils/jwt.js";

test("timingSafeEqual returns true for identical Uint8Array buffers", () => {
  const a = new Uint8Array([1, 2, 3, 4, 5]);
  const b = new Uint8Array([1, 2, 3, 4, 5]);
  assert.equal(timingSafeEqual(a, b), true);
});

test("timingSafeEqual returns false for different byte content of equal length", () => {
  const a = new Uint8Array([1, 2, 3, 4, 5]);
  const b = new Uint8Array([1, 2, 3, 4, 6]);
  assert.equal(timingSafeEqual(a, b), false);
});

test("timingSafeEqual returns false for different buffer lengths", () => {
  const a = new Uint8Array([1, 2, 3]);
  const b = new Uint8Array([1, 2, 3, 4]);
  assert.equal(timingSafeEqual(a, b), false);
});

test("timingSafeEqual returns false for non-Uint8Array inputs", () => {
  const valid = new Uint8Array([1, 2, 3]);
  assert.equal(timingSafeEqual(null, valid), false);
  assert.equal(timingSafeEqual(valid, undefined), false);
  assert.equal(timingSafeEqual("abc", "abc"), false);
  assert.equal(timingSafeEqual([1, 2, 3], [1, 2, 3]), false);
  assert.equal(timingSafeEqual({}, {}), false);
});

test("base64Url converts base64 url-unsafe chars and removes padding", () => {
  const encoded = base64Url("subjects?_test");
  assert.equal(encoded.includes("+"), false);
  assert.equal(encoded.includes("/"), false);
  assert.equal(encoded.includes("="), false);
});

test("encodeJwtPart serializes object to base64url string", () => {
  const obj = { alg: "HS256", typ: "JWT" };
  const encoded = encodeJwtPart(obj);
  assert.equal(typeof encoded, "string");
  const decoded = decodeJwtPart(encoded);
  assert.deepEqual(decoded, obj);
});

test("base64UrlBytes decodes url-safe base64 strings correctly", () => {
  const original = new Uint8Array([72, 101, 108, 108, 111]);
  const b64url = base64Url("Hello");
  const bytes = base64UrlBytes(b64url);
  assert.deepEqual(bytes, original);
});

test("base64UrlBytes returns null on malformed base64 input", () => {
  assert.equal(base64UrlBytes("%%%invalid@@@"), null);
});

test("decodeJwtPart extracts parsed JSON object from base64url string", () => {
  const payload = { sub: "user-123", role: "authenticated" };
  const str = encodeJwtPart(payload);
  const result = decodeJwtPart(str);
  assert.deepEqual(result, payload);
});

test("decodeJwtPart rejects invalid inputs, arrays, and oversized payloads", () => {
  assert.equal(decodeJwtPart(null), null);
  assert.equal(decodeJwtPart("not-json"), null);
  assert.equal(decodeJwtPart(base64Url("[1, 2, 3]")), null);
  assert.equal(decodeJwtPart(base64Url("12345")), null);
  const oversized = base64Url(JSON.stringify({ data: "x".repeat(20000) }));
  assert.equal(decodeJwtPart(oversized), null);
});

test("stableDigest computes consistent 24-character hexadecimal digest", async () => {
  const digest1 = await stableDigest("test-payload-123");
  const digest2 = await stableDigest("test-payload-123");
  assert.equal(digest1, digest2);
  assert.equal(digest1.length, 24);
  assert.match(digest1, /^[0-9a-f]{24}$/);
});

test("stableDigest produces different outputs for different inputs", async () => {
  const digestA = await stableDigest("alpha");
  const digestB = await stableDigest("beta");
  assert.notEqual(digestA, digestB);
});

test("stableDigest handles empty and falsy values without crashing", async () => {
  const digestNull = await stableDigest(null);
  const digestEmpty = await stableDigest("");
  assert.equal(digestNull, digestEmpty);
  assert.equal(digestNull.length, 24);
});
