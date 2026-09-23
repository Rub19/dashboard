// Usage : node release.js <version sans v> <date> <fichier json d'entrées>
// Bump package.json, ajoute l'entrée aux 4 langues de data/changelog.ts ET une section dans CHANGELOG.md.
const fs = require("fs");
const [, , version, date, file] = process.argv;
const rel = JSON.parse(fs.readFileSync(file, "utf8"));
// Identifiants avec « _ » : "v1_28_35" ne peut pas entrer en collision avec un ancien "v12835" (= 1.28.35 ou 1.2.835 ?).
const id = "v" + version.replace(/\./g, "_");

function rw(f, fn) {
  const raw = fs.readFileSync(f, "utf8");
  const crlf = raw.includes("\r\n");
  const out = fn(raw.replace(/\r\n/g, "\n"));
  fs.writeFileSync(f, crlf ? out.replace(/\n/g, "\r\n") : out);
}
const q = (s) => JSON.stringify(s);

// 1) package.json
rw("package.json", (s) => s.replace(/"version": "[^"]+"/, `"version": "${version}"`));

// 2) data/changelog.ts
rw("data/changelog.ts", (s) => {
  const langs = ["fr", "en", "es", "de"];
  let block = "";
  for (const l of langs) {
    const e = rel[l];
    block += `const ${id}_${l}: ChangelogEntry = {\n  version: "v${version}",\n  date: "${date}",\n  title: ${q(e.title)},\n  items: [\n${e.items.map((i) => "    " + q(i) + ",").join("\n")}\n  ],\n};\n\n`;
  }
  for (const l of langs) block += `CHANGELOG_BY_LANG.${l}.unshift(${id}_${l});\n`;
  block += "\n";
  const marker = "export const CHANGELOG = CHANGELOG_BY_LANG.fr;";
  if (!s.includes(marker)) throw new Error("marker CHANGELOG");
  if (s.includes(`const ${id}_fr`)) throw new Error("version déjà présente");
  return s.replace(marker, block + marker);
});

// 3) CHANGELOG.md (racine, français)
rw("../CHANGELOG.md", (s) => {
  const e = rel.fr;
  const section = `## v${version} — ${date}\n\n**${e.title}**\n\n${e.items.map((i) => "- " + i).join("\n")}\n\n`;
  const marker = "## v";
  const idx = s.indexOf(marker);
  if (idx < 0) throw new Error("CHANGELOG.md sans section");
  return s.slice(0, idx) + section + s.slice(idx);
});
console.log("release", version, "ok");
