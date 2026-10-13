import { formatSpeed, formatTimeLeft, fileExtension } from "./upload";

describe("formatSpeed", () => {
  it("gère les vitesses nulles, négatives et non finies", () => {
    expect(formatSpeed(0)).toBe("0 B/s");
    expect(formatSpeed(NaN)).toBe("0 B/s");
    expect(formatSpeed(Infinity)).toBe("0 B/s");
    expect(formatSpeed(-100)).toBe("0 B/s");
  });

  it("formate les octets par seconde", () => {
    expect(formatSpeed(500)).toBe("500 B/s");
  });

  it("formate les KB/s", () => {
    expect(formatSpeed(1024)).toBe("1 KB/s");
    expect(formatSpeed(2048)).toBe("2 KB/s");
  });

  it("formate les MB/s et GB/s", () => {
    expect(formatSpeed(1048576 * 3)).toBe("3 MB/s");
    expect(formatSpeed(1073741824 * 2.5)).toBe("2.5 GB/s");
  });
});

describe("formatTimeLeft", () => {
  it("renvoie infini pour les valeurs négatives, nulles ou non finies", () => {
    expect(formatTimeLeft(0)).toBe("∞");
    expect(formatTimeLeft(-5)).toBe("∞");
    expect(formatTimeLeft(Infinity)).toBe("∞");
    expect(formatTimeLeft(NaN)).toBe("∞");
  });

  it("renvoie <1 pour moins d'une seconde", () => {
    expect(formatTimeLeft(0.4)).toBe("<1");
  });

  it("arrondit au supérieur pour les secondes positives", () => {
    expect(formatTimeLeft(5.2)).toBe("6");
    expect(formatTimeLeft(12)).toBe("12");
  });
});

describe("fileExtension", () => {
  it("extrait l'extension depuis le nom du fichier", () => {
    const file = new File([""], "document.pdf", { type: "application/pdf" });
    expect(fileExtension(file)).toBe("PDF");
  });

  it("extrait la dernière extension pour un nom avec plusieurs points", () => {
    const file = new File([""], "archive.tar.gz", { type: "application/gzip" });
    expect(fileExtension(file)).toBe("GZ");
  });

  it("utilise le type MIME lorsque le nom ne comporte pas d'extension", () => {
    const file = new File([""], "sans-extension", { type: "image/png" });
    expect(fileExtension(file)).toBe("PNG");
  });

  it("renvoie FILE par défaut en l'absence d'extension et de type", () => {
    const file = new File([""], "fichier", { type: "" });
    expect(fileExtension(file)).toBe("FILE");
  });
});
