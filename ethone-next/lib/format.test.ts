import { formatBytes } from "./format";

describe("formatBytes", () => {
  it("renvoie la valeur vide par défaut pour zéro", () => {
    expect(formatBytes(0)).toBe("0 o");
  });

  it("supporte une chaîne vide personnalisée", () => {
    expect(formatBytes(0, { empty: "Vide" })).toBe("Vide");
  });

  it("gère les octets sans décimale", () => {
    expect(formatBytes(500)).toBe("500 o");
  });

  it("formate correctement les Ko", () => {
    expect(formatBytes(1024)).toBe("1.0 Ko");
    expect(formatBytes(1536)).toBe("1.5 Ko");
  });

  it("formate correctement les Mo", () => {
    expect(formatBytes(1048576)).toBe("1.0 Mo");
    expect(formatBytes(2621440)).toBe("2.5 Mo");
  });

  it("formate correctement les Go et To", () => {
    expect(formatBytes(1073741824)).toBe("1.0 Go");
    expect(formatBytes(1099511627776)).toBe("1.0 To");
  });

  it("accepte des valeurs numériques sous forme de chaînes", () => {
    expect(formatBytes("2048")).toBe("2.0 Ko");
  });

  it("gère les entrées invalides et NaN comme zéro", () => {
    expect(formatBytes("invalide")).toBe("0 o");
    expect(formatBytes(NaN)).toBe("0 o");
  });
});
