import { requestExternal } from "../utils/external-request.js";
import { createOtpCode, getActiveOtpCode, consumeOtpCode, deleteExpiredOtpCodes, insertSecurityEvent, getUserIdByEmail } from "./security-identity-client.js";
import { signServiceToken } from "../utils/jwt.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;

const LOGO_PNG_BASE64 = "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";

const EMAIL_I18N = {
  fr: {
    subject: "Votre code de connexion ETHONE",
    greeting: "Bonjour,",
    intro: "Voici votre code de connexion pour accéder à <strong>ETHONE</strong>.",
    account: "Compte",
    codeLabel: "Code à six chiffres",
    validUntil: "Valable jusqu'au",
    security: "Ne partagez ce code avec personne. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    tagline: "ETHONE — votre dashboard personnel",
    signoff: "L'équipe ETHONE"
  },
  en: {
    subject: "Your ETHONE login code",
    greeting: "Hello,",
    intro: "Here is your login code to access <strong>ETHONE</strong>.",
    account: "Account",
    codeLabel: "Six-digit code",
    validUntil: "Valid until",
    security: "Do not share this code with anyone. If you did not request it, you can ignore this email.",
    tagline: "ETHONE — your personal dashboard",
    signoff: "The ETHONE team"
  },
  es: {
    subject: "Tu código de acceso ETHONE",
    greeting: "Hola,",
    intro: "Aquí tienes tu código de acceso para entrar en <strong>ETHONE</strong>.",
    account: "Cuenta",
    codeLabel: "Código de seis dígitos",
    validUntil: "Válido hasta",
    security: "No compartas este código con nadie. Si no fuiste tú quien lo solicitó, ignora este email.",
    tagline: "ETHONE — tu dashboard personal",
    signoff: "El equipo de ETHONE"
  },
  de: {
    subject: "Dein ETHONE-Anmeldecode",
    greeting: "Hallo,",
    intro: "Hier ist dein Anmeldecode für <strong>ETHONE</strong>.",
    account: "Konto",
    codeLabel: "Sechsstelliger Code",
    validUntil: "Gültig bis",
    security: "Teile diesen Code mit niemandem. Wenn du ihn nicht angefordert hast, ignoriere diese E-Mail.",
    tagline: "ETHONE — dein persönliches Dashboard",
    signoff: "Das ETHONE-Team"
  }
};

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, "");
}

const COUNTRY_TO_LOCALE = {
  FR: "fr", BE: "fr", CH: "de", LU: "fr", MC: "fr",
  ES: "es",
  DE: "de", AT: "de"
};

export function resolveEmailLocale(acceptLanguage = "", country = "") {
  const match = String(acceptLanguage).match(/^[a-zA-Z]{2}/);
  if (match) {
    const lang = match[0].toLowerCase();
    if (EMAIL_I18N[lang]) return lang;
  }
  const cc = String(country).toUpperCase();
  return COUNTRY_TO_LOCALE[cc] || "en";
}

function formatExpiresAt(iso, locale, timezone) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function maskContact(contact) {
  const at = contact.indexOf("@");
  if (at <= 0) return contact;
  const local = contact.slice(0, Math.min(3, at));
  return `${local}***${contact.slice(at)}`;
}

function buildOtpEmail(code, contact, expiresAt, locale, timezone) {
  const i18n = EMAIL_I18N[locale] || EMAIL_I18N.en;
  const expires = formatExpiresAt(expiresAt, locale, timezone);
  const masked = maskContact(contact);
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${i18n.subject}</title>
</head>
<body style="margin:0; padding:0; background:#080a0d; color:#f4f7fa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080a0d; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14191f; border:1px solid #1f2937; border-radius:16px; max-width:520px; width:100%; padding:32px 24px;">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <img src="cid:ethone-logo" alt="ETHONE" width="64" height="64" style="display:block; margin:0 auto 12px; border-radius:15px;">
              <h1 style="margin:0; font-size:24px; font-weight:700; color:#f4f7fa; letter-spacing:1px;">ETHONE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 8px;">
              <p style="margin:0 0 8px; color:#f4f7fa; font-size:16px; font-weight:500;">${i18n.greeting}</p>
              <p style="margin:0; color:#9ca3af; font-size:14px; line-height:1.5;">${i18n.intro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1d1b; border:1px solid #7be5c3; border-radius:12px; padding:24px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px; color:#7be5c3; font-size:13px; font-weight:500;">${i18n.codeLabel}</p>
                    <div style="font-size:38px; letter-spacing:12px; font-weight:700; color:#7be5c3; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${code}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <p style="margin:0 0 4px; color:#9ca3af; font-size:13px;">${i18n.account} : <strong style="color:#f4f7fa;">${masked}</strong></p>
              <p style="margin:0; color:#9ca3af; font-size:13px;">${i18n.validUntil} <strong style="color:#f4f7fa;">${expires}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1f2a; border:1px solid #2d3748; border-radius:10px; padding:16px;">
                <tr>
                  <td>
                    <p style="margin:0; color:#9ca3af; font-size:13px; line-height:1.5;">${i18n.security}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px; border-top:1px solid #1f2937;">
              <p style="margin:0 0 4px; color:#f4f7fa; font-size:13px; font-weight:500;">${i18n.tagline}</p>
              <p style="margin:0; color:#6b7280; font-size:12px;">${i18n.signoff}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${i18n.greeting}

${stripHtml(i18n.intro)}

${i18n.codeLabel} : ${code}
${i18n.account} : ${masked}
${i18n.validUntil} : ${expires}

${i18n.security}

${i18n.tagline}
${i18n.signoff}`;

  const attachments = [{
    content: LOGO_PNG_BASE64,
    filename: "ethone-logo.png",
    content_type: "image/png",
    content_id: "ethone-logo"
  }];

  return { html, text, attachments };
}

async function sendEmail(env, to, subject, { html, text, attachments } = {}) {
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
    body: JSON.stringify({ from, to, subject, html, text, ...(attachments?.length ? { attachments } : {}) }),
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

export async function sendOtp(env, email, providedUserId, acceptLanguage = "fr", country = "", timezone = "Europe/Paris") {
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
    const effectiveLocale = resolveEmailLocale(acceptLanguage, country);
    const effectiveTimezone = timezone || "Europe/Paris";
    const { html, text, attachments } = buildOtpEmail(code, contact, expiresAt, effectiveLocale, effectiveTimezone);
    const i18n = EMAIL_I18N[effectiveLocale] || EMAIL_I18N.en;
    await sendEmail(env, contact, i18n.subject, { html, text, attachments });
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
