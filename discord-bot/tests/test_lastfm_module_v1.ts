import assert from "node:assert/strict";
import { lastFmStorage } from "../src/modules/lastfm/storage/lastfmStorage.js";
import { buildNowPlayingEmbed, buildTasteEmbed } from "../src/modules/lastfm/ui/lastfmEmbeds.js";
import { lastFmService } from "../src/modules/lastfm/services/lastfmService.js";

let passed = 0;

async function run() {
  lastFmStorage.set("user_test_123", "test_user_fm");
  assert.equal(lastFmStorage.getUsername("user_test_123"), "test_user_fm");
  assert.equal(lastFmStorage.get("user_test_123")?.username, "test_user_fm");
  assert.equal(lastFmStorage.has("user_test_123"), true);
  passed++;

  const deleted = lastFmStorage.delete("user_test_123");
  assert.equal(deleted, true);
  assert.equal(lastFmStorage.has("user_test_123"), false);
  passed++;

  const embedData = buildNowPlayingEmbed("test_user_fm", {
    name: "In the End",
    artist: "Linkin Park",
    album: "Hybrid Theory",
    nowPlaying: true,
    profileUrl: "https://www.last.fm/user/test_user_fm",
    playcount: 42,
    listeners: 1500000,
  });
  assert.ok(embedData.embed);
  assert.equal(embedData.embed.data.title, "In the End");
  assert.ok(embedData.row);
  assert.equal(embedData.row.components.length, 3);
  passed++;

  const tasteEmbed = buildTasteEmbed({
    user1: "alice",
    user2: "bob",
    compatibility: 85,
    commonArtists: ["Radiohead", "Daft Punk"],
  });
  assert.ok(tasteEmbed);
  assert.ok(tasteEmbed.data.description?.includes("alice"));
  assert.ok(tasteEmbed.data.description?.includes("bob"));
  passed++;

  const comparison = await lastFmService.compareTaste("rj", "rj");
  assert.ok(comparison);
  assert.equal(comparison.user1, "rj");
  assert.equal(comparison.user2, "rj");
  passed++;

  console.log(`Tous les tests Last.fm ont reussi (${passed}/${passed}) !`);
}

run();
