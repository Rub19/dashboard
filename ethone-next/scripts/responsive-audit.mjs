import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../app", import.meta.url));
const COMPONENTS = fileURLToPath(new URL("../components", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../audit", import.meta.url));

const BREAKPOINT_RE = /(sm:|md:|lg:|xl:|2xl:|min-\[|max-\[)/;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && (extname(entry.name) === ".tsx" || extname(entry.name) === ".ts")) {
      yield path;
    }
  }
}

async function main() {
  const files = [];
  for await (const path of walk(APP)) files.push(path);
  for await (const path of walk(COMPONENTS)) files.push(path);

  let responsiveCount = 0;
  const nonResponsive = [];
  for (const path of files) {
    const content = await readFile(path, "utf-8");
    if (BREAKPOINT_RE.test(content)) {
      responsiveCount++;
    } else if (path.includes("page.tsx")) {
      const rel = relative(fileURLToPath(new URL("..", import.meta.url)), path);
      nonResponsive.push(rel);
    }
  }

  const layout = await readFile(join(APP, "layout.tsx"), "utf-8").catch(() => "");
  const issues = [];
  if (!layout.includes("MobileNav")) issues.push("MobileNav not found in layout");
  if (!layout.includes("Sidebar")) issues.push("Sidebar not found in layout");
  if (!layout.includes('name="viewport"') && !layout.includes("viewport")) issues.push("Viewport meta not directly in layout (may be injected by Next.js metadata)");

  await mkdir(OUT_DIR, { recursive: true });
  const report = {
    timestamp: new Date().toISOString(),
    responsiveFiles: responsiveCount,
    totalFiles: files.length,
    nonResponsivePages: nonResponsive,
    layoutIssues: issues,
  };
  await writeFile(join(OUT_DIR, "responsive-report.json"), JSON.stringify(report, null, 2));

  console.log(`Responsive files: ${responsiveCount}/${files.length}`);
  if (nonResponsive.length) console.log(`\nPages without responsive Tailwind classes: ${nonResponsive.length}`);
  if (issues.length) {
    console.log("\nLayout issues:");
    issues.forEach((i) => console.log(`  - ${i}`));
  }
  console.log(`\nReport written to ${join(OUT_DIR, "responsive-report.json")}`);
  process.exit(0);
}

main();
