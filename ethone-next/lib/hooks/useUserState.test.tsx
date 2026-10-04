import { renderHook, waitFor } from "@testing-library/react";

let session: { user: { id: string } } | null = { user: { id: "u1" } };
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    channel: () => ({ on() { return this; }, subscribe() {}, unsubscribe() {} }),
    removeChannel: () => Promise.resolve(),
  },
}));

const remote = new Map<string, unknown>();
const writes: [string, unknown][] = [];
jest.mock("@/lib/user-state", () => ({
  getUserState: (key: string, fallback: unknown) => Promise.resolve(remote.has(key) ? remote.get(key) : fallback),
  setUserState: (key: string, value: unknown) => {
    writes.push([key, value]);
    return Promise.resolve();
  },
  invalidateUserStateCache: () => {},
}));

import { useUserState } from "./useUserState";

beforeEach(() => {
  localStorage.clear();
  remote.clear();
  writes.length = 0;
  session = { user: { id: "u1" } };
});

describe("useUserState", () => {
  it("la valeur du compte l'emporte sur une vieille copie locale, sans rien réécrire", async () => {
    localStorage.setItem("ethone:state:guest:layout", JSON.stringify("ancienne"));
    localStorage.setItem("ethone:state:u1:layout", JSON.stringify("ancienne"));
    remote.set("layout", "compte");
    const { result } = renderHook(() => useUserState("layout", "defaut"));
    await waitFor(() => expect(result.current[0]).toBe("compte"));
    await new Promise((r) => setTimeout(r, 30));
    expect(writes).toEqual([]);
  });

  it("clé absente du compte : la copie locale y est envoyée une seule fois", async () => {
    localStorage.setItem("ethone:state:u1:layout", JSON.stringify("locale"));
    const { result } = renderHook(() => useUserState("layout", "defaut"));
    await waitFor(() => expect(writes).toEqual([["layout", "locale"]]));
    expect(result.current[0]).toBe("locale");
  });

  it("non connecté : rien n'est envoyé au serveur", async () => {
    session = null;
    const { result } = renderHook(() => useUserState("layout", { a: 1 }));
    await new Promise((r) => setTimeout(r, 30));
    result.current[1]({ a: 2 });
    await new Promise((r) => setTimeout(r, 30));
    expect(writes).toEqual([]);
  });
});
