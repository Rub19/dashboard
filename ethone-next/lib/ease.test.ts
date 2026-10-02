import { projectMomentum, shouldDismissSheet } from "./ease";

describe("shouldDismissSheet", () => {
  it("un petit lancer rapide vers le bas ferme (l'élan projeté dépasse le seuil)", () => {
    expect(projectMomentum(800)).toBeCloseTo(399.2, 0);
    expect(shouldDismissSheet(30, 800)).toBe(true);
  });
  it("tirée loin mais relâchée en remontant : reste ouverte", () => {
    expect(shouldDismissSheet(200, -400)).toBe(false);
  });
  it("petit glissé lent : reste ouverte", () => {
    expect(shouldDismissSheet(40, 60)).toBe(false);
  });
});
