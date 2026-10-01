import { stripHtml, toSafeHtml } from "./RichTextEditor";

describe("toSafeHtml (contenu externe : e-mails, clips)", () => {
  it("retire scripts, gestionnaires d'événements et liens javascript:", () => {
    const out = toSafeHtml('<p onclick="x()">Salut<script>alert(1)</script></p><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">lien</a>');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("Salut");
    expect(out).toContain("lien");
  });

  it("garde les liens http(s) en nouvel onglet sûr", () => {
    const out = toSafeHtml('<a href="https://ethone.dev">ok</a>');
    expect(out).toContain('href="https://ethone.dev"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("convertit le texte brut en paragraphes sans l'interpréter", () => {
    const out = toSafeHtml("ligne 1\nligne 2");
    expect(out).toBe("<p>ligne 1<br>ligne 2</p>");
  });

  it("stripHtml ne renvoie que du texte", () => {
    expect(stripHtml('<b>gras</b> <img src=x onerror="alert(1)">texte')).toBe("gras texte");
  });
});
