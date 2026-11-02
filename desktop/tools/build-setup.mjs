import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const keyFile = join(homedir(), ".tauri", "ethone-updater.key");
if (!existsSync(keyFile)) throw new Error(`Clé de signature introuvable : ${keyFile}`);
const run = (command, cwd = root, env = {}) => execSync(command, { cwd, stdio: "inherit", env: { ...process.env, ...env } });

const appConf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const { version } = appConf;
run("npx tauri build --bundles nsis", root, { TAURI_SIGNING_PRIVATE_KEY: readFileSync(keyFile, "utf8"), TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "" });

const bundle = join(root, "src-tauri/target/release/bundle/nsis");
const nsis = join(bundle, `Ethone_${version}_x64-setup.exe`);
const setup = join(root, "setup");
mkdirSync(join(setup, "payload"), { recursive: true });
copyFileSync(nsis, join(setup, "payload/ethone-setup.exe"));

const setupConfPath = join(setup, "tauri.conf.json");
const setupConf = JSON.parse(readFileSync(setupConfPath, "utf8"));
setupConf.version = version;
writeFileSync(setupConfPath, JSON.stringify(setupConf, null, 2) + "\n");
const cargoPath = join(setup, "Cargo.toml");
writeFileSync(cargoPath, readFileSync(cargoPath, "utf8").replace(/^version = ".*"$/m, `version = "${version}"`));

run("npx vite build --config vite.setup.config.ts");
run("npx tauri build --no-bundle", setup);

const out = join(root, "out");
mkdirSync(out, { recursive: true });
const final = join(out, `Ethone-Setup-${version}.exe`);
copyFileSync(join(setup, "target/release/ethone-setup.exe"), final);
copyFileSync(nsis, join(out, `Ethone_${version}_x64-setup.exe`));
copyFileSync(`${nsis}.sig`, join(out, `Ethone_${version}_x64-setup.exe.sig`));
writeFileSync(
  join(out, "latest.json"),
  JSON.stringify(
    {
      version,
      notes: process.argv[2] ?? "",
      pub_date: new Date().toISOString(),
      platforms: {
        "windows-x86_64": {
          signature: readFileSync(`${nsis}.sig`, "utf8").trim(),
          url: `https://github.com/Rub19/dashboard/releases/download/desktop-v${version}/Ethone_${version}_x64-setup.exe`,
        },
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(`Prêt dans ${out}`);
