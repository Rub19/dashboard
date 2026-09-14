import { requestExternal } from "../utils/external-request.js";
import { createOtpCode, getActiveOtpCode, consumeOtpCode, deleteExpiredOtpCodes, insertSecurityEvent, getUserIdByEmail } from "./security-identity-client.js";
import { signServiceToken } from "../utils/jwt.js";
import { timingSafeEqual } from "../utils/crypto.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;


const EMAIL_I18N = {
  fr: {
    subject: "Votre code de connexion ETHONE",
    greeting: "Bonjour,",
    intro: "Voici votre code de connexion pour accéder à <strong>ETHONE</strong>.",
    account: "Compte",
    codeLabel: "Code à six chiffres",
    validityHint: "Expire dans {minutes} minutes",
    copyHint: "Appuyez pour tout sélectionner",
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
    validityHint: "Expires in {minutes} minutes",
    copyHint: "Tap to select all",
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
    validityHint: "Caduca en {minutes} minutos",
    copyHint: "Toca para seleccionar todo",
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
    validityHint: "Läuft in {minutes} Minuten ab",
    copyHint: "Zum Auswählen antippen",
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

// Browser language decides the email language. Walk the Accept-Language list
// in the browser's own priority order and take the first tag ETHONE actually
// ships an email translation for (fr / es / de / en). Any other browser
// language (pt, it, nl, ...) gets English — deliberately NOT a guess from the
// request's country, so a Portuguese speaker in Germany isn't sent German.
// The country fallback only applies when there's no Accept-Language header at
// all (rare — most non-browser callers still send one).
export function resolveEmailLocale(acceptLanguage = "", country = "") {
  const raw = String(acceptLanguage).trim();
  if (raw) {
    for (const tag of raw.split(",")) {
      const lang = tag.trim().slice(0, 2).toLowerCase();
      if (lang === "fr" || lang === "es" || lang === "de" || lang === "en") return lang;
    }
    return "en";
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
  const minutes = Math.round(OTP_TTL_MS / 60000);
  const masked = maskContact(contact);
  const digits = String(code).split("");
  // Six individually boxed digits, mirroring the web app's own OTP input
  // (components/auth/OtpCodeInput.tsx) so the email and the page the user
  // types the code into feel like the same product.
  const digitBoxes = digits
    .map(
      (d, i) =>
        `<td style="padding:0 ${i === digits.length - 1 ? 0 : 5}px 0 0;"><div style="width:38px; height:46px; line-height:46px; text-align:center; background:#0f1a16; border:1px solid #2a4a40; border-radius:10px; color:#ffffff; font-size:22px; font-weight:800; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${d}</div></td>`
    )
    .join("");
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>${i18n.subject}</title>
</head>
<body style="margin:0; padding:0; background:#07080b; color:#f4f7fa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07080b; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%; border-radius:20px; overflow:hidden; background:#111419; border:1px solid #232a35;">
          <tr>
            <td style="height:3px; line-height:3px; font-size:0; background-color:#5fd0ab; background-image:linear-gradient(90deg,#5fd0ab,#7be5c3,#5fd0ab);">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 32px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:60px; height:60px; border-radius:16px; background:#0f1a16; border:1px solid #2a4a40;">
                    <img src="https://ethone.dev/icons/ethone-icon-192.png" alt="ETHONE" width="60" height="60" style="display:block; border-radius:16px;">
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px; font-size:12px; font-weight:700; letter-spacing:4px; color:#8a929e;">ETHONE</div>
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><div style="height:1px; background:#1e242e;"></div></td></tr>
          <tr>
            <td style="padding:26px 32px 6px;">
              <p style="margin:0 0 6px; color:#f4f7fa; font-size:17px; font-weight:700;">${i18n.greeting}</p>
              <p style="margin:0; color:#98a1ad; font-size:14px; line-height:1.6;">${i18n.intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d1512; border:1px solid #1f382f; border-radius:16px;">
                <tr>
                  <td align="center" style="padding:26px 20px;">
                    <div style="color:#5fd0ab; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2.5px;">${i18n.codeLabel}</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
                      <tr>${digitBoxes}</tr>
                    </table>
                    <div style="margin-top:14px;">
                      <span style="-webkit-user-select:all; user-select:all; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:13px; letter-spacing:1px; color:#8a929e; border:1px dashed #2a4a40; border-radius:8px; padding:4px 10px; cursor:pointer;">${code}</span>
                    </div>
                    <div style="margin-top:6px; color:#5a6470; font-size:10.5px;">${i18n.copyHint}</div>
                    <div style="margin-top:12px; color:#6f7a86; font-size:12px;">${i18n.validityHint.replace("{minutes}", String(minutes))}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px; color:#98a1ad;">
                <tr>
                  <td style="padding:6px 0;">${i18n.account}</td>
                  <td align="right" style="padding:6px 0; color:#dfe4ea;">${masked}</td>
                </tr>
                <tr><td colspan="2"><div style="height:1px; background:#1a2029;"></div></td></tr>
                <tr>
                  <td style="padding:6px 0;">${i18n.validUntil}</td>
                  <td align="right" style="padding:6px 0; color:#dfe4ea;">${expires}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#161a20; border-radius:10px;">
                <tr>
                  <td style="padding:12px 14px; color:#8991a0; font-size:12px; line-height:1.55;">&#128274;&nbsp; ${i18n.security}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 32px;">
              <div style="height:1px; background:#1e242e; margin-bottom:18px;"></div>
              <div style="color:#c3c9d1; font-size:12px; font-weight:600;">${i18n.tagline}</div>
              <div style="margin-top:3px; color:#616a76; font-size:11px;">${i18n.signoff}</div>
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

  return { html, text };
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

// Largest multiple of 10 that fits in a byte (0-255): rejecting bytes at or
// above this avoids modulo bias toward the low digits (`byte % 10` alone
// makes 0-5 slightly more likely than 6-9, since 256 isn't a multiple of 10).
const DIGIT_REJECT_THRESHOLD = 250;

function randomDigits(length) {
  const digits = new Uint8Array(length);
  let filled = 0;
  while (filled < length) {
    const buffer = new Uint8Array(length - filled);
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte >= DIGIT_REJECT_THRESHOLD) continue;
      digits[filled] = byte % 10;
      filled += 1;
      if (filled >= length) break;
    }
  }
  return digits;
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

  const code = Array.from(randomDigits(6)).join("");
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
    const { html, text } = buildOtpEmail(code, contact, expiresAt, effectiveLocale, effectiveTimezone);
    const i18n = EMAIL_I18N[effectiveLocale] || EMAIL_I18N.en;
    await sendEmail(env, contact, i18n.subject, { html, text });
  }

  await insertSecurityEvent(env, {
    userId: resolvedUserId,
    kind: "otp_requested",
    metadata: { contact: contact.slice(0, 3) + "***" + contact.slice(contact.indexOf("@")) }
  });

  // The code is only exposed in development when explicitly enabled, for tests.
  return { sent: true, userId: resolvedUserId, contact, expiresIn: OTP_TTL_MS, code: exposeCode ? code : undefined };
}

export async function verifyOtp(env, userId, email, code, deviceId, sessionId = null) {
  const contact = safeEmail(email);
  const rawCode = String(code || "").toLowerCase().trim();
  if (!contact || !/^\d{6}$/.test(rawCode)) throw new Error("Invalid code format");

  const existing = await getActiveOtpCode(env, userId, contact);
  if (!existing) throw new Error("No active verification code");
  if (existing.used_at) throw new Error("Code already used");
  if (new Date(existing.expires_at) < new Date()) {
    // Diagnostic only: a user reported a code being rejected as expired
    // within seconds of receiving it, which the TTL math here can't explain
    // on its own (OTP_TTL_MS is 10 minutes). Logging the actual row age
    // lets this be root-caused from Worker logs next time it happens,
    // instead of guessing -- candidates are a duplicate concurrent send
    // superseding the row the user is reading from their inbox, or an
    // email delivery delay (Gmail can defer/greylist transactional mail)
    // making the "just arrived" email actually minutes old server-side.
    console.warn("[otp] rejected as expired", {
      otpId: existing.id,
      userId,
      createdAt: existing.created_at,
      expiresAt: existing.expires_at,
      now: new Date().toISOString(),
      ageMs: Date.now() - new Date(existing.created_at).getTime()
    });
    throw new Error("Code expired");
  }

  const attempts = (existing.attempts || 0) + 1;
  if (attempts > MAX_ATTEMPTS) {
    await consumeOtpCode(env, existing.id, { rateLimitedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), attempts });
    throw new Error("Too many attempts. Please request a new code.");
  }

  const codeHash = await hashCode(rawCode);
  // Constant-time compare (length check, then XOR every byte with no early
  // exit) to avoid leaking how many leading bytes of the hash matched via
  // response timing.
  const hashesMatch = timingSafeEqual(new TextEncoder().encode(codeHash), new TextEncoder().encode(String(existing.code_hash || "")));
  if (!hashesMatch) {
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

  // The caller currently mints its own token with the same sessionId and
  // ignores this one — kept in sync anyway so it's never a trap for a future
  // caller that does use it.
  const token = await signServiceToken(env, userId, sessionId, 3600);
  return { verified: true, userId, token };
}

export async function cleanupExpiredOtp(env) {
  await deleteExpiredOtpCodes(env);
  return true;
}
