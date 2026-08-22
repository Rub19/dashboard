import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");
const worktree = path.join(root, "..", "ethone-gh-pages");

if (!fs.existsSync(out)) {
  console.error("Build out/ not found. Run: npm run build");
  process.exit(1);
}

try {
  execSync(`git worktree remove "${worktree}" --force`, { cwd: root, stdio: "ignore" });
} catch {
  // ignore
}

execSync(`git worktree add -B gh-pages "${worktree}"`, { cwd: root, stdio: "inherit" });

try {
  execSync("git rm -rf .", { cwd: worktree, stdio: "inherit" });
} catch {
  // ignore
}

for (const entry of fs.readdirSync(out, { withFileTypes: true })) {
  const src = path.join(out, entry.name);
  const dest = path.join(worktree, entry.name);
  if (entry.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const indexHtml = path.join(out, "index.html");
const notFoundHtml = path.join(out, "_not-found.html");
if (fs.existsSync(indexHtml) && !fs.existsSync(path.join(out, "404.html"))) {
  fs.copyFileSync(indexHtml, path.join(out, "404.html"));
} else if (fs.existsSync(notFoundHtml) && !fs.existsSync(path.join(out, "404.html"))) {
  fs.copyFileSync(notFoundHtml, path.join(out, "404.html"));
}

execSync("git add .", { cwd: worktree, stdio: "inherit" });
execSync(
  'git commit -m "Deploy ethone-next build to gh-pages." --allow-empty',
  { cwd: worktree, stdio: "inherit" }
);
execSync("git push origin gh-pages --force", { cwd: worktree, stdio: "inherit" });
execSync(`git worktree remove "${worktree}" --force`, { cwd: root, stdio: "ignore" });

console.log("Deployed to gh-pages.");
