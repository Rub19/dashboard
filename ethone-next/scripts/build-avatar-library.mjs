#!/usr/bin/env node
// Construit la bibliothèque d'avatars ETHONE : télécharge les images sources, les recadre en carré, les convertit
// en WebP 256 px dans public/avatars/library/<collection>/ et écrit le catalogue lib/identity/avatar-library.json.
// Les images sont hébergées sur le site (pas de lien vers un CDN tiers qui pourrait casser).
//
//   node scripts/build-avatar-library.mjs            → tout reconstruire
//   node scripts/build-avatar-library.mjs anime lol  → seulement ces collections (les autres restent dans le catalogue)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const OUT = path.join(ROOT, "public/avatars/library");
const MANIFEST = path.join(ROOT, "lib/identity/avatar-library.json");
const SIZE = 256;
const only = new Set(process.argv.slice(2));
const want = (id) => only.size === 0 || only.has(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function get(url, type = "buffer", tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "ethone-avatar-builder/1.0" } });
      if (res.status === 429) { await sleep(4000 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return type === "json" ? await res.json() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

async function writeWebp(collection, id, input, opts = {}) {
  const dir = path.join(OUT, collection);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.webp`);
  let img = sharp(input).resize(SIZE, SIZE, { fit: "cover", position: opts.position || "centre" });
  if (opts.background) {
    const fg = await img.png().toBuffer();
    img = sharp(opts.background).resize(SIZE, SIZE).composite([{ input: fg }]);
  }
  await img.webp({ quality: 84 }).toFile(file);
  return `/avatars/library/${collection}/${id}.webp`;
}

const gradientSvg = (stops, angle = 160) => {
  const s = stops.map((c, i) => `<stop offset="${Math.round((i / Math.max(1, stops.length - 1)) * 100)}%" stop-color="${c}"/>`).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><defs><linearGradient id="g" gradientTransform="rotate(${angle - 90} .5 .5)">${s}</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
};
const radialSvg = (inner, outer) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><defs><radialGradient id="r" cx="50%" cy="42%" r="70%"><stop offset="0%" stop-color="${inner}"/><stop offset="100%" stop-color="${outer}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#r)"/></svg>`);

// ─────────────────────────────── Netflix (icônes officielles importées du Drive)
const NETFLIX_KEEP = {
  "the-classics": "Netflix Classics",
  "stranger-things": "Stranger Things",
  "money-heist": "La casa de papel",
  "black-mirror": "Black Mirror",
  "bojack-horseman": "BoJack Horseman",
  "big-mouth": "Big Mouth",
  "the-dark-crystal-age-of-resistance": "The Dark Crystal",
  "the-dragon-prince": "The Dragon Prince",
  "she-ra-and-the-princess-of-power": "She-Ra",
  "voltron-legendary-defender": "Voltron",
  "lost-in-space": "Lost in Space",
  "orange-is-the-new-black": "Orange Is the New Black",
  aggretsuko: "Aggretsuko",
  "carmen-sandiego": "Carmen Sandiego",
  defenders: "Marvel's The Defenders",
  bright: "Bright",
  "house-of-cards": "House of Cards",
  lucifer: "Lucifer",
  okja: "Okja",
  "our-planet": "Our Planet",
  "dear-white-people": "Dear White People",
  "on-my-block": "On My Block",
  "unbreakable-kimmy-schmidt": "Unbreakable Kimmy Schmidt",
  "a-series-of-unfortunate-events": "Les Désastreuses Aventures",
  "troll-hunters-tales-of-arcadia": "Chasseurs de Trolls",
  "3below-tales-of-arcadia": "3Below",
  "one-day-at-a-time": "One Day at a Time",
  "queer-eye-more-than-a-makeover": "Queer Eye",
};

async function buildNetflix() {
  const src = path.join(ROOT, "assets/avatar-sources/netflix");
  const seen = new Set();
  const items = [];
  // Ordre de NETFLIX_KEEP (séries phares d'abord), puis numéro de l'icône.
  const rank = (f) => Object.keys(NETFLIX_KEEP).indexOf(f.replace(/-\d+\.\w+$/, ""));
  for (const f of fs.readdirSync(src).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) {
    const m = f.match(/^(.*)-(\d+)\.(png|jpg|webp)$/);
    if (!m || !NETFLIX_KEEP[m[1]]) continue;
    const buf = fs.readFileSync(path.join(src, f));
    const hash = crypto.createHash("sha1").update(buf).digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);
    const series = NETFLIX_KEEP[m[1]];
    const id = `${m[1]}-${m[2]}`;
    items.push({ id: `netflix-${id}`, name: `${series} ${Number(m[2])}`, series, url: await writeWebp("netflix", id, buf) });
  }
  return { id: "netflix", label: "Netflix", source: "Icônes de profil Netflix", items };
}

// ─────────────────────────────── Anime (AniList : personnages les plus aimés de chaque série)
const ANIME = [
  "Jujutsu Kaisen", "One Piece", "Kimetsu no Yaiba", "Chainsaw Man", "Ore dake Level Up na Ken", "Naruto: Shippuuden",
  "Shingeki no Kyojin", "SPY×FAMILY", "Sousou no Frieren", "Dragon Ball Z", "Boku no Hero Academia", "Hunter x Hunter (2011)",
  "BLEACH: Sennen Kessen-hen", "DEATH NOTE", "Tokyo Ghoul", "Dandadan", "Blue Lock", "Haikyuu!!", "One Punch Man",
  "Kaijuu 8-gou", "SAKAMOTO DAYS", "Oshi no Ko", "Mob Psycho 100", "Hagane no Renkinjutsushi: FULLMETAL ALCHEMIST",
  "Cyberpunk: Edgerunners", "Code Geass: Hangyaku no Lelouch", "Steins;Gate", "Vinland Saga", "Bocchi the Rock!",
  "Re:Zero kara Hajimeru Isekai Seikatsu", "Neon Genesis Evangelion", "JoJo no Kimyou na Bouken", "Black Clover",
  "Kusuriya no Hitorigoto", "Tengoku Daimakyou",
];
const ANILIST_Q = `query ($s: String) { Media(search: $s, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english }
  characters(sort: FAVOURITES_DESC, perPage: 5) { nodes { id name { full } image { large } } } } }`;

async function buildAnime() {
  const items = [];
  const seenChar = new Set();
  for (const s of ANIME) {
    let media;
    for (let i = 0; i < 4 && !media; i++) {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query: ANILIST_Q, variables: { s } }),
      });
      if (res.status === 429) { await sleep(60_000); continue; }
      media = (await res.json())?.data?.Media;
      if (!media) break;
    }
    if (!media) { console.warn("  anime introuvable :", s); continue; }
    const series = media.title.english || media.title.romaji;
    console.log("  ", series);
    for (const c of media.characters.nodes) {
      if (!c.image?.large || /default\.jpg/.test(c.image.large) || seenChar.has(c.id)) continue;
      seenChar.add(c.id);
      const buf = await get(c.image.large);
      const id = slug(`${series}-${c.name.full}`).slice(0, 80);
      // Portraits AniList (≈230×345) : visage en haut → carré recadré depuis le haut.
      items.push({ id: `anime-${id}`, name: c.name.full, series, url: await writeWebp("anime", id, buf, { position: "top" }) });
    }
    await sleep(2200); // AniList : ~30 requêtes/min en mode dégradé
  }
  return { id: "anime", label: "Anime", source: "Portraits officiels via AniList", items };
}

// ─────────────────────────────── Valorant (tous les agents, sur leur dégradé officiel)
async function buildValorant() {
  const { data } = await get("https://valorant-api.com/v1/agents?isPlayableCharacter=true", "json");
  const items = [];
  for (const a of data.sort((x, y) => x.displayName.localeCompare(y.displayName))) {
    const colors = (a.backgroundGradientColors || []).map((c) => `#${c.slice(0, 6)}`);
    const bg = gradientSvg(colors.length ? colors.slice(0, 3) : ["#1f2937", "#0f172a"]);
    const id = slug(a.displayName);
    items.push({ id: `valorant-${id}`, name: a.displayName, series: "Valorant", url: await writeWebp("valorant", id, await get(a.displayIcon), { background: bg }) });
  }
  return { id: "valorant", label: "Valorant", source: "valorant-api.com", items };
}

// ─────────────────────────────── League of Legends (champions populaires, vignettes Data Dragon)
const LOL = ["Ahri", "Jinx", "Yasuo", "Yone", "Lux", "Ezreal", "Thresh", "LeeSin", "Kaisa", "Akali", "Zed", "Vi", "Caitlyn", "Ekko",
  "Viego", "Seraphine", "MissFortune", "Katarina", "Darius", "Garen", "Teemo", "Sett", "Pyke", "Senna", "Lucian", "Riven", "Irelia",
  "Aatrox", "Sylas", "Morgana", "Leona", "Aphelios", "Samira", "Gwen", "Briar", "Hwei", "Smolder", "Ambessa", "Mel", "Jhin",
  "Kayn", "Evelynn", "Nami", "Sona", "Lulu", "Vex", "Zoe", "Neeko", "Draven", "Warwick"];

async function buildLol() {
  const [version] = await get("https://ddragon.leagueoflegends.com/api/versions.json", "json");
  const champs = (await get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`, "json")).data;
  const items = [];
  for (const key of LOL) {
    const c = champs[key];
    if (!c) { console.warn("  champion inconnu :", key); continue; }
    const id = slug(c.id);
    const buf = await get(`https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${c.id}_0.jpg`);
    items.push({ id: `lol-${id}`, name: c.name, series: "League of Legends", url: await writeWebp("lol", id, buf, { position: "top" }) });
  }
  return { id: "lol", label: "League of Legends", source: "Riot Data Dragon", items };
}

// ─────────────────────────────── Pokémon (illustrations officielles sur fond de leur type)
const TYPE = { electric: "#f7d02c", fire: "#ee8130", water: "#6390f0", grass: "#7ac74c", psychic: "#f95587", ghost: "#735797",
  dark: "#705746", dragon: "#6f35fc", fairy: "#d685ad", fighting: "#c22e28", normal: "#a8a77a", ice: "#96d9d6" };
const POKEMON = [[25, "Pikachu", "electric"], [6, "Dracaufeu", "fire"], [150, "Mewtwo", "psychic"], [94, "Ectoplasma", "ghost"],
  [448, "Lucario", "fighting"], [197, "Noctali", "dark"], [133, "Évoli", "normal"], [658, "Amphinobi", "water"], [384, "Rayquaza", "dragon"],
  [282, "Gardevoir", "fairy"], [143, "Ronflex", "normal"], [151, "Mew", "psychic"], [249, "Lugia", "psychic"], [250, "Ho-Oh", "fire"],
  [445, "Carchacrok", "dragon"], [700, "Nymphali", "fairy"], [196, "Mentali", "psychic"], [471, "Givrali", "ice"], [470, "Phyllali", "grass"],
  [135, "Voltali", "electric"], [134, "Aquali", "water"], [136, "Pyroli", "fire"], [491, "Darkrai", "dark"], [7, "Carapuce", "water"],
  [1, "Bulbizarre", "grass"], [4, "Salamèche", "fire"], [778, "Mimiqui", "ghost"], [887, "Lanssorien", "dragon"], [149, "Dracolosse", "dragon"],
  [257, "Braségali", "fire"]];

async function buildPokemon() {
  const items = [];
  for (const [n, name, type] of POKEMON) {
    const art = await get(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`);
    const c = TYPE[type];
    const fg = await sharp(art).resize(220, 220, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const bg = await sharp(radialSvg(c, "#0b0d14")).png().toBuffer();
    const composed = await sharp(bg).composite([{ input: fg, top: 22, left: 18 }]).png().toBuffer();
    const id = slug(name);
    items.push({ id: `pokemon-${id}`, name, series: "Pokémon", url: await writeWebp("pokemon", id, composed) });
  }
  return { id: "pokemon", label: "Pokémon", source: "PokeAPI (artwork officiel)", items };
}

// ─────────────────────────────── ETHONE Originals (logos officiels + déclinaisons aux couleurs des thèmes)
const ORIGINAL_THEMES = [
  ["dyno-rose", "Dyno Rose", ["#3b0a1a", "#c1234f", "#ff5c8a"]],
  ["obsidian", "Obsidian", ["#05060a", "#1f2433", "#4b5563"]],
  ["aurora", "Aurora", ["#04131f", "#0ea5a4", "#7c3aed"]],
  ["arctic", "Arctic", ["#e0f2fe", "#38bdf8", "#0369a1"]],
  ["cyber-neon", "Cyber Neon", ["#0a0014", "#d946ef", "#22d3ee"]],
  ["sunset", "Sunset", ["#1f0a0a", "#f97316", "#facc15"]],
  ["emerald", "Emerald", ["#03140e", "#059669", "#a7f3d0"]],
  ["royal", "Royal", ["#0b0a24", "#4338ca", "#c4b5fd"]],
  ["mono", "Mono", ["#0a0a0a", "#525252", "#f5f5f5"]],
];

async function buildOriginals() {
  const items = [];
  for (const [file, name] of [["ethone-discord-avatar-512.png", "ETHONE Quantum"], ["ethone-discord-avatar-solid.png", "ETHONE Solid"], ["ethone-discord-avatar.png", "ETHONE Classic"]]) {
    const id = slug(name);
    items.push({ id: `ethone-${id}`, name, series: "ETHONE", url: await writeWebp("ethone", id, fs.readFileSync(path.join(ROOT, "public/branding", file))) });
  }
  for (const [id, name, stops] of ORIGINAL_THEMES) {
    const light = id === "arctic";
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 256 256">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".55" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient>
      <radialGradient id="h" cx=".3" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="256" height="256" fill="url(#g)"/><rect width="256" height="256" fill="url(#h)"/>
      <circle cx="128" cy="128" r="74" fill="none" stroke="${light ? "#0f172a" : "#fff"}" stroke-opacity=".22" stroke-width="2"/>
      <path d="M100 86h62v16h-44v18h38v16h-38v18h44v16h-62z" fill="${light ? "#0f172a" : "#fff"}" fill-opacity=".92"/></svg>`);
    items.push({ id: `ethone-${id}`, name: `ETHONE ${name}`, series: "ETHONE", url: await writeWebp("ethone", id, svg) });
  }
  return { id: "ethone", label: "ETHONE Originals", source: "ETHONE", items };
}

const BUILDERS = { ethone: buildOriginals, netflix: buildNetflix, anime: buildAnime, valorant: buildValorant, lol: buildLol, pokemon: buildPokemon };

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { collections: [] };
const collections = [];
for (const [id, build] of Object.entries(BUILDERS)) {
  if (!want(id)) {
    const kept = previous.collections.find((c) => c.id === id);
    if (kept) collections.push(kept);
    continue;
  }
  console.log(`▶ ${id}`);
  fs.rmSync(path.join(OUT, id), { recursive: true, force: true });
  const col = await build();
  console.log(`  ${col.items.length} avatars`);
  collections.push(col);
}
fs.writeFileSync(MANIFEST, JSON.stringify({ size: SIZE, collections }, null, 1) + "\n");
console.log(`✔ ${collections.reduce((n, c) => n + c.items.length, 0)} avatars → ${path.relative(ROOT, MANIFEST)}`);
