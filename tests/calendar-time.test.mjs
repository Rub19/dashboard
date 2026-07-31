import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("calendar events support an optional time field, sorted after all-day events within the same date", () => {
  const repo = read("v8/data/profile-repository.mjs");
  assert.match(repo, /time: \/\^\\d\{2\}:\\d\{2\}\$\/\.test\(event\?\.time\) \? event\.time : ""/);
  assert.match(repo, /time: \/\^\\d\{2\}:\\d\{2\}\$\/\.test\(input\.time\) \? input\.time : ""/);
  assert.match(repo, /if \(!leftTime && rightTime\) return -1;/);

  const page = read("v8/pages/calendar.mjs");
  assert.match(page, /attributes: \{ type: "time", "aria-label": "Heure de l'événement" \}, dataset: \{ eventField: "time" \}/);
  assert.match(page, /formField\(\{ label: "Heure", control: time \}\)/);
  assert.match(page, /time: time\?\.value \|\| ""/);
  assert.match(page, /text: event\.time \|\| "Toute la journée"/);
});
