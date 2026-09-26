import { PRESET_THEMES, UNIVERSAL_ACCENTS, getContrastColor } from "./theme-tokens";

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function toHex(rgb: number[]): string {
  return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Pose une couleur rgba() éventuellement translucide (thème verre) sur le fond principal. */
function flatten(color: string, backdrop: string): string {
  const m = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (!m) return color;
  const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
  const base = channels(backdrop);
  const top = [Number(m[1]), Number(m[2]), Number(m[3])];
  return toHex(top.map((v, i) => v * alpha + base[i] * (1 - alpha)));
}

describe("contraste WCAG des thèmes prédéfinis", () => {
  for (const theme of Object.values(PRESET_THEMES)) {
    describe(theme.label, () => {
      it("utilise des couleurs hexadécimales exploitables", () => {
        for (const value of [theme.bgMain, flatten(theme.bgSurface, theme.bgMain), flatten(theme.bgCard, theme.bgMain), theme.textPrimary, theme.textSecondary, theme.textMuted, theme.accentPrimary, theme.accentContrast]) {
          expect(value).toMatch(HEX);
        }
      });

      it("texte principal et secondaire lisibles (AA 4.5:1) sur fond, surface et carte", () => {
        for (const bg of [theme.bgMain, theme.bgSurface, theme.bgCard, theme.bgSurfaceElevated].map((c) => flatten(c, theme.bgMain))) {
          expect(contrast(theme.textPrimary, bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(theme.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
        }
      });

      it("texte atténué lisible (AA 4.5:1) sur fond, surface, carte et surface surélevée", () => {
        for (const bg of [theme.bgMain, theme.bgSurface, theme.bgCard, theme.bgSurfaceElevated].map((c) => flatten(c, theme.bgMain))) {
          expect(contrast(theme.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
        }
      });

      it("l'accent reste visible (3:1) sur le fond", () => {
        expect(contrast(theme.accentPrimary, theme.bgMain)).toBeGreaterThanOrEqual(3);
      });

      it("le texte d'un bouton d'accent est lisible (4.5:1)", () => {
        expect(contrast(theme.accentContrast, theme.accentPrimary)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it("chaque accent universel a un texte de bouton lisible via getContrastColor", () => {
    for (const accent of UNIVERSAL_ACCENTS) {
      expect(contrast(getContrastColor(accent.hex), accent.hex)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
