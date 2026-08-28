import { CATEGORY_ORDER, sectionCategory } from "./SettingsNavigation";
import { resolveCategory } from "./useSettingsNavigation";

describe("ETHONE Settings 2.0 Master Architecture Test Suite", () => {
  describe("1. Deterministic Category Order & Integrity", () => {
    it("should have all 22 standard categories strictly defined with unique IDs", () => {
      expect(CATEGORY_ORDER.length).toBe(22);
      const ids = CATEGORY_ORDER.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(22);
    });

    it("should contain all expected core categories for Settings 2.0", () => {
      const expected = [
        "general",
        "profile",
        "appearance",
        "themes",
        "animations",
        "audio",
        "soundscapes",
        "notifications",
        "dynamic-island",
        "dock",
        "workspace",
        "language",
        "connections",
        "privacy",
        "security",
        "sync",
        "storage",
        "performance",
        "accessibility",
        "shortcuts",
        "advanced",
        "about",
      ];
      expected.forEach((cat) => {
        expect(CATEGORY_ORDER.some((c) => c.id === cat)).toBe(true);
      });
    });
  });

  describe("2. Unidirectional Section Resolution & Deep Linking", () => {
    it("should map sub-sections to their parent category deterministically", () => {
      expect(sectionCategory("typography")).toBe("appearance");
      expect(sectionCategory("density")).toBe("appearance");
      expect(sectionCategory("soundscapes")).toBe("soundscapes");
      expect(sectionCategory("sound-mixer")).toBe("soundscapes");
      expect(sectionCategory("integrations")).toBe("connections");
      expect(sectionCategory("sessions")).toBe("security");
      expect(sectionCategory("maintenance")).toBe("advanced");
      expect(sectionCategory("ai")).toBe("advanced");
    });

    it("should safely resolve null, undefined and invalid section strings to general without crashing", () => {
      expect(resolveCategory(null)).toBe("general");
      expect(resolveCategory(undefined)).toBe("general");
      expect(resolveCategory("")).toBe("general");
      expect(resolveCategory("invalid-section-xyz")).toBe("general");
    });
  });

  describe("3. Stress Test & Rapid Navigation Simulation", () => {
    it("should resolve 100 consecutive rapid category switches deterministically", () => {
      const sequence = [
        "general",
        "appearance",
        "animations",
        "audio",
        "soundscapes",
        "connections",
        "themes",
        "security",
        "performance",
        "about",
      ];
      let current = "general";
      for (let i = 0; i < 100; i++) {
        const next = sequence[i % sequence.length];
        current = resolveCategory(next);
        expect(current).toBe(next);
      }
      expect(current).toBe("about");
    });
  });
});
