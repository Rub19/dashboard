import assert from "node:assert/strict";
import test from "node:test";
import { friendPortrait, resolveFriendCard } from "./friend-portraits.ts";

test("a friend card comes directly from the player loadout", async () => {
  const paths = [];
  const card = await resolveFriendCard("abc", async (path) => {
    paths.push(path);
    return { Identity: { PlayerCardID: "card-direct" } };
  });

  assert.equal(card, "card-direct");
  assert.deepEqual(paths, ["/personalization/v3/players/abc/playerloadout"]);
});

test("match history remains a fallback when the loadout is unavailable", async () => {
  const card = await resolveFriendCard("abc", async (path) => {
    if (path.startsWith("/personalization/")) throw new Error("unavailable");
    if (path.startsWith("/match-history/")) return { History: [{ MatchID: "match-1" }] };
    return { players: [{ subject: "ABC", playerCard: "card-history" }] };
  });

  assert.equal(card, "card-history");
});

test("the last real game icon is kept for an offline friend", () => {
  const friend = { id: "abc", product: "", icon: "", card: "" };
  assert.equal(friendPortrait(friend, {}, { abc: "https://example.test/icon.jpg" }), "https://example.test/icon.jpg");
});

test("a live game icon wins over cached portraits", () => {
  const friend = { id: "abc", product: "league_of_legends", icon: "https://example.test/live.jpg", card: "live-card" };
  assert.equal(friendPortrait(friend, { abc: "cached-card" }, { abc: "https://example.test/cached.jpg" }), "https://example.test/live.jpg");
});
