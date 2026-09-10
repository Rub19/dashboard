import { timingSafeEqual } from "../utils/crypto.js";

const TOTP_ISSUER = "ETHONE";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = "SHA-1";
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 8;
const BACKUP_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
// Largest multiple of the alphabet size (36) that fits in a byte (0-255):
// rejecting bytes at or above this avoids modulo bias toward the low symbols.
const BACKUP_ALPHABET_REJECT_THRESHOLD = 252;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  const bytes = new Uint8Array(buffer);
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

// The inverse of base32Encode: turns the base32 text (what's shown to the
// user / embedded in the otpauth:// QR code and, per RFC 3548 §5 / 4648 §6,
// what an authenticator app decodes before using it as HMAC key material)
// back into the raw key bytes. Without this, verifyTotp would use the
// base32 text's own UTF-8 bytes as the HMAC key instead of the decoded
// secret — internally self-consistent, but never matching any real
// authenticator app, which always decodes first.
function base32Decode(value) {
  const clean = String(value).toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let acc = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    acc = (acc << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// Draws `length` symbols from BACKUP_ALPHABET using rejection sampling so
// every symbol is equally likely (a plain `byte % 36` would bias low symbols,
// since 256 is not a multiple of 36).
function randomBackupChars(length) {
  let output = "";
  while (output.length < length) {
    const buffer = new Uint8Array(length - output.length);
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte >= BACKUP_ALPHABET_REJECT_THRESHOLD) continue;
      output += BACKUP_ALPHABET[byte % BACKUP_ALPHABET.length];
      if (output.length >= length) break;
    }
  }
  return output.toUpperCase();
}

async function hashBackupCode(code) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code).toUpperCase().trim()));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

async function hmacSha1(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const counter = new ArrayBuffer(8);
  const view = new DataView(counter);
  view.setUint32(0, Math.floor(message / 4294967296), false);
  view.setUint32(4, message % 4294967296, false);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counter));
  const offset = signature[signature.length - 1] & 0x0f;
  const code = ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export async function generateTotpSecret(userId, email) {
  const raw = crypto.getRandomValues(new Uint8Array(20));
  const secret = base32Encode(raw);
  const accountName = encodeURIComponent(email || userId);
  const otpauth = `otpauth://totp/${TOTP_ISSUER}:${accountName}?secret=${secret}&issuer=${TOTP_ISSUER}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => randomBackupChars(BACKUP_CODE_LENGTH));
  const backupCodeHashes = await Promise.all(backupCodes.map((code) => hashBackupCode(code)));
  // `secret` is the real base32 key: TOTP is symmetric key material the
  // server must read back verbatim to derive/verify codes (unlike a
  // password), so it — not a digest of it — is what gets persisted by the
  // caller. `backupCodeHashes` is what should be persisted for backup codes
  // (never the plaintext `backupCodes`, which are shown to the user once).
  return { secret, otpauth, backupCodes, backupCodeHashes };
}

export async function verifyTotp(secret, code) {
  const now = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  const keyBytes = base32Decode(secret);
  const providedBytes = new TextEncoder().encode(String(code));
  let matched = false;
  for (const delta of [-1, 0, 1]) {
    const expected = await hmacSha1(keyBytes, now + delta);
    // Constant-time compare (no early exit on mismatch) to avoid leaking
    // which digit differs via response timing. We still iterate all three
    // candidate windows rather than short-circuiting the outer loop early —
    // there's no meaningful signal to leak between independent windows, and
    // continuing keeps this simple; only the byte comparison itself needs to
    // be constant time.
    if (timingSafeEqual(new TextEncoder().encode(expected), providedBytes)) matched = true;
  }
  return matched;
}

// Redeems one backup code against the set of hashes persisted for this user
// (ethone_user_data.data.backup — see generateTotpSecret). Single-use: on a
// match, the matched hash is removed from the returned list so the caller
// persists the shrunk list and the same code can never be redeemed twice.
// No early exit across candidates (mirrors verifyTotp's window loop above)
// so the number of stored codes doesn't leak via response timing; the
// per-candidate comparison itself is timing-safe.
export async function verifyBackupCode(hashes, code) {
  const list = Array.isArray(hashes) ? hashes : [];
  if (!list.length) return { valid: false, remainingHashes: list };

  const candidateHash = await hashBackupCode(code);
  const candidateBytes = new TextEncoder().encode(candidateHash);
  let matchIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const storedBytes = new TextEncoder().encode(String(list[i] || ""));
    if (matchIndex === -1 && timingSafeEqual(storedBytes, candidateBytes)) matchIndex = i;
  }

  if (matchIndex === -1) return { valid: false, remainingHashes: list };
  const remainingHashes = list.slice(0, matchIndex).concat(list.slice(matchIndex + 1));
  return { valid: true, remainingHashes };
}

