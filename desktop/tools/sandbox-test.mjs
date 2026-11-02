import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const tauriDir = fileURLToPath(new URL("../src-tauri", import.meta.url));
const folder = mkdtempSync(join(tmpdir(), "ethone-sandbox-"));
const inside = "C:\\Users\\WDAGUtilityAccount\\Desktop\\ethone";

const output = execFileSync("cargo", ["test", "--no-run", "--message-format=json"], {
  cwd: tauriDir,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 1 << 28,
  env: { ...process.env, RUSTFLAGS: "-C target-feature=+crt-static", CARGO_TARGET_DIR: "target/sandbox" },
});
const test = output
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .filter((message) => message.executable && message.profile?.test)
  .at(-1);
copyFileSync(test.executable, join(folder, "ethone-test.exe"));

writeFileSync(
  join(folder, "run.cmd"),
  [
    "@echo off",
    "set ETHONE_SANDBOX=1",
    `${inside}\\ethone-test.exe --ignored --nocapture --test-threads=1 sandbox_install > ${inside}\\result.txt 2>&1`,
    `echo exit %ERRORLEVEL% >> ${inside}\\result.txt`,
    `echo done > ${inside}\\done.txt`,
    "shutdown /s /t 5",
    "",
  ].join("\r\n"),
);
writeFileSync(
  join(folder, "ethone.wsb"),
  `<Configuration>
  <Networking>Enable</Networking>
  <vGPU>Disable</vGPU>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>${folder}</HostFolder>
      <SandboxFolder>${inside}</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>${inside}\\run.cmd</Command>
  </LogonCommand>
</Configuration>
`,
);

spawn("cmd", ["/c", "start", "", "WindowsSandbox.exe", join(folder, "ethone.wsb")], { detached: true, stdio: "ignore" }).unref();

const deadline = Date.now() + 5 * 60 * 1000;
while (!existsSync(join(folder, "done.txt"))) {
  if (Date.now() > deadline) {
    console.error(`Pas de résultat après 5 minutes. Dossier : ${folder}`);
    process.exit(2);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
const result = readFileSync(join(folder, "result.txt"), "utf8");
console.log(result);
process.exit(result.includes("exit 0") ? 0 : 1);
