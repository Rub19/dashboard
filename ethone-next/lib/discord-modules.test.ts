import fs from "node:fs";
import path from "node:path";
import { DISCORD_MODULES } from "./discord-modules";

describe("DISCORD_MODULES (index de la palette de commandes)", () => {
  it("a des identifiants uniques et des adresses /discord/…", () => {
    const ids = DISCORD_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of DISCORD_MODULES) {
      expect(m.href.startsWith("/discord/")).toBe(true);
      expect(m.href.endsWith("/")).toBe(false);
      expect(m.title.length).toBeGreaterThan(1);
    }
  });

  it("pointe vers des pages qui existent réellement", () => {
    for (const m of DISCORD_MODULES) {
      const dir = path.join(__dirname, "..", "app", ...m.href.split("/").filter(Boolean));
      expect(fs.existsSync(path.join(dir, "page.tsx"))).toBe(true);
    }
  });

  it("couvre tous les modules du hub Discord", () => {
    const hub = fs.readFileSync(path.join(__dirname, "..", "app", "discord", "page.tsx"), "utf8");
    const ids = [...hub.matchAll(/^\s{4}id: "(\w+)",\r?\n\s{4}title:/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    const known = new Set(DISCORD_MODULES.map((m) => m.id));
    const missing = ids.filter((id) => !known.has(id));
    expect(missing).toEqual([]);
  });
});
