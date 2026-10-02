// Base simulée : une seule ligne JSON par compte, upsert lent (comme le réseau).
const db: { payload: Record<string, unknown>; writes: number } = { payload: { theme: "dark" }, writes: 0 };

jest.mock("./supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { payload: { ...db.payload } }, error: null }) }) }),
      upsert: async (row: { payload: Record<string, unknown> }) => {
        await new Promise((r) => setTimeout(r, 20));
        db.writes++;
        db.payload = row.payload;
        return { error: null };
      },
    }),
  },
}));

import { setUserState } from "./user-state";

describe("setUserState", () => {
  it("deux réglages écrits en même temps sont tous les deux conservés", async () => {
    await Promise.all([setUserState("accent", "rose"), setUserState("sidebar", "compact")]);
    expect(db.payload).toEqual({ theme: "dark", accent: "rose", sidebar: "compact" });
  });
});

describe("setUserState : valeur inchangée", () => {
  it("n'envoie rien si la valeur enregistrée est déjà identique (même avec un autre ordre de clés)", async () => {
    const { invalidateUserStateCache } = await import("./user-state");
    db.payload = { prefs: { a: 1, b: 2 } };
    db.writes = 0;
    invalidateUserStateCache();
    await setUserState("prefs", { b: 2, a: 1 });
    expect(db.writes).toBe(0);
    await setUserState("prefs", { a: 1, b: 3 });
    expect(db.writes).toBe(1);
  });
});
