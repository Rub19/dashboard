import { requestExternal } from "../utils/external-request.js";
import { createOtpCode, getActiveOtpCode, consumeOtpCode, deleteExpiredOtpCodes, insertSecurityEvent, getUserIdByEmail } from "./security-identity-client.js";
import { signServiceToken } from "../utils/jwt.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;

function brandMarkDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-label="ETHONE"><defs><linearGradient id="ethone-signal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7be5c3"/><stop offset="1" stop-color="#8bc9fa"/></linearGradient><linearGradient id="ethone-surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14191f"/><stop offset="1" stop-color="#080a0d"/></linearGradient></defs><rect x="1.25" y="1.25" width="61.5" height="61.5" rx="15.25" fill="url(#ethone-signal)"/><rect x="4.15" y="4.15" width="55.7" height="55.7" rx="12.6" fill="url(#ethone-surface)"/><path d="M19 18v28m0-28h26M19 32h20.5M19 46h26" fill="none" stroke="#f4f7fa" stroke-width="6.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function formatExpiresAt(iso) {
  const d = new Date(iso);
  const paris = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
  const utc = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" });
  return `${paris.format(d)} (heure de Paris) / ${utc.format(d)} UTC`;
}

function maskContact(contact) {
  const at = contact.indexOf("@");
  if (at <= 0) return contact;
  const local = contact.slice(0, Math.min(3, at));
  return `${local}***${contact.slice(at)}`;
}

function buildOtpEmail(code, contact, expiresAt) {
  const logo = brandMarkDataUri();
  const expires = formatExpiresAt(expiresAt);
  const masked = maskContact(contact);
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre code de connexion ETHONE</title>
</head>
<body style="margin:0; padding:0; background:#080a0d; color:#f4f7fa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080a0d; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14191f; border:1px solid #1f2937; border-radius:16px; max-width:520px; width:100%; padding:32px 24px;">
          <tr>
            <td align="center">
              <img src="${logo}" alt="ETHONE" width="64" height="64" style="display:block; margin:0 auto 16px; border-radius:15px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:600; color:#f4f7fa;">Code de connexion</h1>
              <p style="margin:0; color:#9ca3af; font-size:14px;">Compte : <strong style="color:#f4f7fa;">${masked}</strong></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 0;">
              <p style="margin:0 0 16px; color:#9ca3af; font-size:14px;">Votre code à six chiffres :</p>
              <div style="font-size:36px; letter-spacing:10px; font-weight:700; color:#7be5c3; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${code}</div>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin:0 0 8px; color:#9ca3af; font-size:14px;">Valable jusqu'au <strong style="color:#f4f7fa;">${expires}</strong>.</p>
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px; line-height:1.5;">
                Ne partagez ce code avec personne. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.<br>
                ETHONE — votre dashboard personnel.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `ETHONE — Code de connexion

Compte : ${masked}
Code : ${code}
Valable jusqu'au : ${expires}

Ne partagez ce code avec personne. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
ETHONE — votre dashboard personnel.`;

  return { html, text };
}

async function sendEmail(env, to, subject, { html, text } = {}) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email service not configured");
  const from = env.RESEND_FROM || "ETHONE <no-reply@ethone.dev>";
  const origin = "https://api.resend.com";
  const response = await requestExternal(new URL("/emails", origin), {
    env,
    expectedOrigin: origin,
    service: "resend",
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, html, text }),
    retries: 1,
    maxBytes: 8192
  });
  return response.data;
}

function hashCode(code) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code).toLowerCase().trim()))
    .then((buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer))));
}

function safeEmail(value) {
  const email = String(value || "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return "";
  return email;
}

export async function sendOtp(env, email, providedUserId) {
  const contact = safeEmail(email);
  if (!contact) throw new Error("Invalid email address");

  const resolvedUserId = providedUserId || await getUserIdByEmail(env, contact);
  if (!resolvedUserId) throw new Error("Account not found");

  const existing = await getActiveOtpCode(env, resolvedUserId, contact);
  if (existing && existing.rate_limited_until && new Date(existing.rate_limited_until) > new Date()) {
    throw new Error("Too many attempts. Please wait before requesting a new code.");
  }

  const codeDigits = new Uint8Array(6);
  crypto.getRandomValues(codeDigits);
  const code = Array.from(codeDigits, (b) => b % 10).join("");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const codeHash = await hashCode(code);

  await createOtpCode(env, {
    userId: resolvedUserId,
    contact,
    codeHash,
    expiresAt,
    rateLimitedUntil: new Date(Date.now() + COOLDOWN_MS).toISOString()
  });

  // Deliver the code via Resend when RESEND_API_KEY is configured.
  // In development with ETHONE_DEBUG_OTP=true, the code is returned for tests instead of sent.
  const isProduction = env.ENVIRONMENT === "production";
  const debugOtpEnabled = !isProduction && env.ENVIRONMENT === "development" && env.ETHONE_DEBUG_OTP === "true";
  const exposeCode = debugOtpEnabled;
  if (!exposeCode) {
    const { html, text } = buildOtpEmail(code, contact, expiresAt);
    await sendEmail(env, contact, "Votre code de connexion ETHONE", { html, text });
  }

  await insertSecurityEvent(env, {
    userId: resolvedUserId,
    kind: "otp_requested",
    metadata: { contact: contact.slice(0, 3) + "***" + contact.slice(contact.indexOf("@")) }
  });

  // The code is only exposed in development when explicitly enabled, for tests.
  return { sent: true, userId: resolvedUserId, contact, expiresIn: OTP_TTL_MS, code: exposeCode ? code : undefined };
}

export async function verifyOtp(env, userId, email, code, deviceId) {
  const contact = safeEmail(email);
  const rawCode = String(code || "").toLowerCase().trim();
  if (!contact || !/^\d{6}$/.test(rawCode)) throw new Error("Invalid code format");

  const existing = await getActiveOtpCode(env, userId, contact);
  if (!existing) throw new Error("No active verification code");
  if (existing.used_at) throw new Error("Code already used");
  if (new Date(existing.expires_at) < new Date()) throw new Error("Code expired");

  const attempts = (existing.attempts || 0) + 1;
  if (attempts > MAX_ATTEMPTS) {
    await consumeOtpCode(env, existing.id, { rateLimitedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), attempts });
    throw new Error("Too many attempts. Please request a new code.");
  }

  const codeHash = await hashCode(rawCode);
  if (codeHash !== existing.code_hash) {
    await consumeOtpCode(env, existing.id, { attempts });
    throw new Error("Invalid code");
  }

  await consumeOtpCode(env, existing.id, { usedAt: new Date().toISOString(), attempts });

  await insertSecurityEvent(env, {
    userId,
    kind: "otp_verified",
    deviceId,
    metadata: { contact: contact.slice(0, 3) + "***" + contact.slice(contact.indexOf("@")) }
  });

  const token = await signServiceToken(env, userId, null, 3600);
  return { verified: true, userId, token };
}

export async function cleanupExpiredOtp(env) {
  await deleteExpiredOtpCodes(env);
  return true;
}
