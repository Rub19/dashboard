import { effectiveFont, themeOriginFontLabel } from "./fonts";

describe("effectiveFont", () => {
  it("le choix global l'emporte sur la police du thème", () => {
    expect(effectiveFont({ fontFamily: "manrope", theme: "dyno-rose", themeFonts: { "dyno-rose": "oswald" } })).toBe("manrope");
  });

  it("sur « Police du thème », utilise la police choisie pour ce thème", () => {
    expect(effectiveFont({ fontFamily: "sans", theme: "dyno-rose", themeFonts: { "dyno-rose": "oswald" } })).toBe("oswald");
  });

  it("sans choix pour ce thème, garde sa police d'origine", () => {
    expect(effectiveFont({ fontFamily: "sans", theme: "burgundy", themeFonts: { "dyno-rose": "oswald" } })).toBe("sans");
    expect(effectiveFont({ fontFamily: "sans", theme: "burgundy" })).toBe("sans");
  });

  it("ignore une valeur inconnue stockée pour un thème", () => {
    expect(effectiveFont({ fontFamily: "sans", theme: "x", themeFonts: { x: "comic-sans" } })).toBe("sans");
  });
});

describe("themeOriginFontLabel", () => {
  it("reconnaît la police d'origine depuis la pile CSS", () => {
    expect(themeOriginFontLabel("var(--font-oswald), sans-serif")).toBe("Oswald");
    expect(themeOriginFontLabel(undefined)).toBe("Inter");
  });
});
