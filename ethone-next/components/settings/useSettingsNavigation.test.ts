import { resolveCategory } from "./useSettingsNavigation";
import { CATEGORY_ORDER } from "./SettingsNavigation";

describe("Settings Navigation Architecture & Determinism", () => {
  it("resolves valid categories directly", () => {
    expect(resolveCategory("appearance")).toBe("appearance");
    expect(resolveCategory("security")).toBe("security");
    expect(resolveCategory("connections")).toBe("connections");
    expect(resolveCategory("about")).toBe("about");
  });

  it("resolves sub-sections to their parent category deterministically", () => {
    expect(resolveCategory("typography")).toBe("appearance");
    expect(resolveCategory("density")).toBe("appearance");
    expect(resolveCategory("themes")).toBe("themes");
    expect(resolveCategory("accents")).toBe("themes");
    expect(resolveCategory("sound")).toBe("audio");
    expect(resolveCategory("soundscapes")).toBe("soundscapes");
    expect(resolveCategory("sound-mixer")).toBe("soundscapes");
    expect(resolveCategory("dnd")).toBe("notifications");
    expect(resolveCategory("integrations")).toBe("connections");
    expect(resolveCategory("sessions")).toBe("security");
    expect(resolveCategory("presets")).toBe("advanced");
    expect(resolveCategory("ai")).toBe("advanced");
    expect(resolveCategory("maintenance")).toBe("advanced");
  });

  it("falls back gracefully to general for null, undefined, or unknown IDs", () => {
    expect(resolveCategory(null)).toBe("general");
    expect(resolveCategory(undefined)).toBe("general");
    expect(resolveCategory("")).toBe("general");
    expect(resolveCategory("completely-unknown-section-123")).toBe("general");
  });

  it("ensures all 22 standard categories are defined with unique IDs and icons", () => {
    expect(CATEGORY_ORDER.length).toBe(22);
    const ids = CATEGORY_ORDER.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(22);
    CATEGORY_ORDER.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    });
  });
});
