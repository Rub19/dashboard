import assert from "node:assert/strict";
import test from "node:test";
import { APPS, appFromFeed, appFromRelease } from "../src/routes/apps.js";

test("a Tauri feed gives the version, notes and download", () => {
  const app = appFromFeed(APPS[1], { version: "1.6.0", notes: "Boss", pub_date: "2026-11-03", platforms: { "windows-x86_64": { url: "https://hdv.ethone.dev/x.exe" } } });
  assert.deepEqual([app.id, app.available, app.version, app.notes, app.download], ["hdv-tracker", true, "1.6.0", "Boss", "https://hdv.ethone.dev/x.exe"]);
});

test("a GitHub release gives the installer and drops the v", () => {
  const app = appFromRelease(APPS[0], { tag_name: "v0.3.3", body: "Notes", published_at: "2026-11-01", assets: [{ name: "latest.json", browser_download_url: "https://a/l" }, { name: "Kairo-Setup.exe", browser_download_url: "https://a/s" }] });
  assert.deepEqual([app.version, app.download], ["0.3.3", "https://a/s"]);
});

test("a feed that fails says it is unavailable and invents nothing", () => {
  const app = appFromFeed(APPS[3], null);
  assert.deepEqual([app.available, app.version, app.download], [false, null, null]);
});
