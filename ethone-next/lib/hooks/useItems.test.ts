import { renderHook, waitFor, act } from "@testing-library/react";
import { useItems } from "./useItems";
import { supabase } from "../supabase";
import { fetchWorker } from "../api";

jest.mock("../supabase");
jest.mock("../api");
jest.mock("../activity-journal", () => ({ activityJournal: { capture: jest.fn() } }));

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

function makeQueryBuilder(result: { data: unknown[]; error: null }) {
  const builder: Record<string, jest.Mock> = {};
  ["select", "eq", "order"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  // Supabase's query builder is thenable -- awaiting it resolves {data, error}.
  (builder as any).then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

function makeChannel() {
  const channel: Record<string, unknown> = {};
  channel.on = jest.fn((_event: string, _filter: unknown, callback: (payload: unknown) => void) => {
    (channel as any)._callback = callback;
    return channel;
  });
  channel.subscribe = jest.fn(() => Promise.resolve(channel));
  channel.unsubscribe = jest.fn();
  return channel as { on: jest.Mock; subscribe: jest.Mock; unsubscribe: jest.Mock; _callback?: (payload: unknown) => void };
}

describe("useItems realtime subscription sharing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({
      data: { session: { user: { id: "user-a" } } },
    });
    (mockedSupabase.auth.onAuthStateChange as jest.Mock) = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => makeQueryBuilder({ data: [], error: null }));
    mockedFetchWorker.mockResolvedValue({ data: [] });
  });

  it("opens exactly one realtime channel for two simultaneously-mounted instances of the same (user, kind)", async () => {
    const channels: ReturnType<typeof makeChannel>[] = [];
    (mockedSupabase.channel as jest.Mock) = jest.fn(() => {
      const ch = makeChannel();
      channels.push(ch);
      return ch;
    });

    const a = renderHook(() => useItems("notes"));
    const b = renderHook(() => useItems("notes"));

    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    await waitFor(() => expect(mockedSupabase.channel).toHaveBeenCalled());

    // Give the second instance's own subscribe effect a tick to (not) fire.
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedSupabase.channel).toHaveBeenCalledTimes(1);
    expect(channels).toHaveLength(1);

    a.unmount();
    b.unmount();
  });

  it("fans a single incoming realtime event out to every mounted instance", async () => {
    let channel: ReturnType<typeof makeChannel> | null = null;
    (mockedSupabase.channel as jest.Mock) = jest.fn(() => {
      channel = makeChannel();
      return channel;
    });

    const a = renderHook(() => useItems("notes"));
    const b = renderHook(() => useItems("notes"));
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    await waitFor(() => expect(channel?._callback).toBeDefined());

    act(() => {
      channel!._callback!({
        eventType: "INSERT",
        new: { id: "n1", kind: "note", title: "Shared note", body: "", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
        old: {},
      });
    });

    await waitFor(() => expect(a.result.current.items.some((i) => i.id === "n1")).toBe(true));
    await waitFor(() => expect(b.result.current.items.some((i) => i.id === "n1")).toBe(true));

    a.unmount();
    b.unmount();
  });

  it("keeps the shared channel open while at least one instance is still mounted, and tears it down once the last one unmounts", async () => {
    let channel: ReturnType<typeof makeChannel> | null = null;
    (mockedSupabase.channel as jest.Mock) = jest.fn(() => {
      channel = makeChannel();
      return channel;
    });

    const a = renderHook(() => useItems("notes"));
    const b = renderHook(() => useItems("notes"));
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    await waitFor(() => expect(channel).not.toBeNull());

    a.unmount();
    // One listener left -- the shared channel must not be torn down yet.
    expect(channel!.unsubscribe).not.toHaveBeenCalled();

    b.unmount();
    await waitFor(() => expect(channel!.unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("opens separate channels for different item kinds", async () => {
    // Asserts on the set of distinct channel names actually requested,
    // rather than a raw call count: React's test renderer can double-invoke
    // effects (mount/cleanup/remount) independently of this hook's own
    // dedup logic, which is exercised and asserted on its own in the tests
    // above. What must hold regardless is that "notes" and "tasks" never
    // share a channel with each other.
    const requestedNames = new Set<string>();
    (mockedSupabase.channel as jest.Mock) = jest.fn((name: string) => {
      requestedNames.add(name);
      return makeChannel();
    });

    const notes = renderHook(() => useItems("notes"));
    const tasks = renderHook(() => useItems("tasks"));
    await waitFor(() => expect(notes.result.current.loading).toBe(false));
    await waitFor(() => expect(tasks.result.current.loading).toBe(false));
    await waitFor(() => expect(requestedNames.has("items_realtime_user-a:notes")).toBe(true));
    await waitFor(() => expect(requestedNames.has("items_realtime_user-a:tasks")).toBe(true));

    expect(requestedNames.size).toBe(2);

    notes.unmount();
    tasks.unmount();
  });
});
