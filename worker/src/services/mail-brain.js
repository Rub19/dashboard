import { requestExternal } from "../utils/external-request.js";
import { askGroq } from "../services/groq-client.js";
import { updateMailMessage } from "../services/mail-client.js";

const URGENT_WORDS = ["urgent", "important", "asap", "facture", "paiement", "echeance", "deadline"];
const ALLOWED_FOLDERS = new Set(["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"]);

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
}

function serviceHeaders(secret) {
  const headers = { apikey: secret, "content-type": "application/json" };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = env.SUPABASE_SECRET_KEY;
  return requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(secret), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 8192
  });
}

function firstRow(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function allowedFolder(value) {
  return ALLOWED_FOLDERS.has(value) ? value : "inbox";
}

function contains(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle).toLowerCase());
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mailDomain(email) {
  return String(email || "").split("@")[1] || "";
}

function normalizeMessageId(value) {
  return String(value || "").replace(/[<>\s]/g, "").trim();
}

function buildPrompt(message, maxTotal = 1200) {
  const header = [
    `Objet: ${safeText(message.subject, 200)}`,
    `De: ${safeText(message.from_address, 200)}`,
    `À: ${safeText(Array.isArray(message.to_addresses) ? message.to_addresses.join(", ") : message.to_addresses, 200)}`
  ].join("\n");
  const bodyLimit = Math.max(100, maxTotal - header.length - 20);
  const body = safeText(message.body_text, bodyLimit) || safeText(stripHtml(message.body_html), bodyLimit);
  return `${header}\nCorps:\n${body}`.slice(0, maxTotal);
}

function parseJsonFromAssistant(content) {
  try {
    let text = String(content || "").trim();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) text = match[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function getRules(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_rules?user_id=eq.${userId}&is_active=eq.true&order=priority.desc,created_at.asc`, {
    method: "GET",
    maxBytes: 8192
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export function applyRules(env, userId, message, rules) {
  if (!message || !Array.isArray(rules)) return { ruleIds: [], message };
  const applied = [];
  for (const rule of rules) {
    if (!rule?.is_active) continue;

    if (rule.condition_from && !contains(message.from_address, rule.condition_from) && !contains(message.from_name, rule.condition_from)) continue;
    if (rule.condition_domain) {
      const domain = mailDomain(message.from_address);
      if (!contains(domain, rule.condition_domain) && !contains(message.from_address, rule.condition_domain)) continue;
    }
    if (rule.condition_subject && !contains(message.subject, rule.condition_subject)) continue;
    if (rule.condition_body) {
      const bodyText = message.body_text || stripHtml(message.body_html);
      if (!contains(bodyText, rule.condition_body)) continue;
    }
    if (typeof rule.condition_has_attachments === "boolean") {
      const has = Array.isArray(message.attachments) && message.attachments.length > 0;
      if (has !== rule.condition_has_attachments) continue;
    }

    if (rule.action_mark_read) message.is_read = true;
    if (rule.action_mark_important) message.is_important = true;
    if (rule.action_mark_spam) {
      message.is_spam = true;
      if (!rule.action_archive && !rule.action_move_to) message.folder = "spam";
    }
    if (rule.action_archive) message.folder = "archive";
    if (rule.action_move_to) message.folder = allowedFolder(rule.action_move_to);
    if (rule.action_label) {
      const labels = new Set(Array.isArray(message.labels) ? message.labels : []);
      labels.add(safeText(rule.action_label, 40));
      message.labels = Array.from(labels);
    }
    applied.push(rule.id);
  }
  return { ruleIds: applied, message };
}

async function isDirectReply(env, userId, inReplyTo) {
  if (!inReplyTo) return false;
  const clean = normalizeMessageId(inReplyTo);
  if (!clean) return false;
  const refs = [inReplyTo, `<${clean}>`].filter((v, i, a) => a.indexOf(v) === i);
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${userId}&headers->>%27Message-ID%27=in.(${refs.map(encodeURIComponent).join(",")})&direction=eq.outbound&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 2048
  });
  return !!firstRow(response);
}

async function contactFrequency(env, userId, fromAddress) {
  const email = safeEmail(fromAddress);
  if (!email) return 0;
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_contacts?user_id=eq.${userId}&email=ilike.${encodeURIComponent(email)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 2048
  });
  return firstRow(response)?.frequency || 0;
}

function extractInReplyTo(message) {
  return message.in_reply_to || message.headers?.["in-reply-to"] || message.headers?.["In-Reply-To"] || null;
}

export async function detectImportance(env, userId, message) {
  if (!message) return false;

  const subject = safeText(message.subject, 30).toLowerCase();
  const body = safeText(message.body_text || stripHtml(message.body_html), 30).toLowerCase();
  const haystack = `${subject} ${body}`;
  if (URGENT_WORDS.some((word) => haystack.includes(word))) {
    message.is_important = true;
    return true;
  }

  const frequency = await contactFrequency(env, userId, message.from_address);
  if (frequency >= 5) {
    message.is_important = true;
    return true;
  }

  const inReplyTo = extractInReplyTo(message);
  if (await isDirectReply(env, userId, inReplyTo)) {
    message.is_important = true;
    return true;
  }

  return false;
}

export async function createNotification(env, userId, message, ruleId = null) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !message?.id) return null;
  const payload = {
    user_id: userId,
    message_id: message.id,
    title: `Nouveau message : ${safeText(message.subject, 200)}`,
    body: `De : ${safeText(message.from_address || message.from, 200)}`,
    is_read: false
  };
  if (ruleId && typeof ruleId === "string") payload.rule_id = ruleId;
  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_notifications", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: payload,
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function getNotifications(env, userId, { limit = 20, unreadOnly = false } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const safeLimit = Math.min(100, Math.max(1, limit));
  let path = `/rest/v1/ethone_mail_notifications?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`;
  if (unreadOnly) path += "&is_read=eq.false";
  const response = await supabaseRequest(env, path, {
    method: "GET",
    maxBytes: 8192
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function markNotificationRead(env, userId, id, isRead = true) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return false;
  await supabaseRequest(env, `/rest/v1/ethone_mail_notifications?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: { is_read: isRead === true },
    maxBytes: 2048
  });
  return true;
}

export async function getMailMessage(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return null;
  const select = "id,user_id,subject,from_address,from_name,to_addresses,body_text,body_html,labels,folder,is_read,is_important,is_spam,attachments,headers,brain_summary,brain_suggested_replies,extracted_tasks,extracted_events,analyzed_at";
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${userId}&select=${encodeURIComponent(select)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 65536
  });
  return firstRow(response);
}

function sanitizeAnalysis(parsed) {
  const suggested = (Array.isArray(parsed?.suggested_replies) ? parsed.suggested_replies : [])
    .map((r) => safeText(r, 160))
    .filter(Boolean)
    .slice(0, 3);
  const tasks = (Array.isArray(parsed?.tasks) ? parsed.tasks : [])
    .map((t) => {
      const title = safeText(t?.title, 200);
      if (!title) return null;
      const due = t?.due ? safeText(t.due, 80) : null;
      return due ? { title, due } : { title };
    })
    .filter(Boolean)
    .slice(0, 20);
  const events = (Array.isArray(parsed?.events) ? parsed.events : [])
    .map((e) => {
      const title = safeText(e?.title, 200);
      if (!title) return null;
      const date = e?.date ? safeText(e.date, 80) : null;
      return date ? { title, date } : { title };
    })
    .filter(Boolean)
    .slice(0, 20);
  return {
    summary: safeText(parsed?.summary, 280),
    suggested_replies: suggested,
    tasks,
    events
  };
}

export async function analyzeMessage(env, userId, message) {
  const defaultResult = { summary: "", suggested_replies: [], tasks: [], events: [] };
  if (!message || !userId) return defaultResult;

  const systemInstruction = "Analyse l'email suivant et réponds UNIQUEMENT par un objet JSON avec les clés : summary (max 280 caractères), suggested_replies (tableau de 3 réponses courtes en français), tasks (tableau d'objets {title, due?}), events (tableau d'objets {title, date?}).";
  const prompt = `${systemInstruction}\n\n${buildPrompt(message)}`;

  let parsed;
  try {
    const { content } = await askGroq(env, { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], context: {} });
    parsed = parseJsonFromAssistant(content);
  } catch {
    return defaultResult;
  }

  if (!parsed) return defaultResult;
  const result = sanitizeAnalysis(parsed);

  if (message.id) {
    const patch = {
      brain_summary: result.summary,
      brain_suggested_replies: result.suggested_replies,
      extracted_tasks: result.tasks,
      extracted_events: result.events,
      analyzed_at: new Date().toISOString()
    };
    try {
      await updateMailMessage(env, message.id, userId, patch);
    } catch {
      // Analysis result is still returned even if the cache update fails.
    }
  }

  return result;
}

export async function suggestReplies(env, userId, message) {
  if (!message || !userId) return [];
  const prompt = `Suggère 3 réponses courtes en français à l'email suivant. Réponds UNIQUEMENT par un objet JSON {"suggested_replies": [...]}.\n\n${buildPrompt(message)}`;
  try {
    const { content } = await askGroq(env, { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], context: {} });
    const parsed = parseJsonFromAssistant(content);
    return (Array.isArray(parsed?.suggested_replies) ? parsed.suggested_replies : [])
      .map((r) => safeText(r, 160))
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function extractEntities(env, userId, message) {
  if (!message || !userId) return { tasks: [], events: [] };
  const prompt = `Extrais les tâches et événements de l'email suivant. Réponds UNIQUEMENT par un objet JSON {"tasks": [{"title", "due?"}], "events": [{"title", "date?"}]}.\n\n${buildPrompt(message)}`;
  try {
    const { content } = await askGroq(env, { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], context: {} });
    const parsed = parseJsonFromAssistant(content) || {};
    const tasks = (Array.isArray(parsed?.tasks) ? parsed.tasks : [])
      .map((t) => {
        const title = safeText(t?.title, 200);
        if (!title) return null;
        const due = t?.due ? safeText(t.due, 80) : null;
        return due ? { title, due } : { title };
      })
      .filter(Boolean)
      .slice(0, 20);
    const events = (Array.isArray(parsed?.events) ? parsed.events : [])
      .map((e) => {
        const title = safeText(e?.title, 200);
        if (!title) return null;
        const date = e?.date ? safeText(e.date, 80) : null;
        return date ? { title, date } : { title };
      })
      .filter(Boolean)
      .slice(0, 20);
    return { tasks, events };
  } catch {
    return { tasks: [], events: [] };
  }
}
