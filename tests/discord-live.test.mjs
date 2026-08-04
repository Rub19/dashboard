import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createDiscordLive, normalizeDiscordBadges, normalizeDiscordPresence } from "../v8/services/discord-live.mjs";



const USER_ID = "123456789012345678";

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.instances.push(this);
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.();
  }
  open() { this.readyState = 1; this.onopen?.(); }
  message(payload) { this.onmessage?.({ data: JSON.stringify(payload) }); }
}
FakeSocket.instances = [];

function fakeRuntime() {
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    WebSocket: FakeSocket,
    setTimeout: (fn) => { const id = nextId++; timeouts.set(id, fn); return id; },
    clearTimeout: (id) => { timeouts.delete(id); },
    setInterval: (fn) => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: (id) => { intervals.delete(id); },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    addEventListener() {},
    removeEventListener() {},
    fireTimeouts() { const fns = [...timeouts.values()]; timeouts.clear(); fns.forEach((fn) => fn()); },
    intervalCount: () => intervals.size
  };
}

test("Discord live connects a Lanyard socket, subscribes on hello, and publishes presence updates instantly", () => {
  FakeSocket.instances = [];
  const runtime = fakeRuntime();
  const externalServices = { lanyard: { presence: async () => ({ data: {} }) } };
  const live = createDiscordLive({ runtime, externalServices, isConnected: () => true, getUserId: () => USER_ID });
  live.start();

  assert.equal(FakeSocket.instances.length, 1);
  const socket = FakeSocket.instances[0];
  assert.equal(socket.url, "wss://api.lanyard.rest/socket");

  socket.open();
  socket.message({ op: 1, d: { heartbeat_interval: 30000 } });
  assert.deepEqual(socket.sent, [{ op: 2, d: { subscribe_to_id: USER_ID } }]);
  assert.equal(runtime.intervalCount(), 1);

  const updates = [];
  live.subscribe((state) => updates.push(state), { immediate: false });
  socket.message({
    op: 0,
    t: "PRESENCE_UPDATE",
    d: {
      discord_user: { id: USER_ID, global_name: "Rub19", avatar: "avatarhash" },
      discord_status: "dnd",
      activities: [],
      listening_to_spotify: true,
      spotify: {
        song: "Sleepwalking",
        artist: "Sleeping With Sirens",
        album: "Madness",
        album_art_url: "https://i.scdn.co/image/test",
        track_id: "track1",
        timestamps: { start: Date.now() - 5000, end: Date.now() + 235000 }
      }
    }
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].displayName, "Rub19");
  assert.equal(updates[0].status, "dnd");
  assert.equal(updates[0].avatarUrl, `https://cdn.discordapp.com/avatars/${USER_ID}/avatarhash.png?size=128`);
  assert.equal(updates[0].spotify.available, true);
  assert.equal(updates[0].spotify.title, "Sleepwalking");
  assert.ok(updates[0].spotify.durationMs > 0);

  live.destroy();
});

test("Discord live reconnects the socket after it closes unexpectedly", () => {
  FakeSocket.instances = [];
  const runtime = fakeRuntime();
  const externalServices = { lanyard: { presence: async () => ({ data: {} }) } };
  const live = createDiscordLive({ runtime, externalServices, isConnected: () => true, getUserId: () => USER_ID });
  live.start();
  assert.equal(FakeSocket.instances.length, 1);

  FakeSocket.instances[0].close();
  runtime.fireTimeouts();
  assert.equal(FakeSocket.instances.length, 2);

  live.destroy();
});

test("Discord live never opens a socket when not connected", () => {
  FakeSocket.instances = [];
  const runtime = fakeRuntime();
  const externalServices = { lanyard: { presence: async () => ({ data: {} }) } };
  const live = createDiscordLive({ runtime, externalServices, isConnected: () => false, getUserId: () => USER_ID });
  live.start();
  assert.equal(FakeSocket.instances.length, 0);
  live.destroy();
});

test("Discord live destroy closes the socket and stops the heartbeat", () => {
  FakeSocket.instances = [];
  const runtime = fakeRuntime();
  const externalServices = { lanyard: { presence: async () => ({ data: {} }) } };
  const live = createDiscordLive({ runtime, externalServices, isConnected: () => true, getUserId: () => USER_ID });
  live.start();
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message({ op: 1, d: { heartbeat_interval: 30000 } });
  assert.equal(runtime.intervalCount(), 1);

  live.destroy();
  assert.equal(socket.readyState, 3);
  assert.equal(runtime.intervalCount(), 0);
});

test("Discord live resolves badges from public_flags/nitro and exposes them on presence", () => {
  const presence = normalizeDiscordPresence({
    displayName: "Rub19",
    status: "online",
    discord_user: {
      id: "999999999999999999",
      public_flags: 4194304 | 64,
      nitro: true
    }
  }, { connected: true });

  assert.equal(presence.badges.length, 3);
  assert.equal(presence.badges[0].id, "hypesquad_bravery");
  assert.equal(presence.badges[1].id, "active_developer");
  assert.equal(presence.badges[2].id, "nitro");

  const defaultPresence = normalizeDiscordPresence({
    displayName: "Rub19",
    status: "online"
  }, { connected: true });
  assert.equal(defaultPresence.badges.length, 4);
  assert.equal(defaultPresence.badges[0].id, "hypesquad_bravery");
  assert.equal(defaultPresence.badges[1].id, "active_developer");

  const uiSource = fs.readFileSync(new URL("../v8/ui/discord-live.mjs", import.meta.url), "utf8");
  assert.match(uiSource, /function discordBadgesNode\(badges = \[\]\) \{/);
  assert.match(uiSource, /className: "v8-discord-badges"/);
  assert.match(uiSource, /className: "v8-discord-badge"/);
  assert.match(uiSource, /discordBadgesNode\(presence\.badges\)/);
});


