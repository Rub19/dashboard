import { requestExternal } from "../utils/external-request.js";

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

function toIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function messageDay(message) {
  return message.received_day || toIsoDate(new Date(message.received_at || Date.now()));
}

function messageHour(message) {
  return typeof message.received_hour === "number" ? message.received_hour : new Date(message.received_at || Date.now()).getUTCHours();
}

function allowedFolder(value) {
  const folders = new Set(["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"]);
  return folders.has(value) ? value : null;
}

export async function getMailStats(env, userId, { period = 30, folder } = {}) {
  const days = Math.max(1, Math.min(365, Number(period) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const safeFolder = allowedFolder(folder);

  const parts = [
    `user_id=eq.${encodeURIComponent(userId)}`,
    `received_at=gte.${encodeURIComponent(since.toISOString())}`
  ];
  if (safeFolder) {
    if (safeFolder === "starred") {
      parts.push("is_starred=eq.true", "deleted_at=is.null");
    } else if (safeFolder === "trash") {
      parts.push(`folder=eq.${encodeURIComponent(safeFolder)}`);
    } else {
      parts.push(`folder=eq.${encodeURIComponent(safeFolder)}`, "deleted_at=is.null");
    }
  } else {
    parts.push("deleted_at=is.null");
  }

  const path = `/rest/v1/ethone_mail_messages?${parts.join("&")}&select=*&limit=1000`;
  const response = await supabaseRequest(env, path, { maxBytes: 4 * 1024 * 1024 });
  const rows = Array.isArray(response?.data) ? response.data : [];

  const stats = {
    total: 0,
    inbound: 0,
    outbound: 0,
    read: 0,
    unread: 0,
    starred: 0,
    spam: 0,
    attachments: 0,
    byFolder: {},
    topSenders: [],
    topDays: [],
    topHours: [],
    totalSize: 0,
    averageSize: 0
  };

  const senderCounts = new Map();
  const dayCounts = new Map();
  const hourCounts = new Map();
  for (let h = 0; h < 24; h += 1) hourCounts.set(h, 0);

  let totalSize = 0;

  for (const message of rows) {
    stats.total += 1;
    totalSize += Number(message.message_size) || 0;

    const direction = message.direction;
    if (direction === "inbound") stats.inbound += 1;
    if (direction === "outbound") stats.outbound += 1;

    if (message.is_read) stats.read += 1;
    else stats.unread += 1;

    if (message.is_starred) stats.starred += 1;
    if (message.folder === "spam" || message.is_spam) stats.spam += 1;

    const attachments = message.attachments;
    if (Array.isArray(attachments) && attachments.length > 0) stats.attachments += 1;

    const folderKey = message.folder || "unknown";
    stats.byFolder[folderKey] = (stats.byFolder[folderKey] || 0) + 1;

    if (direction === "inbound" && message.from_address) {
      const key = message.from_address.toLowerCase();
      const existing = senderCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        senderCounts.set(key, {
          email: message.from_address,
          name: message.from_name || message.from_address,
          count: 1
        });
      }
    }

    const day = messageDay(message);
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

    const hour = messageHour(message);
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  stats.totalSize = totalSize;
  stats.averageSize = stats.total > 0 ? Math.round(totalSize / stats.total) : 0;

  stats.topSenders = [...senderCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const allDays = new Set(dayCounts.keys());
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    allDays.add(toIsoDate(d));
  }
  stats.topDays = [...allDays]
    .sort()
    .map((day) => ({ day, count: dayCounts.get(day) || 0 }));

  stats.topHours = [...hourCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour, count }));

  return stats;
}
