import assert from "node:assert/strict";
import test from "node:test";
import { getMinecraftProfile } from "../src/services/minecraft-client.js";
import { testEnv } from "./helpers.mjs";

const UUID = "069a79f444e94726a5befca90e38aaf5";
const textures = Buffer.from(JSON.stringify({ textures: { SKIN: { url: "http://textures.minecraft.net/texture/x" } } })).toString("base64");
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fetchWith({ officialUp, mirrorUp, playerDbUp = false }) {
  const hits = [];
  const fetcher = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    hits.push(url.hostname);
    const official = url.hostname === "api.minecraftservices.com" || url.hostname === "sessionserver.mojang.com";
    if (official && !officialUp) return new Response("down", { status: 521 });
    if (url.hostname === "playerdb.co") {
      if (!playerDbUp) return new Response("down", { status: 521 });
      return json({ success: true, code: "player.found", data: { player: { username: "Notch", raw_id: UUID, properties: [{ name: "textures", value: textures }] } } });
    }
    if (url.hostname === "mowojang.matdoes.dev" && !mirrorUp) return new Response("down", { status: 521 });
    if (url.pathname.includes("/session/minecraft/profile/")) return json({ id: UUID, name: "Notch", properties: [{ name: "textures", value: textures }] });
    if (url.pathname.includes("/profile/lookup/name/") || url.pathname.includes("/users/profiles/minecraft/")) return json({ id: UUID, name: "Notch" });
    return new Response("not found", { status: 404 });
  };
  return { fetcher, hits };
}

test("Minecraft : l'API officielle est utilisée en premier", async () => {
  const { fetcher, hits } = fetchWith({ officialUp: true, mirrorUp: false });
  const profile = await getMinecraftProfile(testEnv({ __TEST_FETCH__: fetcher }), "Notch");
  assert.equal(profile.username ?? profile.name, "Notch");
  assert.ok(hits.includes("api.minecraftservices.com"));
});

test("Minecraft : si l'officiel est en panne, le miroir prend le relais (avant : carte cassée en 503)", async () => {
  const { fetcher, hits } = fetchWith({ officialUp: false, mirrorUp: true });
  const profile = await getMinecraftProfile(testEnv({ __TEST_FETCH__: fetcher }), "Notch");
  assert.equal(profile.username ?? profile.name, "Notch");
  assert.ok(hits.includes("mowojang.matdoes.dev"));
});

test("Minecraft : PlayerDB (joignable depuis Cloudflare) répond en premier, en une seule requête", async () => {
  const { fetcher, hits } = fetchWith({ officialUp: false, mirrorUp: false, playerDbUp: true });
  const profile = await getMinecraftProfile(testEnv({ __TEST_FETCH__: fetcher }), "Notch");
  assert.equal(profile.username ?? profile.name, "Notch");
  assert.ok(String(profile.skinUrl).startsWith("https://textures.minecraft.net"));
  assert.ok(hits.includes("playerdb.co"));
  // Recherche + textures fournies par PlayerDB : aucune requête aux API officielles (l'historique des pseudos reste à part).
  assert.deepEqual(hits.filter((h) => h === "api.minecraftservices.com" || h === "sessionserver.mojang.com"), []);
});
