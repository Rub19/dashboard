import { requestExternal } from "../utils/external-request.js";
import { sendMailViaResend } from "./mail-client.js";

/**
 * Surveillance du bot Etho : un bot arrêté ne peut pas prévenir lui-même, donc le worker interroge /api/health toutes
 * les 5 minutes. Après 2 échecs d'affilée (≈ 10 min), un mail part vers SUPPORT_FORWARD_TO ; un second annonce le retour.
 * L'état est gardé dans le KV (clé « monitor:bot ») pour n'envoyer qu'un mail par panne.
 */
const KEY = "monitor:bot";
const FAILS_BEFORE_ALERT = 2;

export async function probeBot(env) {
  const origin = env.DISCORD_BOT_ORIGIN;
  if (!origin) return { ok: false, reason: "DISCORD_BOT_ORIGIN absent" };
  try {
    const { data } = await requestExternal(`${origin}/api/health`, { env, expectedOrigin: origin, timeoutMs: 8000, maxBytes: 4096 });
    if (data?.botOnline === true) return { ok: true };
    return { ok: false, reason: "API joignable mais bot déconnecté de Discord" };
  } catch (error) {
    return { ok: false, reason: `API injoignable (${String(error?.message || error).slice(0, 120)})` };
  }
}

/** Décide de l'action à partir de l'état précédent (pure, testée). */
export function nextMonitorState(prev, probe, now) {
  const state = { fails: 0, alerted: false, since: null, ...(prev || {}) };
  if (probe.ok) {
    const recovered = state.alerted;
    return { state: { fails: 0, alerted: false, since: null }, send: recovered ? "recovered" : null, downSince: state.since };
  }
  const fails = state.fails + 1;
  const since = state.since || now;
  const alert = !state.alerted && fails >= FAILS_BEFORE_ALERT;
  return { state: { fails, alerted: state.alerted || alert, since, reason: probe.reason }, send: alert ? "down" : null, downSince: since };
}

export async function checkBotHealth(env, now = new Date().toISOString()) {
  const kv = env.GAME_OVERRIDES;
  if (!kv) return;
  const prev = await kv.get(KEY, "json").catch(() => null);
  const probe = await probeBot(env);
  const { state, send, downSince } = nextMonitorState(prev, probe, now);
  await kv.put(KEY, JSON.stringify(state));
  if (!send || !env.SUPPORT_FORWARD_TO) return;
  const from = env.RESEND_FROM || env.SUPPORT_ADDRESS;
  const subject = send === "down" ? "⚠️ Etho est hors ligne" : "✅ Etho est de retour en ligne";
  const text =
    send === "down"
      ? `Le bot Etho ne répond plus depuis ${downSince}.\nCause : ${probe.reason}\n\nÀ vérifier sur le VPS : pm2 status ethone-bot / pm2 logs ethone-bot.`
      : `Le bot Etho répond de nouveau (panne commencée le ${downSince}).`;
  await sendMailViaResend(env, { from, to: env.SUPPORT_FORWARD_TO, subject, text }).catch((error) => {
    if (env.ENVIRONMENT !== "production") console.error("Bot monitor mail error:", error);
  });
}
