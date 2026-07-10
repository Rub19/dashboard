#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectories = ["actions", "components", "core", "pages", "services", "state", "ui", "utils", "widgets"];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(absolute) {
  return path.relative(root, absolute).replaceAll(path.sep, "/");
}

function cleanReference(value) {
  return String(value || "")
    .split("#", 1)[0]
    .split("?", 1)[0]
    .replace(/^\.\//, "")
    .replaceAll("\\", "/");
}

const indexPath = path.join(root, "index.html");
const index = fs.readFileSync(indexPath, "utf8");
const serviceWorkerPath = path.join(root, "sw.js");
const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, "utf8");
const sourceFiles = sourceDirectories
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((file) => /\.(?:js|css)$/i.test(file))
  .map(relative)
  .sort();

const assetReferences = [];
for (const match of index.matchAll(/\b(?:src|href|data-src|data-href)\s*=\s*["']([^"']+)["']/gi)) {
  const raw = match[1];
  if (/^(?:https?:|data:|#)/i.test(raw)) continue;
  const cleaned = cleanReference(raw);
  if (/\.(?:js|css)$/i.test(cleaned)) assetReferences.push(cleaned);
}

const referenceCounts = new Map();
for (const asset of assetReferences) referenceCounts.set(asset, (referenceCounts.get(asset) || 0) + 1);

const uniqueReferences = [...referenceCounts.keys()].sort();
const missingAssets = uniqueReferences.filter((asset) => !fs.existsSync(path.join(root, asset)));
const duplicateAssets = [...referenceCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([asset, count]) => ({ asset, count }));
const referencedSet = new Set(uniqueReferences);
const orphanedSource = sourceFiles.filter((file) => !referencedSet.has(file));
const disabledModules = [...index.matchAll(/<script\b[^>]*type=["']application\/ethone-disabled["'][^>]*>/gi)]
  .map((match) => match[0]);

const bootAssetBlock = (serviceWorkerSource.match(/const\s+ETHONE_BOOT_ASSETS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const bootAssets = [...bootAssetBlock.matchAll(/["'](\.\/[^"']+)["']/g)].map((match) => cleanReference(match[1]));
const bootAssetCounts = new Map();
for (const asset of bootAssets) bootAssetCounts.set(asset, (bootAssetCounts.get(asset) || 0) + 1);
const missingServiceWorkerAssets = [...bootAssetCounts.keys()].filter((asset) => !fs.existsSync(path.join(root, asset))).sort();
const duplicateServiceWorkerAssets = [...bootAssetCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([asset, count]) => ({ asset, count }));

const report = {
  metrics: {
    sourceFiles: sourceFiles.length,
    assetDeclarations: assetReferences.length,
    uniqueAssets: uniqueReferences.length,
    eagerScripts: [...index.matchAll(/<script\b(?=[^>]*(?:src)=)[^>]*>/gi)]
      .filter((match) => !/type=["']application\/ethone-(?:lazy|disabled)["']/i.test(match[0])).length,
    lazyScripts: [...index.matchAll(/<script\b[^>]*type=["']application\/ethone-lazy["'][^>]*>/gi)].length,
    globalStyles: [...index.matchAll(/<link\b(?=[^>]*href=)(?![^>]*data-href=)[^>]*>/gi)]
      .filter((match) => /\.css(?:\?|["'])/i.test(match[0])).length,
    lazyStyles: [...index.matchAll(/<link\b[^>]*data-href=["'][^"']+\.css(?:\?[^"']*)?["'][^>]*>/gi)].length,
    inlineStyles: [...index.matchAll(/<style\b/gi)].length
  },
  missingAssets,
  duplicateAssets,
  orphanedSource,
  disabledModules,
  serviceWorker: {
    bootAssets: bootAssets.length,
    missingAssets: missingServiceWorkerAssets,
    duplicateAssets: duplicateServiceWorkerAssets
  }
};

const failures = missingAssets.length + duplicateAssets.length + orphanedSource.length + disabledModules.length
  + missingServiceWorkerAssets.length + duplicateServiceWorkerAssets.length;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("ETHONE codebase audit");
  console.log(JSON.stringify(report.metrics, null, 2));
  for (const [name, findings] of Object.entries({ missingAssets, duplicateAssets, orphanedSource, disabledModules })) {
    console.log(`${name}: ${findings.length}`);
    findings.forEach((finding) => console.log(`  - ${typeof finding === "string" ? finding : JSON.stringify(finding)}`));
  }
  console.log(`serviceWorker.bootAssets: ${bootAssets.length}`);
  console.log(`serviceWorker.missingAssets: ${missingServiceWorkerAssets.length}`);
  console.log(`serviceWorker.duplicateAssets: ${duplicateServiceWorkerAssets.length}`);
}

if (failures) process.exitCode = 1;
