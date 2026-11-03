import assert from "node:assert/strict";
import test from "node:test";
import { APPS, appFromAtom, appFromFeed } from "../src/routes/apps.js";

test("a Tauri feed gives the version, notes and download", () => {
  const app = appFromFeed(APPS[1], { version: "1.6.0", notes: "Boss", pub_date: "2026-11-03", platforms: { "windows-x86_64": { url: "https://hdv.ethone.dev/x.exe" } } });
  assert.deepEqual([app.id, app.available, app.version, app.notes, app.download], ["hdv-tracker", true, "1.6.0", "Boss", "https://hdv.ethone.dev/x.exe"]);
});

test("the GitHub feed gives the newest release and drops the v", () => {
  const xml = '<feed><entry><id>x</id><updated>2026-11-01T21:05:01Z</updated><link rel="alternate" href="https://github.com/Rub19/ethra/releases/tag/v0.3.3"/><content type="html">&lt;p&gt;Nouveau &amp;amp; mieux&lt;/p&gt;</content></entry><entry><link href="https://github.com/Rub19/ethra/releases/tag/v0.3.2"/></entry></feed>';
  const app = appFromAtom(APPS[0], xml);
  assert.deepEqual([app.available, app.version, app.notes, app.date], [true, "0.3.3", "Nouveau & mieux", "2026-11-01T21:05:01Z"]);
  assert.equal(appFromAtom(APPS[0], "<feed></feed>").available, false);
});

test("a feed that fails says it is unavailable and invents nothing", () => {
  const app = appFromFeed(APPS[3], null);
  assert.deepEqual([app.available, app.version, app.download], [false, null, null]);
});
