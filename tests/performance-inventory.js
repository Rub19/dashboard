"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const outputPath = require.main === module && process.argv[2] ? path.resolve(process.argv[2]) : null;
const html = fs.readFileSync(indexPath, "utf8");

function attr(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function localFile(url) {
  if (!url || !url.startsWith("./")) return null;
  return path.join(root, url.slice(2).split("?")[0]);
}

function resource(url, kind, loading, group) {
  const file = localFile(url);
  let bytes = 0;
  if (file && fs.existsSync(file)) bytes = fs.statSync(file).size;
  return {
    url,
    kind,
    loading,
    group: group || "",
    bytes,
    kb: Number((bytes / 1024).toFixed(1)),
  };
}

const tags = Array.from(html.matchAll(/<(script|link)\b[^>]*>/gi), (match) => match[0]);
const resources = [];

for (const tag of tags) {
  if (/^<script/i.test(tag)) {
    const src = attr(tag, "src");
    const lazySrc = attr(tag, "data-src");
    if (src) resources.push(resource(src, "js", "eager", ""));
    if (lazySrc) resources.push(resource(lazySrc, "js", "lazy", attr(tag, "data-ethone-lazy-group")));
    continue;
  }

  const href = attr(tag, "href");
  const lazyHref = attr(tag, "data-href");
  if (attr(tag, "rel").toLowerCase() === "stylesheet" && href) {
    resources.push(resource(href, "css", "eager", ""));
  }
  if (lazyHref) {
    resources.push(resource(lazyHref, "css", "lazy", attr(tag, "data-ethone-lazy-style-group")));
  }
}

function summarize(kind, loading) {
  const items = resources.filter((item) => item.kind === kind && item.loading === loading && item.url.startsWith("./"));
  const bytes = items.reduce((total, item) => total + item.bytes, 0);
  return {
    count: items.length,
    bytes,
    kb: Number((bytes / 1024).toFixed(1)),
  };
}

const localResources = resources.filter((item) => item.url.startsWith("./"));
const report = {
  generatedAt: new Date().toISOString(),
  index: {
    bytes: Buffer.byteLength(html),
    kb: Number((Buffer.byteLength(html) / 1024).toFixed(1)),
  },
  totals: {
    eagerJs: summarize("js", "eager"),
    lazyJs: summarize("js", "lazy"),
    eagerCss: summarize("css", "eager"),
    lazyCss: summarize("css", "lazy"),
  },
  topEager: localResources
    .filter((item) => item.loading === "eager")
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 30),
  topLazy: localResources
    .filter((item) => item.loading === "lazy")
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 30),
};

module.exports = report;

if (require.main === module) {
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
