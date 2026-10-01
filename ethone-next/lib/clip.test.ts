import { encodeClip, parseClip } from "./clip";

describe("parseClip", () => {
  it("lit un clip valide", () => {
    expect(parseClip(encodeClip({ t: " Titre ", u: "https://ex.com/a", s: "texte" }))).toEqual({
      title: "Titre",
      url: "https://ex.com/a",
      selection: "texte",
    });
  });

  it("refuse les schémas d'URL non http(s)", () => {
    expect(parseClip(encodeClip({ t: "x", u: "javascript:alert(1)" }))?.url).toBe("");
  });

  it("borne les longueurs et ignore les types inattendus", () => {
    const c = parseClip(encodeClip({ t: "a".repeat(500), s: 42 as unknown as string }));
    expect(c?.title).toHaveLength(200);
    expect(c?.selection).toBe("");
  });

  it("renvoie null pour un hash vide, invalide ou sans contenu", () => {
    expect(parseClip("")).toBeNull();
    expect(parseClip("#%E0%A4%A")).toBeNull();
    expect(parseClip(encodeClip({}))).toBeNull();
  });
});
