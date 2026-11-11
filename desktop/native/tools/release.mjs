import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const native = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readFileSync(join(native, "app", "Cargo.toml"), "utf8");
const version = /^version = "([^"]+)"/m.exec(manifest)?.[1];
if (!version) throw new Error("version introuvable dans app/Cargo.toml");
const skipBuild = process.argv.includes("--skip-build");
const notes = process.argv.find((arg) => arg.startsWith("--notes="))?.slice(8) ?? "";
const release = join(native, "target", "release");
const out = join(native, "target", "publish");
const name = `Ethone_${version}_x64-setup.exe`;
const installer = join(out, name);

const run = (command, args, options = {}) => execFileSync(command, args, { cwd: native, stdio: "inherit", shell: process.platform === "win32" && command === "npx", ...options });

if (!skipBuild) run("cargo", ["build", "-p", "ethone-native", "-p", "ethone-setup", "--release", "--locked"]);
mkdirSync(out, { recursive: true });
run(join(release, "ethone-setup.exe"), ["--pack", join(release, "ethone-native.exe"), installer]);

if (!process.env.TAURI_SIGNING_PRIVATE_KEY && !process.env.TAURI_SIGNING_PRIVATE_KEY_PATH) {
  console.log(`Installeur prêt, non signé : ${installer}`);
  console.log("Définis TAURI_SIGNING_PRIVATE_KEY (et son mot de passe) pour produire la signature et latest.json.");
  process.exit(0);
}
run("npx", ["--yes", "@tauri-apps/cli@2", "signer", "sign", `"${installer}"`], { env: { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "" } });
const signature = readFileSync(`${installer}.sig`, "utf8").trim();
const feed = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/Rub19/dashboard/releases/download/desktop-v${version}/${name}`,
    },
  },
};
writeFileSync(join(out, "latest.json"), `${JSON.stringify(feed, null, 2)}\n`);
copyFileSync(installer, join(out, "Ethone-Setup-" + version + ".exe"));
console.log(`Prêt à publier dans ${out} (tag desktop-v${version}). Rien n'a été publié.`);
