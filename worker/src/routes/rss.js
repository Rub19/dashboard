import { httpError } from "../middleware/errors.js";

const MAX_SIZE = 768 * 1024;
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

function isBlockedHost(host) {
  return !host || BLOCKED_HOSTS.has(host.toLowerCase());
}

function extractText(tag, content, fallback = "") {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(content);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : fallback;
}

function extractFirst(tag, content) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(content);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseRss(text) {
  const channel = extractText("channel", text, "");
  const feedTitle = extractFirst("title", channel) || extractFirst("title", text);
  const feedDescription = extractFirst("description", channel) || extractFirst("description", text) || "";
  const items = [];
  const matches = [...channel.matchAll(/<item(\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 24);
  for (const match of matches) {
    const content = match[2];
    items.push({
      title: extractFirst("title", content),
      link: extractFirst("link", content),
      description: extractFirst("description", content),
      pubDate: extractFirst("pubDate", content),
    });
  }
  if (!items.length) {
    const entryMatches = [...text.matchAll(/<entry(\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].slice(0, 24);
    for (const match of entryMatches) {
      const content = match[2];
      items.push({
        title: extractFirst("title", content),
        link: extractText("link", content, "").replace(/.*href="([^"]+)".*/, "$1") || extractFirst("link", content),
        description: extractFirst("summary", content) || extractFirst("content", content),
        pubDate: extractFirst("updated", content) || extractFirst("published", content),
      });
    }
  }
  return { title: feedTitle, description: feedDescription, items };
}

export async function rssRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const url = new URL(request.url);
  const feedUrl = String(url.searchParams.get("url") || "").trim();
  if (!feedUrl) throw httpError("INVALID_PARAMETER", 400, { detail: "url" });

  let parsed;
  try {
    parsed = new URL(feedUrl);
  } catch {
    throw httpError("INVALID_PARAMETER", 400, { detail: "url" });
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    throw httpError("INVALID_PARAMETER", 400, { detail: "url" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await (typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch)(parsed.href, {
      method: "GET",
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!response.ok) throw httpError("UPSTREAM_UNAVAILABLE", 502);
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_SIZE) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
    const text = await response.text();
    if (text.length > MAX_SIZE) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
    const data = parseRss(text);
    return { data };
  } catch (error) {
    clearTimeout(timer);
    if (error?.code) throw error;
    if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  }
}
