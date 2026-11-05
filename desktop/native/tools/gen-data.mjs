import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktop = join(here, "..", "..");
const app = join(here, "..", "app");
const src = join(desktop, "src");
const lucide = process.argv[2];
if (!lucide) throw new Error("usage: gen-data.mjs <dossier lucide-react/dist/esm>");

const data = join(app, "data");
const icons = join(app, "icons");
mkdirSync(data, { recursive: true });
mkdirSync(icons, { recursive: true });

const objectAfter = (text, marker) => {
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(marker);
  const open = text.indexOf("{", start + marker.length);
  let depth = 0;
  let quote = null;
  for (let at = open; at < text.length; at++) {
    const char = text[at];
    if (quote) {
      if (char === "\\") at++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return text.slice(open, at + 1);
  }
  throw new Error("fin introuvable");
};
const evaluate = (code) => new Function(`return (${code});`)();

const i18n = readFileSync(join(src, "i18n.ts"), "utf8");
writeFileSync(join(data, "i18n.json"), JSON.stringify({ fr: evaluate(objectAfter(i18n, "const fr = ")), en: evaluate(objectAfter(i18n, "const en: Record<Key, string> = ")) }));

const labels = readFileSync(join(src, "labels.ts"), "utf8");
writeFileSync(join(data, "labels.json"), JSON.stringify(evaluate(objectAfter(labels, "export const LABELS: Record<string, string> = "))));

const specs = readFileSync(join(src, "discordSpecs.ts"), "utf8");
const groups = /DISCORD_GROUPS: string\[\] = (\[.*?\]);/s.exec(specs)[1];
const modulesAt = specs.indexOf("export const DISCORD_MODULES");
const arrayStart = specs.indexOf("[", specs.indexOf("=", modulesAt));
const modules = specs.slice(arrayStart, specs.lastIndexOf("]") + 1);
writeFileSync(join(data, "discord.json"), JSON.stringify({ groups: evaluate(groups), modules: evaluate(modules) }));

const exports = readFileSync(join(lucide, "lucide-react.js"), "utf8");
const aliases = new Map();
for (const match of exports.matchAll(/export \{([^}]*)\} from '\.\/icons\/([a-z0-9-]+)\.js'/g)) {
  for (const part of match[1].split(",")) {
    const name = /default as (\w+)/.exec(part)?.[1];
    if (name) aliases.set(name, match[2]);
  }
}
const used = new Set();
for (const file of readdirSync(src).filter((name) => name.endsWith(".tsx"))) {
  const text = readFileSync(join(src, file), "utf8");
  for (const match of text.matchAll(/import \{([^}]*)\} from "lucide-react"/g)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) used.add(name);
    }
  }
}
for (const name of ["Menu", "Maximize2", "Minimize2", "Volume2", "CircleHelp", "Tag", "Music"]) used.add(name);

const table = [];
const write = (name, body) => {
  writeFileSync(join(icons, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ${body}</svg>`);
  table.push(name);
};
const attrs = (object) => Object.entries(object).filter(([key]) => key !== "key").map(([key, value]) => `${key}="${value}"`).join(" ");
for (const name of [...used].sort()) {
  const target = aliases.get(name);
  if (!target) throw new Error(`icône inconnue ${name}`);
  const code = readFileSync(join(lucide, "icons", `${target}.js`), "utf8");
  const node = evaluate(/__iconNode = (\[.*?\]);\n/s.exec(code)[1]);
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  write(kebab, `fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${node.map(([tag, props]) => `<${tag} ${attrs(props)}/>`).join("")}`);
}
const ui = readFileSync(join(src, "ui.tsx"), "utf8");
for (const [name, marker] of [["valorant", "function ValorantMark"], ["league", "function LeagueMark"]]) {
  const path = /d="([^"]+)"/.exec(ui.slice(ui.indexOf(marker)))[1];
  write(name, `fill="#fff"><path d="${path}"/>`);
}

const provider = readFileSync(join(src, "ProviderIcon.tsx"), "utf8");
for (const [name, marker] of [["provider-google", '"google"'], ["provider-github", '"github"'], ["provider-discord", "return ("]]) {
  const from = name === "provider-discord" ? provider.lastIndexOf(marker) : provider.indexOf(marker);
  const block = provider.slice(from, provider.indexOf("</svg>", from));
  const paths = [...block.matchAll(/<path[^>]* d="([^"]+)"[^>]*>/g)].map((match) => `<path d="${match[1]}"/>`).join("");
  write(name, `fill="#fff">${paths}`);
}

const rust = `pub const ICONS: &[(&str, &[u8])] = &[\n${table.sort().map((name) => `    ("${name}", include_bytes!("../icons/${name}.svg")),`).join("\n")}\n];\n`;
writeFileSync(join(app, "src", "icons_table.rs"), rust);

const assets = join(app, "assets");
mkdirSync(assets, { recursive: true });
for (const file of readdirSync(join(src, "assets", "modules")).filter((name) => !["kairo.png", "hdv-tracker.png"].includes(name))) copyFileSync(join(src, "assets", "modules", file), join(assets, file));
copyFileSync(join(src, "assets", "ethone-logo.png"), join(assets, "ethone-logo.png"));
if (!existsSync(join(app, "assets", "icon.ico"))) copyFileSync(join(desktop, "src-tauri", "icons", "icon.ico"), join(assets, "icon.ico"));
console.log(`${table.length} icônes`);
