export function base64UrlBytes(value) {
  const source = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function decodeJwtPart(value) {
  const bytes = base64UrlBytes(value);
  if (!bytes || bytes.byteLength > 16384) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function stableDigest(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}
