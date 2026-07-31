import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { CHANGELOG, CHANGELOG_KIND_ICONS, CHANGELOG_KIND_LABELS, latestChangelogVersion } from "../v8/data/changelog.mjs";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("changelog entries are well-formed and every item kind has an icon and a label", () => {
  assert.ok(CHANGELOG.length >= 1);
  const knownKinds = new Set(Object.keys(CHANGELOG_KIND_ICONS));
  assert.deepEqual(new Set(Object.keys(CHANGELOG_KIND_LABELS)), knownKinds);
  for (const release of CHANGELOG) {
    assert.ok(release.version, "release requires a version");
    assert.ok(release.date, "release requires a date");
    assert.ok(release.title, "release requires a title");
    assert.ok(release.items.length >= 1, `${release.version} needs at least one item`);
    for (const item of release.items) {
      assert.ok(knownKinds.has(item.kind), `${release.version} has an unknown item kind: ${item.kind}`);
      assert.ok(item.text?.length > 0, `${release.version} has an empty item`);
    }
  }
  assert.equal(latestChangelogVersion(), CHANGELOG[0].version);
});

test("the changelog panel is wired end-to-end: action, panel copy, and a real trigger button", () => {
  const actions = read("v8/core/actions.mjs");
  assert.match(actions, /register\("v8\.changelog\.open",\s*\(\)\s*=>\s*\{\s*setState\(\{\s*panel:\s*"changelog"/);

  const panel = read("v8/ui/panel.mjs");
  assert.match(panel, /changelog:\s*\{\s*title:\s*"Notes de version"/);
  assert.match(panel, /id === "changelog" \? changelogContent\(\)/);
  assert.match(panel, /CHANGELOG\.map\(changelogEntryNode\)/);

  const shell = read("v8/ui/shell.mjs");
  assert.match(shell, /data-action="v8\.changelog\.open"/);
  assert.doesNotMatch(shell, /<span class="v8-status-item v8-status-item--version"/);
});

test("changelog CSS respects the shared readability and letter-spacing rules", () => {
  const shell = read("v8/styles/shell.css");
  const block = shell.slice(shell.indexOf(".v8-changelog-intro"), shell.indexOf(".v8-changelog-intro") + 3000);
  assert.doesNotMatch(block, /font-size:\s*(?:[0-9]|1[01])px/);
  assert.doesNotMatch(block, /letter-spacing:\s*(?!0(?:;|\s))[-.\d]+(?:em|rem|px)/);
});

test("changelog.mjs is precached by the service worker", () => {
  const sw = read("sw.js");
  assert.match(sw, /"\.\/v8\/data\/changelog\.mjs"/);
});
