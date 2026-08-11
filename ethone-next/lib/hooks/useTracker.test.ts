import { renderHook, waitFor, act } from "@testing-library/react";
import { useTracker } from "./useTracker";
import { fetchWorker } from "../api";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("useTracker", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
    sessionStorage.clear();
  });

  it("fetches tracker matches with hyphenated routes and name/tag", async () => {
    mockedFetchWorker.mockResolvedValue({
      data: [
        { id: "m1", map: "Ascent", agent: "Jett", result: "win", kills: 20, deaths: 5, assists: 3 },
      ],
    });

    const path = "/api/tracker/valorant-matches?name=Player&tag=EUW";
    const { result } = renderHook(() => useTracker(path, "valorant:test"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(mockedFetchWorker).toHaveBeenCalledWith(path);
  });

  it("skips the request when the path is empty", async () => {
    const { result } = renderHook(() => useTracker("", "empty"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(mockedFetchWorker).not.toHaveBeenCalled();
  });

  it("uses sessionStorage cache and reloads when forced", async () => {
    mockedFetchWorker.mockResolvedValue({ data: [{ id: "m1" }] });
    const path = "/api/tracker/lol-matches";

    const { result, rerender } = renderHook(() => useTracker(path, "lol:test"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender();
    expect(result.current.items).toHaveLength(1);
    expect(mockedFetchWorker).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.sync();
    });
    expect(mockedFetchWorker).toHaveBeenCalledTimes(2);
  });
});
