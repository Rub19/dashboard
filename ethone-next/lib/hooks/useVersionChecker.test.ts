import { isNewerBuild, builtVersion, syncStoreFromStorage } from "./useVersionChecker";

describe("isNewerBuild", () => {
  it("même version et même commit : pas de mise à jour", () => {
    expect(isNewerBuild({ version: "1.28.116", commit: "abc" }, { version: "1.28.116", commit: "abc", buildAt: "2026-09-26T12:00:00.000Z" })).toBe(false);
  });
  it("version différente : mise à jour", () => {
    expect(isNewerBuild({ version: "1.28.115", commit: "abc" }, { version: "1.28.116", commit: "abc" })).toBe(true);
  });
  it("même version, autre commit : mise à jour", () => {
    expect(isNewerBuild({ version: "1.28.116", commit: "abc" }, { version: "1.28.116", commit: "def" })).toBe(true);
  });
  it("avec une date de build connue, un déploiement plus récent est détecté", () => {
    expect(isNewerBuild({ version: "1", commit: null, buildAt: "2026-09-26T10:00:00.000Z" }, { version: "1", commit: null, buildAt: "2026-09-26T11:00:00.000Z" })).toBe(true);
  });
});

describe("builtVersion", () => {
  const OLD = process.env.NEXT_PUBLIC_BUILD_VERSION;
  afterEach(() => {
    if (OLD === undefined) delete process.env.NEXT_PUBLIC_BUILD_VERSION;
    else process.env.NEXT_PUBLIC_BUILD_VERSION = OLD;
  });
  it("vide sans version embarquée", () => {
    delete process.env.NEXT_PUBLIC_BUILD_VERSION;
    expect(builtVersion()).toBeNull();
  });
  it("renvoie la version embarquée", () => {
    process.env.NEXT_PUBLIC_BUILD_VERSION = "1.28.116";
    expect(builtVersion()?.version).toBe("1.28.116");
  });
});

describe("syncStoreFromStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("maintient hasUpdate true lors du rechargement avec une mise a jour en attente", () => {
    localStorage.setItem("ethone:version", JSON.stringify({ version: "1.75.40" }));
    localStorage.setItem("ethone:pending-update", JSON.stringify({ version: "1.75.41" }));
    const state = syncStoreFromStorage();
    expect(state.hasUpdate).toBe(true);
    expect(state.newData?.version).toBe("1.75.41");
  });

  it("hasUpdate est false quand la version a ete explicitement rejetee ou acquittee", () => {
    localStorage.setItem("ethone:version", JSON.stringify({ version: "1.75.40" }));
    localStorage.setItem("ethone:pending-update", JSON.stringify({ version: "1.75.41" }));
    localStorage.setItem("ethone:dismissed-version", "1.75.41");
    const state = syncStoreFromStorage();
    expect(state.hasUpdate).toBe(false);
  });

  it("hasUpdate est false sans mise a jour en attente", () => {
    localStorage.setItem("ethone:version", JSON.stringify({ version: "1.75.40" }));
    const state = syncStoreFromStorage();
    expect(state.hasUpdate).toBe(false);
  });
});
