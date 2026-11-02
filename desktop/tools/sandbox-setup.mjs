import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const installer = join(root, "out", `Ethone-Setup-${version}.exe`);
if (!existsSync(installer)) throw new Error(`Installeur introuvable : ${installer}`);

const folder = mkdtempSync(join(tmpdir(), "ethone-setup-sandbox-"));
const inside = "C:\\Users\\WDAGUtilityAccount\\Desktop\\ethone";
copyFileSync(installer, join(folder, "Ethone-Setup.exe"));
copyFileSync(join(root, "tools/sandbox-setup.ps1"), join(folder, "test.ps1"));
writeFileSync(
  join(folder, "ethone.wsb"),
  `<Configuration>
  <Networking>Enable</Networking>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>${folder}</HostFolder>
      <SandboxFolder>${inside}</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>powershell -NoProfile -ExecutionPolicy Bypass -File ${inside}\\test.ps1 -Folder ${inside}</Command>
  </LogonCommand>
</Configuration>
`,
);

spawn("cmd", ["/c", "start", "", "WindowsSandbox.exe", join(folder, "ethone.wsb")], { detached: true, stdio: "ignore" }).unref();

const deadline = Date.now() + 8 * 60 * 1000;
while (!existsSync(join(folder, "done.txt"))) {
  if (Date.now() > deadline) {
    console.error(`Pas de fin après 8 minutes. Dossier : ${folder}`);
    if (existsSync(join(folder, "result.txt"))) console.log(readFileSync(join(folder, "result.txt"), "utf8"));
    process.exit(2);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
console.log(readFileSync(join(folder, "result.txt"), "utf8"));
console.log(`Dossier : ${folder}`);
