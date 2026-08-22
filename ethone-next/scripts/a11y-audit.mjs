import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axeCore from "axe-core";

const DIST = fileURLToPath(new URL("../out", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../audit", import.meta.url));

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      yield path;
    }
  }
}

async function audit(path) {
  const html = await readFile(path, "utf-8");
  const dom = new JSDOM(html, { url: "http://localhost:3001/" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  if (dom.window.HTMLCanvasElement) {
    dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  }
  const document = dom.window.document;

  const issues = [];

  // Basic structural checks
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) issues.push("Missing viewport meta");

  const htmlLang = document.documentElement.getAttribute("lang");
  if (!htmlLang) issues.push("Missing html lang");

  const title = document.querySelector("title");
  if (!title || !title.textContent.trim()) issues.push("Missing title");

  // Images
  const images = document.querySelectorAll("img");
  images.forEach((img, i) => {
    if (!img.hasAttribute("alt") && !img.getAttribute("role")) {
      issues.push(`Image[${i}] missing alt`);
    }
  });

  // Buttons without accessible label
  const buttons = document.querySelectorAll("button");
  buttons.forEach((btn, i) => {
    const hasLabel =
      btn.textContent.trim() ||
      btn.getAttribute("aria-label") ||
      btn.getAttribute("aria-labelledby");
    if (!hasLabel) issues.push(`Button[${i}] missing accessible label`);
  });

  // Links without text or label
  const links = document.querySelectorAll("a");
  links.forEach((a, i) => {
    const hasLabel =
      a.textContent.trim() ||
      a.getAttribute("aria-label") ||
      a.getAttribute("aria-labelledby");
    if (!hasLabel) issues.push(`Link[${i}] missing accessible label`);
  });

  // Heading hierarchy
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  let lastLevel = 0;
  headings.forEach((h) => {
    const level = Number(h.tagName[1]);
    if (level > lastLevel + 1) {
      issues.push(`Heading skip: ${h.tagName} after h${lastLevel}`);
    }
    lastLevel = level;
  });

  // Duplicate ids
  const ids = new Set();
  document.querySelectorAll("[id]").forEach((el) => {
    const id = el.id;
    if (ids.has(id)) issues.push(`Duplicate id: ${id}`);
    ids.add(id);
  });

  // Inputs
  const inputs = document.querySelectorAll("input:not([type='hidden']), select, textarea");
  inputs.forEach((input, i) => {
    const id = input.id;
    const labelledBy = input.getAttribute("aria-labelledby");
    const ariaLabel = input.getAttribute("aria-label");
    const hasLabel =
      ariaLabel ||
      (labelledBy && document.getElementById(labelledBy)) ||
      (id && document.querySelector(`label[for="${id}"]`)) ||
      input.closest("label");
    if (!hasLabel) issues.push(`Input[${i}] missing label`);
  });

  // Axe-core run
  const axeResult = await axeCore.run(document.documentElement, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });
  for (const violation of axeResult.violations) {
    if (["critical", "serious"].includes(violation.impact)) {
      issues.push(`AXE ${violation.impact}: ${violation.id} (${violation.nodes.length} nodes)`);
    }
  }

  return issues;
}

async function main() {
  try {
    await stat(DIST);
  } catch {
    console.error("out/ not found. Run 'npm run build' first.");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  let total = 0;
  let pagesWithIssues = 0;
  const report = [];
  for await (const path of walk(DIST)) {
    const rel = relative(DIST, path);
    const issues = await audit(path);
    total++;
    report.push({ page: rel, issues });
    if (issues.length) {
      pagesWithIssues++;
      console.log(`\n❌ ${rel}`);
      for (const issue of issues) console.log(`  - ${issue}`);
    } else {
      console.log(`✅ ${rel}`);
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    totalPages: total,
    pagesWithIssues,
    report,
  };

  await writeFile(join(OUT_DIR, "a11y-report.json"), JSON.stringify(summary, null, 2));
  console.log(`\nAudited ${total} pages. ${pagesWithIssues} with issues.`);
  console.log(`Report written to ${join(OUT_DIR, "a11y-report.json")}`);
  process.exit(0);
}

main();
