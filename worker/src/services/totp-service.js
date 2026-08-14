import { stableDigest } from "../utils/crypto.js";

const TOTP_ISSUER = "ETHONE";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = "SHA-1";

function base32Encode(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = new Uint8Array(buffer);
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
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
  const backupCodes = Array.from({ length: 8 }, () =>
    [...Array(8)].map(() => Math.floor(Math.random() * 36).toString(36)).join("").toUpperCase()
  );
  const hashedSecret = await stableDigest(secret);
  return { secret, hashedSecret, otpauth, backupCodes };
}

export async function verifyTotp(secret, code) {
  const now = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  for (const delta of [-1, 0, 1]) {
    if (await hmacSha1(new TextEncoder().encode(secret), now + delta) === String(code)) {
      return true;
    }
  }
  return false;
}
