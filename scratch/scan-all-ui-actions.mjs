import fs from "node:fs";
import path from "node:path";
import { createActionFacade } from "../v8/core/actions.mjs";

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, files);
    else if (item.name.endsWith(".mjs")) files.push(full);
  }
  return files;
}

const allFiles = walk("v8");
const actionIds = new Set();

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  // Match string literals like "v8.xxx.yyy"
  const matches = content.match(/v8\.[a-z0-9A-Z.-]+/g);
  if (matches) {
    for (const m of matches) {
      if (m.split(".").length >= 3 && !m.endsWith(".") && !m.includes("..")) {
        actionIds.add(m);
      }
    }
  }
}

console.log(`Found ${actionIds.size} potential action IDs across v8 codebase.`);

const facade = createActionFacade({
  navigate: () => {},
  notify: () => {},
  showProfiles: () => {}
});

let missingCount = 0;
for (const id of Array.from(actionIds).sort()) {
  try {
    const result = facade.dispatch(id, { id: "test", trigger: "test" });
    if (!result || result.ok === false) {
      missingCount++;
      console.log(`UNHANDLED ACTION: ${id} -> status=${result?.status}, message=${result?.message}`);
    }
  } catch (e) {
    missingCount++;
    console.log(`CRASH ON ACTION: ${id} -> ${e.message}`);
  }
}

console.log(`Total unhandled/crashing action IDs: ${missingCount}`);
