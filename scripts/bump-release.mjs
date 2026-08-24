/**
 * Scaffold a new ETHONE OS release.
 *
 * Usage:
 *   node scripts/bump-release.mjs
 *
 * On first run, it creates `release-notes.json` from a French source.
 * Fill `en`, `es`, `de` (or leave as `null` to copy from `fr`) then re-run.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = resolve(root, "ethone-next");
const releaseFile = resolve(root, "release-notes.json");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadNotes() {
  if (!(await exists(releaseFile))) {
    const template = {
      fr: {
        title: "Titre de la release",
        items: ["Item 1", "Item 2"],
      },
      en: null,
      es: null,
      de: null,
    };
    await writeFile(releaseFile, JSON.stringify(template, null, 2) + "\n");
    console.log(`Created ${releaseFile}. Fill it and re-run.`);
    process.exit(0);
  }

  const raw = JSON.parse(await readFile(releaseFile, "utf8"));
  const source = raw.fr || { title: "", items: [] };

  return {
    fr: source,
    en: raw.en || source,
    es: raw.es || source,
    de: raw.de || source,
  };
}

async function bumpVersion() {
  execSync("npm version patch --no-git-tag-version", { cwd: nextDir });
  const pkg = JSON.parse(await readFile(resolve(nextDir, "package.json"), "utf8"));
  return { version: pkg.version, label: `v${pkg.version}` };
}

async function updateVersionFiles(version, label) {
  const buildAt = new Date().toISOString();
  const versionJson = { version, commit: null, buildAt };
  await writeFile(
    resolve(nextDir, "public/version.json"),
    JSON.stringify(versionJson, null, 2) + "\n"
  );

  const profilePath = resolve(nextDir, "components/UserProfileDropdown.tsx");
  const profile = await readFile(profilePath, "utf8");
  await writeFile(
    profilePath,
    profile.replace(/const VERSION_LABEL = "v[0-9.]+";/, `const VERSION_LABEL = "${label}";`)
  );
}

async function updateChangelogTs(version, label, date, notes) {
  const path = resolve(nextDir, "data/changelog.ts");
  let data = await readFile(path, "utf8");

  const matches = [...data.matchAll(/const v(\d+)_fr:/g)];
  const maxV = matches.length ? Math.max(...matches.map((m) => Number(m[1]))) : 0;
  const nextV = maxV + 1;

  const langs = ["fr", "en", "es", "de"];
  const consts = langs
    .map(
      (l) => `const v${nextV}_${l}: ChangelogEntry = {
  version: "${label}",
  date: "${date}",
  title: ${JSON.stringify(notes[l].title)},
  items: [
${notes[l].items.map((item) => `    ${JSON.stringify(item)},`).join("\n")}
  ],
};`
    )
    .join("\n\n");

  data = data.replace(
    /export const CHANGELOG = CHANGELOG_BY_LANG\.fr;\s*$/,
    `${consts}\n\nCHANGELOG_BY_LANG.fr.unshift(v${nextV}_fr);\nCHANGELOG_BY_LANG.en.unshift(v${nextV}_en);\nCHANGELOG_BY_LANG.es.unshift(v${nextV}_es);\nCHANGELOG_BY_LANG.de.unshift(v${nextV}_de);\n\nexport const CHANGELOG = CHANGELOG_BY_LANG.fr;\n`
  );

  await writeFile(path, data);
  return nextV;
}

async function updateChangelogMd(version, label, date, notes) {
  const path = resolve(root, "CHANGELOG.md");
  let md = await readFile(path, "utf8");

  const items = notes.fr.items.map((i) => `- ${i}`).join("\n");
  const block = `## ${label} — ${date}\n\n**${notes.fr.title}**\n\n${items}\n\n`;

  md = md.replace(
    /^# Changelog\n\nToutes les modifications notables de ce projet seront documentées dans ce fichier\.\n/m,
    `# Changelog\n\nToutes les modifications notables de ce projet seront documentées dans ce fichier.\n\n${block}`
  );

  await writeFile(path, md);
}

async function main() {
  const notes = await loadNotes();
  const { version, label } = await bumpVersion();
  const date = new Date().toISOString().slice(0, 10);

  await updateVersionFiles(version, label);
  await updateChangelogMd(version, label, date, notes);
  const nextV = await updateChangelogTs(version, label, date, notes);

  console.log(`\nRelease ${label} scaffolded (v${nextV} block).`);
  console.log("Next steps:");
  console.log("  1. Review translations in ethone-next/data/changelog.ts");
  console.log("  2. npm run build");
  console.log("  3. git add . && git commit -m \"Migration Next.js : release ${label}\"");
  console.log("  4. git push origin main");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
