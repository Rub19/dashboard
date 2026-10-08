import { cleanLogText } from "./security-scan";

describe("cleanLogText", () => {
  it("retire les emoji et calme les titres en capitales", () => {
    expect(cleanLogText("🚨 💥 SERVER NUKE DÉTECTÉ (Salons)")).toBe("Server nuke détecté (salons)");
  });
  it("laisse un titre normal intact", () => {
    expect(cleanLogText("💡 Nouvelle Suggestion")).toBe("Nouvelle Suggestion");
  });
  it("ne touche pas aux sigles courts", () => {
    expect(cleanLogText("XP")).toBe("XP");
  });
});
