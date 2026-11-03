import assert from "node:assert/strict";
import test from "node:test";
import { friendPortrait, portraitMissing, resolveFriendCard, resolveFriendIcon } from "./friend-portraits.ts";

const friend = (over = {}) => ({ id: "abc", name: "Jett", tag: "EU W", icon: "", card: "", ...over });

test("a friend card comes from their last match", async () => {
  const card = await resolveFriendCard("abc", async (path) => {
    if (path.startsWith("/match-history/")) return { History: [{ MatchID: "match-1" }] };
    return { players: [{ subject: "ABC", playerCard: "card-history" }] };
  });
  assert.equal(card, "card-history");
});

test("a friend with no VALORANT history has no card", async () => {
  assert.equal(await resolveFriendCard("abc", async () => ({ History: [] })), "");
  assert.equal(await resolveFriendCard("abc", async () => { throw new Error("riotFailed"); }), "");
});

test("the League icon is read by Riot ID, encoded", async () => {
  const paths = [];
  const icon = await resolveFriendIcon(friend(), async (path) => { paths.push(path); return { avatarUrl: "https://example.test/lol.png" }; });
  assert.equal(icon, "https://example.test/lol.png");
  assert.deepEqual(paths, ["api/stats/lol-profile?name=Jett&tag=EU%20W"]);
  assert.equal(await resolveFriendIcon(friend(), async () => { throw new Error("404"); }), "");
});

test("E:VAL prefers the VALORANT card, E:LOL prefers the League icon", () => {
  const both = friend({ icon: "https://example.test/live.jpg", card: "live-card" });
  assert.equal(friendPortrait(both, {}, {}, "val"), "https://media.valorant-api.com/playercards/live-card/smallart.png");
  assert.equal(friendPortrait(both, {}, {}, "lol"), "https://example.test/live.jpg");
});

test("each game falls back to the other portrait, then to nothing", () => {
  assert.equal(friendPortrait(friend(), {}, { abc: "https://example.test/icon.jpg" }, "val"), "https://example.test/icon.jpg");
  assert.equal(friendPortrait(friend(), { abc: "cached" }, {}, "lol"), "https://media.valorant-api.com/playercards/cached/smallart.png");
  assert.equal(friendPortrait(friend(), {}, {}), "");
});

test("E:LOL still asks for an icon when only a card is known", () => {
  assert.equal(portraitMissing(friend(), { abc: "cached" }, {}, "lol"), true);
  assert.equal(portraitMissing(friend(), { abc: "cached" }, {}, "val"), false);
  assert.equal(portraitMissing(friend(), {}, { abc: "icon" }, "val"), false);
  assert.equal(portraitMissing(friend(), {}, {}, "val"), true);
});
