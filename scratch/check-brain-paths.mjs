import fs from "node:fs";

const content = fs.readFileSync("v8/pages/settings.mjs", "utf8");
const matches = content.match(/data-brain-preference-[^=]+=[^\s>]+/g) || [];
for (const m of new Set(matches)) {
  console.log(m);
}
