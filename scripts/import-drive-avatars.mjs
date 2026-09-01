import fs from "node:fs/promises";
import path from "node:path";

const SRC = "C:/Users/storm/OneDrive - cepinm.org/Bureau/zdz";
const DST = "C:/Users/storm/dashboard/ethone-next/public/avatars/drive";
const SQL = "C:/Users/storm/dashboard/supabase/migrations/202609010002_seed_drive_avatars.sql";
const MANIFEST = "C:/Users/storm/dashboard/ethone-next/lib/identity/avatarDriveManifest.ts";

await fs.mkdir(DST, { recursive: true });

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeSql(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const entries = [];

for (const entry of await fs.readdir(SRC, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const series = entry.name;
  const seriesPath = path.join(SRC, series);
  const files = await fs.readdir(seriesPath);

  for (const file of files) {
    if (!file.toLowerCase().endsWith(".png")) continue;
    const base = path.parse(file).name;
    const id = slug(base);
    const ext = ".png";
    const filename = `${id}${ext}`;
    const srcPath = path.join(seriesPath, file);
    const dstPath = path.join(DST, filename);

    await fs.copyFile(srcPath, dstPath);

    const tags = JSON.stringify([slug(series), "netflix", "drive"]);
    entries.push({
      id,
      name: base,
      series,
      category: "netflix",
      kind: "avatar",
      rarity: "common",
      description: `Avatar from ${series}`,
      tags,
      asset_url: `/avatars/drive/${filename}`,
      thumbnail_url: `/avatars/drive/${filename}`,
      accent: "",
      status: "active",
      provider: "Netflix",
      source_type: "google_drive",
      franchise: series,
    });
  }
}

entries.sort((a, b) => a.id.localeCompare(b.id));

// Manifest TS
const manifestRows = entries
  .map(
    (e) =>
      `  { id: ${JSON.stringify(e.id)}, name: ${JSON.stringify(e.name)}, series: ${JSON.stringify(
        e.series
      )}, category: "netflix", kind: "avatar", rarity: "common", asset_url: ${JSON.stringify(
        e.asset_url
      )}, thumbnail_url: ${JSON.stringify(e.thumbnail_url)}, tags: ${e.tags}, status: "active" }`
  )
  .join(",\n");

await fs.writeFile(
  MANIFEST,
  `export const DRIVE_AVATARS = [\n${manifestRows}\n] as const;\n\nexport type DriveAvatar = (typeof DRIVE_AVATARS)[number];\n`,
  "utf8"
);

// SQL migration
let sql = `begin;

alter table public.ethone_identity_assets
  add column if not exists provider text not null default '',
  add column if not exists source_type text not null default '',
  add column if not exists franchise text not null default '';

create index if not exists ethone_identity_assets_provider_idx
  on public.ethone_identity_assets (provider);
create index if not exists ethone_identity_assets_franchise_idx
  on public.ethone_identity_assets (franchise);

insert into public.ethone_identity_assets
  (id, name, category, kind, rarity, description, tags, asset_url, thumbnail_url, accent, status, provider, source_type, franchise)
values\n`;

const sqlRows = entries
  .map(
    (e) =>
      `  (${escapeSql(e.id)}, ${escapeSql(e.name)}, ${escapeSql(e.category)}, ${escapeSql(
        e.kind
      )}, ${escapeSql(e.rarity)}, ${escapeSql(e.description)}, ${escapeSql(e.tags)}::jsonb, ${escapeSql(
        e.asset_url
      )}, ${escapeSql(e.thumbnail_url)}, ${escapeSql(e.accent)}, ${escapeSql(
        e.status
      )}, ${escapeSql(e.provider)}, ${escapeSql(e.source_type)}, ${escapeSql(e.franchise)})`
  )
  .join(",\n");

sql += sqlRows + `\n\non conflict (id) do nothing;\n\ncommit;\n`;

await fs.writeFile(SQL, sql, "utf8");

console.log(`Copied ${entries.length} avatars to ${DST}`);
console.log(`SQL written to ${SQL}`);
console.log(`Manifest written to ${MANIFEST}`);
