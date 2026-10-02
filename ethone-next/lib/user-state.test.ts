// Base simulée : une seule ligne JSON par compte, upsert lent (comme le réseau).
const db: { payload: Record<string, unknown> } = { payload: { theme: "dark" } };

jest.mock("./supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { payload: { ...db.payload } }, error: null }) }) }),
      upsert: async (row: { payload: Record<string, unknown> }) => {
        await new Promise((r) => setTimeout(r, 20));
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
