import { isExpired, isExpiringSoon } from "./date";

describe("isExpired", () => {
  it("renvoie false pour les valeurs nulles ou indéfinies", () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
    expect(isExpired("")).toBe(false);
  });

  it("renvoie true pour une date passée", () => {
    const past = new Date(Date.now() - 60_000);
    expect(isExpired(past)).toBe(true);
    expect(isExpired(past.toISOString())).toBe(true);
    expect(isExpired(past.getTime())).toBe(true);
  });

  it("renvoie false pour une date future", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isExpired(future)).toBe(false);
    expect(isExpired(future.toISOString())).toBe(false);
    expect(isExpired(future.getTime())).toBe(false);
  });

  it("renvoie false pour une date invalide", () => {
    expect(isExpired("invalide")).toBe(false);
  });
});

describe("isExpiringSoon", () => {
  it("renvoie false pour les valeurs nulles ou indéfinies", () => {
    expect(isExpiringSoon(null)).toBe(false);
    expect(isExpiringSoon(undefined)).toBe(false);
    expect(isExpiringSoon("invalide")).toBe(false);
  });

  it("renvoie true pour une date expirant dans moins de 24h", () => {
    const inTwoHours = new Date(Date.now() + 2 * 3600_000);
    expect(isExpiringSoon(inTwoHours)).toBe(true);
  });

  it("renvoie false pour une date expirant au-delà du seuil par défaut", () => {
    const inTwoDays = new Date(Date.now() + 48 * 3600_000);
    expect(isExpiringSoon(inTwoDays)).toBe(false);
  });

  it("supporte un seuil personnalisé", () => {
    const inThreeHours = new Date(Date.now() + 3 * 3600_000);
    expect(isExpiringSoon(inThreeHours, 4 * 3600_000)).toBe(true);
    expect(isExpiringSoon(inThreeHours, 1 * 3600_000)).toBe(false);
  });
});
