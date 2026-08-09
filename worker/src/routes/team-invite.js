import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";

function safeText(value, limit = 240) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export async function teamInviteRoute(request, env) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  const body = await request.json().catch(() => ({}));
  const email = safeEmail(body.email);
  const displayName = safeText(body.display_name || body.displayName, 80);
  const inviteUrl = safeText(body.invite_url || body.inviteUrl, 2048);
  const token = safeText(body.token, 128);

  if (!email) throw httpError("INVALID_PARAMETER", 400, { detail: "email" });
  if (!token) throw httpError("INVALID_PARAMETER", 400, { detail: "token" });

  const resendKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM || env.SMTP_FROM || "";

  if (!resendKey || !from) {
    return { data: { sent: false, email, invite_url: inviteUrl, token, message: "Service d'e-mail non configuré." } };
  }

  const subject = "Invitation à rejoindre ETHONE";
  const name = displayName || "collègue";
  const html = `<p>Bonjour ${name},</p>
<p>Vous êtes invité à rejoindre une équipe sur ETHONE.</p>
<p><a href="${inviteUrl}" style="padding:10px 16px;background:#7be5c3;color:#07110e;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Rejoindre l'équipe</a></p>
<p>Si le bouton ne fonctionne pas, copiez ce lien : ${inviteUrl}</p>
<p>Ce lien est personnel. Ne le partagez pas.</p>
<p>— ETHONE</p>`;

  const text = `Bonjour ${name},\n\nVous êtes invité à rejoindre une équipe sur ETHONE.\n\nLien : ${inviteUrl}\n\nCe lien est personnel.\n— ETHONE`;

  try {
    const result = await requestExternal("https://api.resend.com/emails", {
      env,
      method: "POST",
      expectedOrigin: "https://api.resend.com",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: email,
        subject,
        text,
        html
      }),
      timeoutMs: 12000
    });
    return { data: { sent: true, id: result?.data?.id, email, invite_url: inviteUrl, token } };
  } catch (error) {
    return { ok: false, status: "failed", message: error?.message || "Échec de l'envoi d'e-mail.", data: { sent: false, email, invite_url: inviteUrl, token } };
  }
}
