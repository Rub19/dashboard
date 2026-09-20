import { resolveAccent } from "./theme-engine";
import { migrateSettings } from "./settings";

describe("resolveAccent", () => {
  it("auto follows the active theme", () => {
    expect(resolveAccent("dyno-rose", "auto")).toBe("#C1234F");
    expect(resolveAccent("aurora", "auto")).toBe("#2dd4bf");
    expect(resolveAccent("forest", undefined)).toBe("#10b981");
  });

  it("a named accent wins over the theme", () => {
    expect(resolveAccent("dyno-rose", "violet")).toBe("#8b5cf6");
  });

  it("custom uses the picked hex, and falls back to the theme when invalid", () => {
    expect(resolveAccent("aurora", "custom", "#123456")).toBe("#123456");
    expect(resolveAccent("aurora", "custom", "not-a-color")).toBe("#2dd4bf");
  });

  it("unknown values fall back to the theme accent instead of pink", () => {
    expect(resolveAccent("aurora", "mystery")).toBe("#2dd4bf");
  });
});

describe("accent migration", () => {
  it("turns the legacy default 'dyno' into auto", () => {
    expect(migrateSettings({ accentColor: "dyno" }).accentColor).toBe("auto");
  });

  it("turns a custom accent equal to the theme's own accent into auto", () => {
    expect(migrateSettings({ theme: "dyno-rose", accentColor: "custom", customAccent: "#C1234F" }).accentColor).toBe("auto");
  });

  it("keeps a genuinely custom accent", () => {
    expect(migrateSettings({ theme: "dyno-rose", accentColor: "custom", customAccent: "#00ff00" }).accentColor).toBe("custom");
  });

  it("keeps an explicitly chosen named accent", () => {
    expect(migrateSettings({ accentColor: "mint" }).accentColor).toBe("mint");
  });
});
