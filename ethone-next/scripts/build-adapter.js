/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

/** @type {import("next").NextAdapter} */
const adapter = {
  name: "fix-issue-85374",
  async onBuildComplete({ outputs }) {
    for (const file of outputs.staticFiles) {
      const sourcePath = file.filePath;
      const targetPath = fixupPath(sourcePath);
      if (targetPath && targetPath !== sourcePath) {
        const targetDir = path.dirname(targetPath);
        await fs.promises.mkdir(targetDir, { recursive: true });
        await fs.promises.rename(sourcePath, targetPath);
      }
    }
  },
};

function fixupPath(filePath) {
  const components = filePath.split(path.sep);
  const idx = components.findIndex((x) => x.startsWith("__next."));
  if (idx >= 0 && idx < components.length - 1) {
    const result = components.slice(0, idx);
    result.push(components.slice(idx).join("."));
    return result.join(path.sep);
  }
  return null;
}

module.exports = adapter;
