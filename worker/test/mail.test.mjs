import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";
import { invoke, payload, testEnv, USER_ID } from "./helpers.mjs";

// Mail routes access request.url.searchParams, but in Node Request.url is a string.
// Patch it to return a URL object so the existing route handlers work unchanged.
const originalRequestUrl = Object.getOwnPropertyDescriptor(Request.prototype, "url").get;
Object.defineProperty(Request.prototype, "url", {
  get() {
    return new URL(originalRequestUrl.call(this));
  },
  configurable: true
});

const SUPABASE_URL = "https://project-ref.supabase.co";

function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function getCell(row, column) {
  const m = column.match(/^headers->>'(.+)'$/);
  if (m) {
    const key = m[1];
    return row.headers?.[key] ?? row.headers?.[key.toLowerCase()] ?? null;
  }
  return row[column];
}

function parseIlike(pattern) {
  let p = String(pattern).trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  const reText = p
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${reText}$`, "i");
}

function compareValue(cell, rawValue, op, negate = false) {
  const value = String(rawValue);
  let result = false;

  if (op === "eq") {
    if (value === "null") result = cell == null;
    else if (value === "true") result = cell === true;
    else if (value === "false") result = cell === false;
    else result = String(cell) === value;
  } else if (op === "neq") {
    result = String(cell) !== value;
  } else if (op === "is") {
    if (value === "null") result = cell == null;
    else if (value === "true") result = cell === true;
    else if (value === "false") result = cell === false;
    else result = String(cell).toLowerCase() === value.toLowerCase();
  } else if (op === "ilike") {
    if (cell != null) {
      try {
        result = parseIlike(value).test(String(cell));
      } catch {
        result = false;
      }
    }
  } else if (op === "in") {
    let list = value;
    if (typeof list === "string") {
      if (list.startsWith("(") && list.endsWith(")")) list = list.slice(1, -1);
      list = list.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(list)) list = [list];
    result = list.includes(String(cell));
  } else if (op === "cs") {
    let list = value;
    if (typeof list === "string") {
      if (list.startsWith("{") && list.endsWith("}")) list = list.slice(1, -1);
      list = list.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(list)) list = [list];
    const arr = Array.isArray(cell) ? cell : [cell];
    result = list.every((item) => arr.includes(item));
  } else if (["gt", "gte", "lt", "lte"].includes(op)) {
    const parse = (v) => {
      if (!Number.isNaN(Number(v)) && v !== "") return Number(v);
      const d = Date.parse(v);
      if (!Number.isNaN(d)) return d;
      return Number.NaN;
    };
    const a = parse(cell);
    const b = parse(value);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (op === "gt") result = a > b;
      if (op === "gte") result = a >= b;
      if (op === "lt") result = a < b;
      if (op === "lte") result = a <= b;
    }
  }

  return negate ? !result : result;
}

function evalCondition(row, condition) {
  const parts = condition.split(".");
  let col = parts[0];
  let op = parts[1];
  let negate = false;
  let opOffset = 1;
  if (op === "not" && parts[2]) {
    negate = true;
    op = parts[2];
    opOffset = 2;
  }
  const value = parts.slice(opOffset + 1).join(".");
  return compareValue(getCell(row, col), value, op, negate);
}

function filterRows(rows, url) {
  const params = url.searchParams;
  const normal = [];
  let orCondition = null;

  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (key === "or") {
      orCondition = value;
      continue;
    }
    if (!value) continue;
    const column = key;
    const parts = value.split(".");
    let op = parts[0];
    let negate = false;
    let opOffset = 0;
    if (op === "not" && parts[1]) {
      negate = true;
      op = parts[1];
      opOffset = 1;
    }
    const rawValue = parts.slice(opOffset + 1).join(".");
    normal.push({ column, op, value: rawValue, negate });
  }

  return rows.filter((row) => {
    const allNormal = normal.every(({ column, op, value, negate }) =>
      compareValue(getCell(row, column), value, op, negate)
    );
    if (!allNormal) return false;
    if (!orCondition) return true;
    let inner = orCondition.trim();
    if (inner.startsWith("(") && inner.endsWith(")")) inner = inner.slice(1, -1);
    const conditions = inner.split(",");
    return conditions.some((cond) => evalCondition(row, cond));
  });
}

function sortRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [col, dir] = part.trim().split(".");
    return { col, dir: dir === "desc" ? -1 : 1 };
  });

  return rows.slice().sort((a, b) => {
    for (const { col, dir } of keys) {
      let av = a[col];
      let bv = b[col];
      if (av == null && bv == null) continue;
      if (av == null) return dir;
      if (bv == null) return -dir;

      if (typeof av === "boolean") av = av ? 1 : 0;
      if (typeof bv === "boolean") bv = bv ? 1 : 0;

      const da = Date.parse(av);
      const db = Date.parse(bv);
      if (!Number.isNaN(da) && !Number.isNaN(db)) {
        if (da !== db) return da < db ? -dir : dir;
      } else if (!Number.isNaN(Number(av)) && !Number.isNaN(Number(bv))) {
        const na = Number(av);
        const nb = Number(bv);
        if (na !== nb) return na < nb ? -dir : dir;
      } else {
        const sa = String(av);
        const sb = String(bv);
        if (sa !== sb) return sa < sb ? -dir : dir;
      }
    }
    return 0;
  });
}

function applySelect(rows, select) {
  if (!select || select === "*") return rows;
  const cols = select.split(",").map((c) => c.trim()).filter(Boolean);
  return rows.map((r) => {
    const out = {};
    for (const c of cols) if (c in r) out[c] = r[c];
    if (!("id" in out) && "id" in r) out.id = r.id;
    return out;
  });
}

function handleSupabase(state, table, url, init) {
  if (!state[table]) state[table] = [];
  const rows = state[table];
  const method = (init?.method || "GET").toUpperCase();
  const params = url.searchParams;
  const prefer = String(init?.headers?.["Prefer"] || "");
  const accept = String(init?.headers?.["Accept"] || "");
  const select = params.get("select");

  if (method === "GET") {
    let matches = filterRows(rows, url);
    if (select === "count") {
      return responseJson([{ count: matches.length }]);
    }
    matches = sortRows(matches, params.get("order"));
    const limit = Number(params.get("limit"));
    const offset = Number(params.get("offset")) || 0;
    if (Number.isFinite(limit) && limit > 0) matches = matches.slice(offset, offset + limit);
    matches = applySelect(matches, select);
    if (accept.includes("vnd.pgrst.object+json")) {
      return responseJson(matches[0] ?? null);
    }
    return responseJson(matches);
  }

  if (method === "POST") {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : (init?.body || {});
    const row = { ...body };
    if (!row.id) row.id = crypto.randomUUID();
    if (!row.created_at) row.created_at = new Date().toISOString();
    state[table].push(row);
    if (prefer.includes("return=representation")) {
      return responseJson(applySelect([row], select), 201);
    }
    return new Response(null, { status: 204 });
  }

  if (method === "PATCH") {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : (init?.body || {});
    const matches = filterRows(rows, url);
    for (const row of matches) {
      Object.assign(row, body, { updated_at: new Date().toISOString() });
    }
    if (prefer.includes("return=representation")) {
      return responseJson(applySelect(matches, select));
    }
    return new Response(null, { status: 204 });
  }

  if (method === "DELETE") {
    const matches = filterRows(rows, url);
    for (const row of matches) {
      const idx = state[table].indexOf(row);
      if (idx !== -1) state[table].splice(idx, 1);
    }
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 405 });
}

function createMailFetch(state) {
  return async (input, init) => {
    const url = new URL(String(input));

    if (url.hostname === "api.resend.com" && url.pathname === "/emails") {
      state.resendCalls = state.resendCalls || [];
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : (init?.body || {});
      state.resendCalls.push(body);
      return responseJson({ id: "resend-test-id" });
    }

    if (url.hostname === "api.groq.com" && url.pathname === "/openai/v1/chat/completions") {
      state.groqCalls = state.groqCalls || [];
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : (init?.body || {});
      state.groqCalls.push(body);
      const reply = JSON.stringify({
        summary: "Récapitulatif de test.",
        suggested_replies: ["D'accord, merci.", "Je regarde cela.", "Parfait."],
        tasks: [{ title: "Tâche urgente", due: "2026-08-01" }],
        events: [{ title: "Réunion", date: "2026-08-02" }]
      });
      return responseJson({ choices: [{ message: { role: "assistant", content: `\`\`\`json\n${reply}\n\`\`\`` } }] });
    }

    if (url.origin === SUPABASE_URL && url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.split("/")[3];
      return handleSupabase(state, table, url, init);
    }

    throw new Error(`Unexpected test destination: ${url.href}`);
  };
}

function makeEnv(state = {}) {
  return testEnv({
    ENVIRONMENT: "test",
    __TEST_FETCH__: createMailFetch(state),
    RESEND_API_KEY: "test-resend-key"
  });
}

function seedAlias(state, overrides = {}) {
  state["ethone_mail_aliases"] = state["ethone_mail_aliases"] || [];
  state["ethone_mail_aliases"].push({
    id: "alias-1",
    user_id: USER_ID,
    alias: "user@ethone.dev",
    display_name: "ETHONE QA",
    is_primary: true,
    created_at: new Date().toISOString(),
    ...overrides
  });
}

const DEFAULT_MESSAGE = {
  user_id: USER_ID,
  alias_id: "alias-1",
  thread_id: null,
  direction: "inbound",
  folder: "inbox",
  status: "received",
  from_address: "test@example.com",
  from_name: "Test Sender",
  to_addresses: ["user@ethone.dev"],
  cc_addresses: [],
  bcc_addresses: [],
  reply_to: null,
  subject: "hello world",
  body_text: "This is a test message.",
  body_html: "<p>This is a test message.</p>",
  headers: {},
  is_read: false,
  is_starred: false,
  is_important: false,
  is_spam: false,
  labels: [],
  attachments: [],
  raw_size: 100,
  message_size: 100,
  source_ip: "",
  auth_results: { spf: "none", dkim: "none", dmarc: "none" },
  deleted_at: null,
  snoozed_until: null,
  received_at: new Date().toISOString(),
  created_at: new Date().toISOString()
};

function seedMessage(state, overrides = {}) {
  state["ethone_mail_messages"] = state["ethone_mail_messages"] || [];
  const id = overrides.id || `msg-${state["ethone_mail_messages"].length + 1}`;
  state["ethone_mail_messages"].push({
    ...DEFAULT_MESSAGE,
    id,
    ...overrides
  });
}

function jsonHeaders() {
  return { "content-type": "application/json" };
}

test("mail.send requires authentication and valid body", async () => {
  const state = {};
  const env = makeEnv(state);

  const unauth = await invoke("/api/mail/send", {
    method: "POST",
    env,
    auth: false,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["to@example.com"], subject: "Hello", text: "Body" })
  });
  assert.equal(unauth.status, 401);
  assert.equal((await payload(unauth)).ok, false);

  const invalid = await invoke("/api/mail/send", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({})
  });
  assert.equal(invalid.status, 400);
  assert.equal((await payload(invalid)).ok, false);

  const ok = await invoke("/api/mail/send", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["to@example.com"], subject: "Hello", text: "Body" })
  });
  assert.equal(ok.status, 200);
  const body = await payload(ok);
  assert.equal(body.ok, true);
  assert.equal(body.data.sent, true);
  assert.equal(body.data.id, "resend-test-id");
  assert.equal(body.data.from, "user@ethone.dev");
  assert.deepEqual(body.data.to, ["to@example.com"]);
  assert.ok(Array.isArray(state.resendCalls));
  assert.equal(state.resendCalls.length, 1);
  assert.deepEqual(state.resendCalls[0].to, ["to@example.com"]);
});

test("mail.inbox returns messages", async () => {
  const state = {};
  const env = makeEnv(state);
  seedAlias(state);
  seedMessage(state, { folder: "inbox" });

  const res = await invoke("/api/mail/inbox?folder=inbox", { env });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].subject, "hello world");
});

test("mail.search with filters returns messages and meta.total", async () => {
  const state = {};
  const env = makeEnv(state);
  seedAlias(state);
  seedMessage(state, { from_address: "test@example.com", from_name: "Test", subject: "hello world" });
  seedMessage(state, { from_address: "other@example.com", from_name: "Other", subject: "goodbye" });

  const res = await invoke("/api/mail/search?from=test&subject=hello", { env });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].from_address, "test@example.com");
  assert.equal(body.meta.total, 1);
});

test("mail.drafts save and list", async () => {
  const state = {};
  const env = makeEnv(state);
  seedAlias(state);

  const save = await invoke("/api/mail/drafts", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["a@example.com"], subject: "Draft", text: "Draft body" })
  });
  assert.equal(save.status, 200);
  const saved = await payload(save);
  assert.equal(saved.ok, true);
  assert.equal(saved.data.saved, true);
  assert.ok(saved.data.id);

  const list = await invoke("/api/mail/drafts", { env });
  assert.equal(list.status, 200);
  const listed = await payload(list);
  assert.equal(listed.ok, true);
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].subject, "Draft");
});

test("mail.move moves a message", async () => {
  const state = {};
  const env = makeEnv(state);
  seedMessage(state, { id: "msg-1", folder: "inbox" });

  const res = await invoke("/api/mail/move", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ ids: ["msg-1"], folder: "archive" })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.data.moved, 1);
  const msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.equal(msg.folder, "archive");
});

test("mail.labels CRUD", async () => {
  const state = {};
  const env = makeEnv(state);
  seedMessage(state, { id: "msg-1", labels: [] });

  const listRes = await invoke("/api/mail/labels", { env });
  assert.equal(listRes.status, 200);
  const listed = await payload(listRes);
  assert.deepEqual(listed.data, []);

  const createRes = await invoke("/api/mail/labels", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ name: "Work", color: "#ff0000" })
  });
  assert.equal(createRes.status, 200);
  const created = await payload(createRes);
  const label = created.data;
  assert.equal(label.name, "Work");

  const assignRes = await invoke("/api/mail/labels", {
    method: "PATCH",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ ids: ["msg-1"], label: "Work" })
  });
  assert.equal(assignRes.status, 200);
  const assigned = await payload(assignRes);
  assert.equal(assigned.data.updated, 1);
  const msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.deepEqual(msg.labels, ["Work"]);

  const deleteRes = await invoke("/api/mail/labels", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: label.id })
  });
  assert.equal(deleteRes.status, 200);
  const deleted = await payload(deleteRes);
  assert.equal(deleted.data.deleted, true);
  assert.equal(state["ethone_mail_labels"].length, 0);
});

test("mail.rules CRUD", async () => {
  const state = {};
  const env = makeEnv(state);

  const listRes = await invoke("/api/mail/rules", { env });
  assert.equal(listRes.status, 200);
  const listed = await payload(listRes);
  assert.deepEqual(listed.data, []);

  const createRes = await invoke("/api/mail/rules", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ name: "Invoice rule", condition_subject: "invoice", action_mark_important: true, priority: 10 })
  });
  assert.equal(createRes.status, 200);
  const created = await payload(createRes);
  const rule = created.data;
  assert.equal(rule.name, "Invoice rule");

  const patchRes = await invoke("/api/mail/rules", {
    method: "PATCH",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: rule.id, name: "Invoice rule updated", priority: 5 })
  });
  assert.equal(patchRes.status, 200);
  const patched = await payload(patchRes);
  assert.equal(patched.data.name, "Invoice rule updated");
  assert.equal(patched.data.priority, 5);

  const deleteRes = await invoke("/api/mail/rules", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: rule.id })
  });
  assert.equal(deleteRes.status, 200);
  const deleted = await payload(deleteRes);
  assert.equal(deleted.data.deleted, true);
  assert.equal(state["ethone_mail_rules"].length, 0);
});

test("mail.templates CRUD", async () => {
  const state = {};
  const env = makeEnv(state);

  const listRes = await invoke("/api/mail/templates", { env });
  assert.equal(listRes.status, 200);
  const listed = await payload(listRes);
  assert.deepEqual(listed.data, []);

  const createRes = await invoke("/api/mail/templates", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ name: "T1", subject: "Hello", content: "Content" })
  });
  assert.equal(createRes.status, 200);
  const created = await payload(createRes);
  const tpl = created.data;
  assert.equal(tpl.name, "T1");

  const patchRes = await invoke("/api/mail/templates", {
    method: "PATCH",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: tpl.id, name: "T1 updated", content: "Updated content" })
  });
  assert.equal(patchRes.status, 200);
  const patched = await payload(patchRes);
  assert.equal(patched.data.name, "T1 updated");

  const deleteRes = await invoke("/api/mail/templates", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: tpl.id })
  });
  assert.equal(deleteRes.status, 200);
  const deleted = await payload(deleteRes);
  assert.equal(deleted.data.deleted, true);
  assert.equal(state["ethone_mail_templates"].length, 0);
});

test("mail.signatures CRUD", async () => {
  const state = {};
  const env = makeEnv(state);

  const listRes = await invoke("/api/mail/signatures", { env });
  assert.equal(listRes.status, 200);
  const listed = await payload(listRes);
  assert.deepEqual(listed.data, []);

  const createRes = await invoke("/api/mail/signatures", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ name: "Sig1", content: "Best regards", is_default: false })
  });
  assert.equal(createRes.status, 200);
  const created = await payload(createRes);
  const sig = created.data;
  assert.equal(sig.name, "Sig1");

  const deleteRes = await invoke("/api/mail/signatures", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: sig.id })
  });
  assert.equal(deleteRes.status, 200);
  const deleted = await payload(deleteRes);
  assert.equal(deleted.data.deleted, true);
  assert.equal(state["ethone_mail_signatures"].length, 0);
});

test("mail.snooze sets snoozed_until", async () => {
  const state = {};
  const env = makeEnv(state);
  const until = new Date(Date.now() + 86400000).toISOString();
  seedMessage(state, { id: "msg-1" });

  const res = await invoke("/api/mail/snooze", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: "msg-1", snoozed_until: until })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.data.snoozed, true);
  const msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.equal(msg.snoozed_until, until);
});

test("mail.bulk performs actions", async () => {
  const state = {};
  const env = makeEnv(state);
  seedMessage(state, { id: "msg-1", folder: "inbox", is_read: false });

  const moveRes = await invoke("/api/mail/bulk", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ ids: ["msg-1"], action: "move", target: "archive" })
  });
  const moveBody = await payload(moveRes);
  assert.equal(moveBody.data.updated, 1);
  let msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.equal(msg.folder, "archive");

  const readRes = await invoke("/api/mail/bulk", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ ids: ["msg-1"], action: "read" })
  });
  const readBody = await payload(readRes);
  assert.equal(readBody.data.updated, 1);
  msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.equal(msg.is_read, true);
});

test("mail.schedule creates a scheduled draft", async () => {
  const state = {};
  const env = makeEnv(state);
  seedAlias(state);
  const when = new Date(Date.now() + 3600000).toISOString();

  const res = await invoke("/api/mail/schedule", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["to@example.com"], subject: "Future", text: "Later", scheduled_at: when })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.data.scheduled, true);
  assert.ok(body.data.id);
  const msg = state["ethone_mail_messages"].find((m) => m.id === body.data.id);
  assert.equal(msg.status, "scheduled");
  assert.equal(msg.scheduled_at, when);
});

test("mail.analytics returns stats", async () => {
  const state = {};
  const env = makeEnv(state);
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  seedMessage(state, { id: "msg-1", received_at: now, folder: "inbox" });
  seedMessage(state, { id: "msg-2", received_at: now, folder: "inbox", is_read: true, attachments: [{ filename: "x" }] });
  seedMessage(state, { id: "msg-3", received_at: old, folder: "inbox" });

  const res = await invoke("/api/mail/analytics?period=7", { env });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.ok, true);
  assert.equal(body.data.total, 2);
  assert.equal(body.data.inbound, 2);
  assert.equal(body.data.read, 1);
  assert.equal(body.data.unread, 1);
  assert.equal(body.data.attachments, 1);
  assert.ok(Array.isArray(body.data.topSenders));
  assert.ok(Array.isArray(body.data.topDays));
  assert.ok(Array.isArray(body.data.topHours));
});

test("mail.blocked and trusted senders CRUD", async () => {
  const state = {};
  const env = makeEnv(state);

  let res = await invoke("/api/mail/blocked", { env });
  assert.equal(res.status, 200);
  let body = await payload(res);
  assert.deepEqual(body.data, []);

  res = await invoke("/api/mail/blocked", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ email: "spam@blocked.com", reason: "spam" })
  });
  assert.equal(res.status, 200);
  body = await payload(res);
  const blocked = body.data;
  assert.equal(blocked.email, "spam@blocked.com");

  res = await invoke("/api/mail/blocked", { env });
  body = await payload(res);
  assert.equal(body.data.length, 1);

  res = await invoke("/api/mail/blocked", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: blocked.id })
  });
  body = await payload(res);
  assert.equal(body.data.deleted, true);

  res = await invoke("/api/mail/trusted", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ email: "friend@trusted.com" })
  });
  body = await payload(res);
  const trusted = body.data;
  assert.equal(trusted.email, "friend@trusted.com");

  res = await invoke("/api/mail/trusted", {
    method: "DELETE",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: trusted.id })
  });
  body = await payload(res);
  assert.equal(body.data.deleted, true);
});

test("receiving a blocked sender marks message as trash/spam", async () => {
  const state = {};
  const env = makeEnv(state);
  seedAlias(state, { alias: "user@ethone.dev" });
  state["ethone_mail_blocked_senders"] = [{
    id: "blk-1",
    user_id: USER_ID,
    email: "spam@blocked.com",
    domain: "blocked.com",
    reason: "spam",
    created_at: new Date().toISOString()
  }];

  const headers = new Map([
    ["subject", "Promo"],
    ["from", "Spammer <spam@blocked.com>"],
    ["message-id", "<abc-123>"]
  ]);
  const message = {
    to: "user@ethone.dev",
    from: "spam@blocked.com",
    headers: {
      get(name) { return headers.get(name.toLowerCase()) || null; },
      entries() { return headers.entries(); }
    },
    text: async () => "Buy now",
    html: async () => "<p>Buy now</p>",
    attachments: [],
    rawSize: 456
  };

  await worker.email(message, env, { waitUntil() {} });
  const stored = state["ethone_mail_messages"];
  assert.equal(stored.length, 1);
  assert.equal(stored[0].folder, "trash");
  assert.equal(stored[0].is_spam, true);
  assert.equal(stored[0].from_address, "spam@blocked.com");
});

test("mail.analyze calls Groq and returns summary/suggestions/extracted", async () => {
  const state = {};
  const env = makeEnv(state);
  seedMessage(state, {
    id: "msg-1",
    from_address: "test@example.com",
    to_addresses: ["user@ethone.dev"],
    subject: "Réunion importante",
    body_text: "Nous devons nous retrouver demain."
  });

  const res = await invoke("/api/mail/analyze", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ id: "msg-1" })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.equal(body.ok, true);
  assert.equal(typeof body.data.summary, "string");
  assert.ok(body.data.summary.length > 0);
  assert.ok(Array.isArray(body.data.suggested_replies));
  assert.ok(body.data.suggested_replies.length > 0);
  assert.ok(Array.isArray(body.data.tasks));
  assert.ok(Array.isArray(body.data.events));
  const msg = state["ethone_mail_messages"].find((m) => m.id === "msg-1");
  assert.equal(msg.brain_summary, body.data.summary);
  assert.ok(Array.isArray(state.groqCalls));
  assert.equal(state.groqCalls.length, 1);
});

test("mail.alias creates, lists and rejects duplicate custom aliases", async () => {
  const state = {};
  const env = makeEnv(state);

  const listRes = await invoke("/api/mail/alias", { env });
  assert.equal(listRes.status, 200);
  const listBody = await payload(listRes);
  assert.deepEqual(listBody.data, []);

  const createRes = await invoke("/api/mail/alias", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ alias: "custom", display_name: "Custom QA" })
  });
  assert.equal(createRes.status, 200);
  const created = await payload(createRes);
  assert.equal(created.data.alias, "custom@ethone.dev");
  assert.equal(created.data.is_primary, true);

  const dupRes = await invoke("/api/mail/alias", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ alias: "custom@ethone.dev" })
  });
  assert.equal(dupRes.status, 400);

  const listRes2 = await invoke("/api/mail/alias", { env });
  const listBody2 = await payload(listRes2);
  assert.equal(listBody2.data.length, 1);
});

test("mail.alias generates a random alias", async () => {
  const state = {};
  const env = makeEnv(state);

  const res = await invoke("/api/mail/alias", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ random: true })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.ok(/^u-[a-z0-9]{8}@ethone\.dev$/.test(body.data.alias));
  assert.equal(body.data.is_primary, true);
});

test("mail.send uses requested alias_id", async () => {
  const state = {};
  const env = makeEnv(state);
  state["ethone_mail_aliases"] = [
    { id: "alias-primary", user_id: USER_ID, alias: "user@ethone.dev", display_name: "Primary", is_primary: true, created_at: new Date().toISOString() },
    { id: "alias-other", user_id: USER_ID, alias: "other@ethone.dev", display_name: "Other", is_primary: false, created_at: new Date().toISOString() }
  ];

  const res = await invoke("/api/mail/send", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["to@example.com"], subject: "Hello", text: "Body", alias_id: "alias-other" })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.ok(body.data.sent);
  assert.ok(state.resendCalls[0].from.includes("other@ethone.dev"));
});

test("mail.send falls back to a unique primary alias when the base is taken by another user", async () => {
  const state = {};
  const env = makeEnv(state);
  const otherUser = "9e64d0a1-1111-2222-3333-000000000000";
  state["ethone_mail_aliases"] = [
    { id: "alias-other-user", user_id: otherUser, alias: "user@ethone.dev", display_name: "Other", is_primary: true, created_at: new Date().toISOString() }
  ];

  const res = await invoke("/api/mail/send", {
    method: "POST",
    env,
    headers: jsonHeaders(),
    body: JSON.stringify({ to: ["to@example.com"], subject: "Hello", text: "Body" })
  });
  assert.equal(res.status, 200);
  const body = await payload(res);
  assert.ok(body.data.sent);
  const fromAddress = state.resendCalls[0].from;
  assert.ok(fromAddress.includes("user."));
  assert.ok(fromAddress.endsWith("@ethone.dev>"));
  const created = state["ethone_mail_aliases"].find((a) => a.user_id === USER_ID);
  assert.ok(created);
  assert.notEqual(created.alias, "user@ethone.dev");
});

test("mail.receive only delivers to the alias owner", async () => {
  const state = {};
  const env = makeEnv(state);
  const otherUser = "9e64d0a1-1111-2222-3333-000000000000";
  state["ethone_mail_aliases"] = [
    { id: "alias-a", user_id: USER_ID, alias: "user@ethone.dev", display_name: "QA", is_primary: true, created_at: new Date().toISOString() },
    { id: "alias-b", user_id: otherUser, alias: "shared@ethone.dev", display_name: "Other", is_primary: true, created_at: new Date().toISOString() }
  ];

  const headers = new Map([
    ["subject", "Hello"],
    ["from", "Sender <sender@example.com>"],
    ["message-id", "<msg-123>"]
  ]);
  const message = {
    to: "shared@ethone.dev",
    from: "sender@example.com",
    headers: {
      get(name) { return headers.get(name.toLowerCase()) || null; },
      entries() { return headers.entries(); }
    },
    text: async () => "Hello",
    html: async () => "<p>Hello</p>",
    attachments: [],
    rawSize: 123
  };

  await worker.email(message, env, { waitUntil() {} });
  const stored = state["ethone_mail_messages"];
  assert.equal(stored.length, 1);
  assert.equal(stored[0].user_id, otherUser);
  assert.equal(stored[0].alias_id, "alias-b");
});
