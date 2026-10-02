import { dropSpuriousAppearanceEvents, restoreEventTypes, type ActivityEntry } from "./activity-journal";

const entry = (title: string, eventType: string): ActivityEntry =>
  ({ id: title, source: "ethone", category: "system", icon: "activity", title, description: "", timestamp: "2026-10-02T10:00:00.000Z", eventType, details: {}, synced: true }) as ActivityEntry;

describe("restoreEventTypes", () => {
  it("retrouve le vrai type des entrées enregistrées en « shared » (compteur de sessions)", () => {
    const [home, theme] = restoreEventTypes([entry("Session ETHONE ouverte", "shared"), entry("Thème modifié", "shared")]);
    expect(home.eventType).toBe("route:home");
    expect(theme.eventType).toBe("v8.theme.toggle");
  });

  it("ne touche ni aux vrais événements de fichiers ni aux types déjà corrects", () => {
    const [file, ok] = restoreEventTypes([entry("rapport.pdf", "uploaded"), entry("Session ETHONE ouverte", "route:home")]);
    expect(file.eventType).toBe("uploaded");
    expect(ok.eventType).toBe("route:home");
  });
});

describe("dropSpuriousAppearanceEvents", () => {
  it("retire les « Thème modifié » d'avant le correctif, garde les récents et le reste", () => {
    const at = (title: string, eventType: string, timestamp: string) => ({ ...entry(title, eventType), id: title + timestamp, timestamp });
    const kept = dropSpuriousAppearanceEvents([
      at("Thème modifié", "v8.theme.toggle", "2026-09-28T10:00:00.000Z"),
      at("Accent modifié", "v8.appearance.cycle", "2026-09-28T10:00:00.000Z"),
      at("Thème modifié", "v8.theme.toggle", "2026-10-03T10:00:00.000Z"),
      at("Session ETHONE ouverte", "route:home", "2026-09-28T10:00:00.000Z"),
    ]);
    expect(kept.map((e) => `${e.eventType}@${e.timestamp.slice(0, 10)}`)).toEqual(["v8.theme.toggle@2026-10-03", "route:home@2026-09-28"]);
  });
});
