import test from "node:test";
import assert from "node:assert/strict";
import { checkBotHealth, nextMonitorState } from "../src/services/bot-monitor.js";

const T = "2026-10-10T12:00:00.000Z";

test("un seul échec ne déclenche pas d'alerte", () => {
  const r = nextMonitorState(null, { ok: false, reason: "x" }, T);
  assert.equal(r.send, null);
  assert.equal(r.state.fails, 1);
});

test("deux échecs d'affilée : une alerte, puis plus rien tant que la panne dure", () => {
  const a = nextMonitorState(null, { ok: false, reason: "x" }, T);
  const b = nextMonitorState(a.state, { ok: false, reason: "x" }, "later");
  assert.equal(b.send, "down");
  assert.equal(b.downSince, T);
  const c = nextMonitorState(b.state, { ok: false, reason: "x" }, "later2");
  assert.equal(c.send, null);
});

test("retour en ligne après une alerte : mail de retour, état remis à zéro", () => {
  const down = { fails: 3, alerted: true, since: T };
  const r = nextMonitorState(down, { ok: true }, "now");
  assert.equal(r.send, "recovered");
  assert.deepEqual(r.state, { fails: 0, alerted: false, since: null });
});

test("retour en ligne sans alerte préalable : aucun mail", () => {
  const r = nextMonitorState({ fails: 1, alerted: false, since: T }, { ok: true }, "now");
  assert.equal(r.send, null);
});

test("checkBotHealth envoie un mail au 2e échec et mémorise l'état dans le KV", async () => {
  const store = new Map();
  const sent = [];
  const env = {
    DISCORD_BOT_ORIGIN: "https://bot.example.test",
    SUPPORT_FORWARD_TO: "owner@example.test",
    SUPPORT_ADDRESS: "support@example.test",
    RESEND_API_KEY: "test",
    GAME_OVERRIDES: {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v) => void store.set(k, v)
    },
    __TEST_FETCH__: async (url, init) => {
      if (String(url).startsWith("https://api.resend.com")) {
        sent.push(JSON.parse(init.body));
        return new Response(JSON.stringify({ id: "1" }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: "ok", botOnline: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
  };
  await checkBotHealth(env, T);
  assert.equal(sent.length, 0);
  await checkBotHealth(env, "later");
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /hors ligne/);
  assert.equal(JSON.parse(store.get("monitor:bot")).alerted, true);
});
