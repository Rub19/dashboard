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

import { parseTaskRequest } from "./note-intent";

describe("parseTaskRequest", () => {
  const now = new Date(2026, 8, 20, 10, 0, 0); // dimanche 20 septembre 2026

  it("cleans the title, capitalizes it and reads 'demain'", () => {
    const r = parseTaskRequest("Crée une tâche appeler le plombier demain", now);
    expect(r.title).toBe("Appeler le plombier");
    expect(new Date(r.dueDate as string).getDate()).toBe(21);
    expect(r.priority).toBe("medium");
  });

  it("reads urgency and removes it from the title", () => {
    const r = parseTaskRequest("ajoute une tâche payer la facture, c'est urgent", now);
    expect(r.title).toBe("Payer la facture");
    expect(r.priority).toBe("urgent");
  });

  it("reads a weekday as the next occurrence", () => {
    const r = parseTaskRequest("crée une tâche réunion équipe vendredi", now);
    expect(r.title).toBe("Réunion équipe");
    expect(new Date(r.dueDate as string).getDay()).toBe(5);
  });

  it("handles no date and no priority", () => {
    const r = parseTaskRequest("créer une tâche ranger le bureau", now);
    expect(r.title).toBe("Ranger le bureau");
    expect(r.dueDate).toBeNull();
  });

  it("falls back to a default title", () => {
    expect(parseTaskRequest("crée une tâche", now).title).toBe("Nouvelle tâche Brain");
  });
});
