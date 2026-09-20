import { parseNoteRequest } from "./note-intent";

describe("parseNoteRequest", () => {
  it("extracts a clean title and a bullet list from an explicit request", () => {
    const r = parseNoteRequest("Crée une note intitulée Test Brain avec la liste : lait, pain, oeufs");
    expect(r.title).toBe("Test Brain");
    expect(r.content).toBe("- lait\n- pain\n- oeufs");
  });

  it("handles a topic-only request (content left to the AI)", () => {
    const r = parseNoteRequest("Peux-tu créer une note sur les idées de vacances");
    expect(r.title).toBe("Les idées de vacances");
    expect(r.content).toBeNull();
  });

  it("uses the text before 'avec' as title when no explicit name is given", () => {
    const r = parseNoteRequest("fais une note courses avec lait et pain");
    expect(r.title).toBe("Courses");
    expect(r.content).toBe("- lait\n- pain");
  });

  it("keeps a single sentence of content as plain text", () => {
    const r = parseNoteRequest("crée une note nommée Rappel : appeler le médecin demain");
    expect(r.title).toBe("Rappel");
    expect(r.content).toBe("appeler le médecin demain");
  });

  it("falls back to a default title", () => {
    expect(parseNoteRequest("crée une note").title).toBe("Nouvelle note Brain");
  });

  it("caps very long titles", () => {
    expect(parseNoteRequest("crée une note sur " + "x".repeat(200)).title.length).toBeLessThanOrEqual(80);
  });
});
