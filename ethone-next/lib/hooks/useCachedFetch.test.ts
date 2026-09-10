import { fetchWorkerCached, clearFetchCache } from "./useCachedFetch";
import { fetchWorker } from "../api";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("fetchWorkerCached", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
    clearFetchCache();
  });

  it("collapses concurrent identical GETs into one network request", async () => {
    let resolve!: (v: unknown) => void;
    mockedFetchWorker.mockReturnValue(new Promise((r) => (resolve = r)));

    const p1 = fetchWorkerCached("/api/weather?city=Paris");
    const p2 = fetchWorkerCached("/api/weather?city=Paris");
    const p3 = fetchWorkerCached("/api/weather?city=Paris");

    expect(mockedFetchWorker).toHaveBeenCalledTimes(1);

    resolve({ data: { temp: 12 } });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual({ data: { temp: 12 } });
    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
    expect(mockedFetchWorker).toHaveBeenCalledTimes(1);
  });

  it("serves the TTL cache on a follow-up call, then refetches after expiry", async () => {
    mockedFetchWorker.mockResolvedValueOnce({ data: 1 }).mockResolvedValueOnce({ data: 2 });

    const a = await fetchWorkerCached("/api/x", {}, 50);
    const b = await fetchWorkerCached("/api/x", {}, 50);
    expect(a).toEqual({ data: 1 });
    expect(b).toEqual({ data: 1 });
    expect(mockedFetchWorker).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 60));
    const c = await fetchWorkerCached("/api/x", {}, 50);
    expect(c).toEqual({ data: 2 });
    expect(mockedFetchWorker).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe different paths", async () => {
    mockedFetchWorker.mockResolvedValue({ data: null });
    await Promise.all([fetchWorkerCached("/api/a"), fetchWorkerCached("/api/b")]);
    expect(mockedFetchWorker).toHaveBeenCalledTimes(2);
  });

  it("clears the in-flight entry after a failed request so the next call retries", async () => {
    mockedFetchWorker.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ data: "ok" });

    await expect(fetchWorkerCached("/api/y")).rejects.toThrow("boom");
    const retry = await fetchWorkerCached("/api/y");
    expect(retry).toEqual({ data: "ok" });
    expect(mockedFetchWorker).toHaveBeenCalledTimes(2);
  });
});
