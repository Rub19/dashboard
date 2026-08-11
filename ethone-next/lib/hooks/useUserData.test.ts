import { renderHook, waitFor, act } from "@testing-library/react";
import { useUserData } from "./useUserData";
import { fetchWorker } from "../api";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("useUserData", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
    mockedFetchWorker.mockImplementation(async (path, options) => {
      const p = String(path);
      if (p === "/api/user-data/macros" && (!options || (options as { method?: string }).method !== "POST")) {
        return { data: [{ id: "m1", kind: "macro", slug: "", label: "Open Home", data: { action: "navigate", href: "/" }, count: 0, created_at: "", updated_at: "" }] };
      }
      if (p === "/api/user-data/personas" && (!options || (options as { method?: string }).method !== "POST")) {
        return { data: [{ id: "p1", kind: "persona", slug: "", label: "Focus", data: { theme: "boreal" }, count: 0, created_at: "", updated_at: "" }] };
      }
      if (p === "/api/user-data/bills" && (!options || (options as { method?: string }).method !== "POST")) {
        return { data: [{ id: "b1", kind: "bill", slug: "", label: "Cloud", data: { amount: 10, currency: "EUR", date: "2026-08-11", paid: false }, count: 0, created_at: "", updated_at: "" }] };
      }
      if (p === "/api/user-data/macros" && (options as { method?: string }).method === "POST") {
        return { data: { id: "m2", kind: "macro", label: "New Macro", data: { action: "navigate", href: "/" } } };
      }
      return { data: null };
    });
  });

  it.each(["macro", "persona", "bill"] as const)("loads %ss from /api/user-data/%ss", async (kind) => {
    const { result } = renderHook(() => useUserData(kind));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(mockedFetchWorker).toHaveBeenCalledWith(`/api/user-data/${kind}s`);
  });

  it("creates a macro and reloads", async () => {
    const { result } = renderHook(() => useUserData("macro"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create("New Macro", "", { action: "navigate", href: "/" });
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/user-data/macros",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ label: "New Macro", slug: "", data: { action: "navigate", href: "/" }, count: undefined }),
      })
    );
  });

  it("deletes a persona locally and on the Worker", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path) === "/api/user-data/personas") return { data: [{ id: "p1", kind: "persona", slug: "", label: "Focus", data: { theme: "boreal" }, count: 0, created_at: "", updated_at: "" }] };
      return { data: { deleted: true } };
    });

    const { result } = renderHook(() => useUserData("persona"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("p1");
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/user-data/personas",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ id: "p1" }),
      })
    );
    expect(result.current.items).toHaveLength(0);
  });
});
