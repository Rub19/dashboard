import { formatApiError } from "./format-error";

describe("formatApiError", () => {
  it("returns fallback when err is empty or null", () => {
    expect(formatApiError(null)).toBe("Une erreur est survenue");
    expect(formatApiError(undefined)).toBe("Une erreur est survenue");
    expect(formatApiError("")).toBe("Une erreur est survenue");
    expect(formatApiError(null, "Custom fallback")).toBe("Custom fallback");
  });

  it("returns simple strings as-is", () => {
    expect(formatApiError("Salon introuvable")).toBe("Salon introuvable");
  });

  it("formats stringified Zod error JSON cleanly", () => {
    const zodJson = JSON.stringify([
      {
        code: "too_small",
        minimum: 2,
        type: "number",
        inclusive: true,
        message: "Le nombre doit être supérieur ou égal à 2",
        path: ["maxBans"],
      },
    ]);
    expect(formatApiError(zodJson)).toBe("maxBans : Le nombre doit être supérieur ou égal à 2");
  });

  it("formats raw error objects with nested errors", () => {
    const errorObj = {
      error: [
        { path: ["channelId"], message: "Requis" },
        { path: ["action"], message: "Action invalide" },
      ],
    };
    expect(formatApiError(errorObj)).toBe("channelId : Requis, action : Action invalide");
  });

  it("handles Error instances", () => {
    expect(formatApiError(new Error("Erreur réseau"))).toBe("Erreur réseau");
  });
});
