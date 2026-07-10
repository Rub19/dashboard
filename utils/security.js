/* ETHONE security helpers.
   Frontend-only hardening for escaping, local profile locks and persistence redaction. */
(function (global) {
  "use strict";
  if (global.ETHONESecurity) return;

  var sensitiveKeyPattern = /(?:password|passcode|pin|secret|token|api[_-]?key|apikey|auth|session|credential|bearer|refresh|access[_-]?token|private[_-]?key)/i;
  var allowSensitiveContainers = /^(?:password|profileLock)$/i;
  var redacted = "[redacted]";

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function safeImageSrc(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
    try {
      var url = new URL(raw, location.origin);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (error) {}
    return "";
  }

  function bytesToBase64(bytes) {
    var bin = "";
    bytes = new Uint8Array(bytes);
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToBytes(value) {
    var bin = atob(String(value || ""));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return bytesToBase64(bytes);
  }

  async function digestFallback(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return "fnv1a:" + (hash >>> 0).toString(16);
  }

  async function pbkdf2(value, salt, iterations) {
    value = String(value || "");
    iterations = Number(iterations) || 120000;
    if (!global.crypto || !crypto.subtle || !global.TextEncoder) {
      return digestFallback(salt + ":" + value + ":" + iterations);
    }
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey("raw", enc.encode(value), "PBKDF2", false, ["deriveBits"]);
    var bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations: iterations
    }, key, 256);
    return bytesToBase64(bits);
  }

  async function createProfileLock(type, value) {
    type = type === "pin" ? "pin" : "text";
    var salt = randomSalt();
    var iterations = type === "pin" ? 90000 : 140000;
    return {
      type: type,
      algorithm: "PBKDF2-SHA256",
      version: 2,
      iterations: iterations,
      salt: salt,
      hash: await pbkdf2(value, salt, iterations)
    };
  }

  async function verifyProfileLock(lock, value) {
    if (!lock) return { ok: false };
    if (Object.prototype.hasOwnProperty.call(lock, "value")) {
      var okLegacy = String(value || "") === String(lock.value || "");
      return {
        ok: okLegacy,
        legacy: true,
        migrated: okLegacy ? await createProfileLock(lock.type, value) : null
      };
    }
    if (!lock.hash || !lock.salt) return { ok: false };
    var hash = await pbkdf2(value, lock.salt, lock.iterations);
    return { ok: hash === lock.hash };
  }

  function sanitizeProfileLock(lock) {
    if (!lock) return null;
    if (lock.hash && lock.salt) {
      return {
        type: lock.type === "pin" ? "pin" : "text",
        algorithm: lock.algorithm || "PBKDF2-SHA256",
        version: Number(lock.version) || 2,
        iterations: Number(lock.iterations) || 120000,
        salt: String(lock.salt),
        hash: String(lock.hash)
      };
    }
    if (lock.type) return { type: lock.type === "pin" ? "pin" : "text", legacy: true };
    return null;
  }

  function sanitizeObject(value, path) {
    path = path || "";
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(function (item, index) { return sanitizeObject(item, path + "[" + index + "]"); });
    var out = {};
    Object.keys(value).forEach(function (key) {
      var nextPath = path ? path + "." + key : key;
      if (sensitiveKeyPattern.test(key) && !allowSensitiveContainers.test(key)) {
        out[key] = redacted;
        return;
      }
      if (allowSensitiveContainers.test(key)) out[key] = sanitizeProfileLock(value[key]);
      else out[key] = sanitizeObject(value[key], nextPath);
    });
    return out;
  }

  function sanitizeProfilesForPersistence(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (profile) {
      var clean = sanitizeObject(profile || {});
      if (clean && profile && profile.password) clean.password = sanitizeProfileLock(profile.password);
      if (clean && clean.state && clean.state.connections) clean.state.connections = sanitizeObject(clean.state.connections);
      if (clean && clean.state && clean.state.gaming) clean.state.gaming = sanitizeObject(clean.state.gaming);
      return clean;
    });
  }

  function isSensitiveKey(key) {
    return sensitiveKeyPattern.test(String(key || ""));
  }

  global.ETHONESecurity = {
    escapeHTML: escapeHTML,
    safeImageSrc: safeImageSrc,
    createProfileLock: createProfileLock,
    verifyProfileLock: verifyProfileLock,
    sanitizeObject: sanitizeObject,
    sanitizeProfilesForPersistence: sanitizeProfilesForPersistence,
    sanitizeProfileLock: sanitizeProfileLock,
    isSensitiveKey: isSensitiveKey,
    redacted: redacted
  };
})(window);
