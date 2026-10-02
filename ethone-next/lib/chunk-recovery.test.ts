import { CHUNK_RECOVERY_SCRIPT, isChunkLoadFailure } from "./chunk-recovery";

describe("isChunkLoadFailure", () => {
  it("reconnaît les échecs de chargement de code (Next/Turbopack, navigateurs)", () => {
    expect(isChunkLoadFailure("Failed to load chunk /_next/static/chunks/1jvrfiexpsxf6.js from module 326482")).toBe(true);
    expect(isChunkLoadFailure("", "ChunkLoadError")).toBe(true);
    expect(isChunkLoadFailure("Failed to fetch dynamically imported module: https://ethone.dev/x.js")).toBe(true);
    expect(isChunkLoadFailure("", "", "https://ethone.dev/_next/static/chunks/abc.js")).toBe(true);
  });
  it("ignore les autres erreurs", () => {
    expect(isChunkLoadFailure("TypeError: x is undefined")).toBe(false);
    expect(isChunkLoadFailure("", "", "https://cdn.example.com/widget.js")).toBe(false);
  });
});

describe("CHUNK_RECOVERY_SCRIPT", () => {
  it("est du JavaScript valide, autonome", () => {
    expect(() => new Function(CHUNK_RECOVERY_SCRIPT)).not.toThrow();
  });
});
