#!/usr/bin/env node
// Construit la bibliothèque d'avatars ETHONE à partir des dossiers locaux de plateformes :
//
//   <source>\<plateforme>\<série ou catégorie>\<image>.png|jpg|jpeg|webp
//
// Chaque sous-dossier devient une série (son nom est repris tel quel), chaque image un avatar. Les images sont
// recadrées en carré (sans déformation), converties en WebP 256 px dans public/avatars/library/<plateforme>/<série>/,
// et le catalogue est écrit dans lib/identity/avatar-library.json (site) et public/avatars/library/catalog.json
// (lu par l'app iOS). Le chemin d'origine de chaque image est conservé dans le champ `origin`.
//
// Les fichiers sources ne sont jamais modifiés, déplacés ni supprimés : le script ne fait que les lire.
//
//   node scripts/build-avatar-library.mjs                     → source par défaut C:\ETHONE-Avatars
//   node scripts/build-avatar-library.mjs "D:\Mes avatars"    → autre dossier source
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const OUT = path.join(ROOT, "public/avatars/library");
const MANIFEST = path.join(ROOT, "lib/identity/avatar-library.json");
const SOURCE = process.argv[2] || "C:\\ETHONE-Avatars";
const SIZE = 256;

/** Ordre d'affichage des plateformes (comme les boutons du sélecteur). */
const PLATFORMS = [
  { id: "crunchyroll", label: "Crunchyroll" },
  { id: "netflix", label: "Netflix" },
  { id: "hbo", label: "HBO" },
  { id: "prime-video", label: "Prime Video" },
  { id: "disney", label: "Disney+" },
];
/** Dossiers de travail qui ne sont pas des séries (images pas encore triées, exports) : ignorés. */
const SKIP_FOLDER = /^(à|a) classer$|^images_par_ordre$/i;
const IMAGE = /\.(png|jpe?g|webp)$/i;

const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (s) => fold(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const natural = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** Windows remplace « : » par « _ » dans les noms de dossiers (« Dune_ Part Two ») : on remet les deux-points. */
const seriesLabel = (folder) => folder.replace(/_ /g, ": ").replace(/_$/, "").trim();

/** Nom lisible d'un fichier : sans extension ni empreinte de fichier (« -C_qonjjQ »), ni préfixe commun à la série. */
function baseTokens(file) {
  let base = file.replace(IMAGE, "");
  const hash = base.match(/-([A-Za-z0-9_-]{8})$/);
  if (hash && /[A-Z0-9]/.test(hash[1])) base = base.slice(0, -9);
  return base.split(/[\s_-]+/).filter(Boolean);
}
function displayNames(files, series) {
  const tokens = files.map(baseTokens);
  // Préfixe commun à tous les fichiers de la série (« aot fc », « disney »…), retiré s'il reste un nom derrière.
  let common = 0;
  if (tokens.length > 1) {
    while (tokens.every((t) => t.length > common + 1 && t[common].toLowerCase() === tokens[0][common].toLowerCase())) common++;
  }
  const seriesWords = fold(series).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.map((t, i) => {
    let words = t.slice(common).filter((w) => w.toLowerCase() !== "avatar");
    // Mention technique de Prime Video (« couleurdefond orange ») : tout ce qui suit est retiré.
    const cut = words.findIndex((w) => /^couleurdefond/i.test(w));
    if (cut > 0) words = words.slice(0, cut);
    // Numéro d'ordre en tête (« 1056 ») puis nom de la série répété (« Black Clover Asta » → « Asta »).
    while (words.length > 1 && /^\d+$/.test(words[0])) words = words.slice(1);
    const lead = words.map((w) => fold(w).toLowerCase());
    if (words.length > seriesWords.length && seriesWords.every((w, k) => lead[k] === w)) words = words.slice(seriesWords.length);
    if (!words.length || words.every((w) => /^\d+$/.test(w))) return `${series} ${i + 1}`;
    return words.map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
  });
}

if (!fs.existsSync(SOURCE)) {
  console.error(`Dossier source introuvable : ${SOURCE}`);
  process.exit(1);
}

// La bibliothèque publiée est entièrement reconstruite (les anciennes collections disparaissent).
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const collections = [];
const skipped = [];
for (const platform of PLATFORMS) {
  const dir = path.join(SOURCE, platform.id);
  if (!fs.existsSync(dir)) {
    console.log(`▷ ${platform.label} : dossier absent, ignoré`);
    continue;
  }
  const items = [];
  const seriesFolders = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(natural.compare);
  for (const folder of seriesFolders) {
    if (SKIP_FOLDER.test(folder)) {
      skipped.push(`${platform.id}/${folder}`);
      continue;
    }
    const files = fs.readdirSync(path.join(dir, folder)).filter((f) => IMAGE.test(f)).sort(natural.compare);
    if (!files.length) continue;
    const series = seriesLabel(folder);
    const names = displayNames(files, series);
    const seen = new Set();
    const used = new Set();
    for (const [i, file] of files.entries()) {
      const origin = path.join(platform.id, folder, file);
      const buf = fs.readFileSync(path.join(SOURCE, origin));
      const hash = crypto.createHash("sha1").update(buf).digest("hex");
      if (seen.has(hash)) continue; // doublon exact dans la même série
      seen.add(hash);
      let key = slug(names[i]);
      for (let n = 2; used.has(key); n++) key = `${slug(names[i])}-${n}`;
      used.add(key);
      const rel = `${platform.id}/${slug(series)}/${key}.webp`;
      const out = path.join(OUT, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      try {
        // Recadrage carré centré (cover) : jamais d'étirement ; le cercle est fait à l'affichage.
        await sharp(buf).resize(SIZE, SIZE, { fit: "cover", position: "centre" }).webp({ quality: 84 }).toFile(out);
      } catch (err) {
        console.warn(`  ⚠ image illisible, ignorée : ${origin} (${err.message})`);
        continue;
      }
      items.push({
        id: `${platform.id}-${slug(series)}-${key}`,
        name: names[i],
        series,
        url: `/avatars/library/${rel}`,
        origin: origin.split(path.sep).join("/"),
      });
    }
  }
  console.log(`▶ ${platform.label} : ${new Set(items.map((a) => a.series)).size} séries, ${items.length} avatars`);
  collections.push({ id: platform.id, label: platform.label, source: platform.label, items });
}

const manifest = { size: SIZE, source: "ETHONE-Avatars", collections };
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
// Copie publique du catalogue, lue par l'app iOS.
fs.writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify(manifest));
if (skipped.length) console.log(`ⓘ Dossiers ignorés (pas des séries) : ${skipped.join(", ")}`);
console.log(`✔ ${collections.reduce((n, c) => n + c.items.length, 0)} avatars → ${path.relative(ROOT, MANIFEST)}`);
