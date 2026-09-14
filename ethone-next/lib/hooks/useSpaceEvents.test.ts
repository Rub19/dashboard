import { renderHook, waitFor } from "@testing-library/react";
import { useSpaceEvents } from "./useSpaceEvents";
import { supabase } from "../supabase";

jest.mock("../supabase");

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

function makeQueryBuilder(result: { data: unknown[]; error: null }) {
  const builder: Record<string, jest.Mock> = {};
  ["select", "eq", "order"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  (builder as any).then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

function makeChannel() {
  const channel: Record<string, jest.Mock> = {};
  channel.on = jest.fn(() => channel);
  channel.subscribe = jest.fn(() => Promise.resolve(channel));
  channel.unsubscribe = jest.fn();
  return channel;
}

describe("useSpaceEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    (mockedSupabase.auth.onAuthStateChange as jest.Mock) = jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => makeQueryBuilder({ data: [], error: null }));
  });

  it("loads events scoped to the given space_id", async () => {
    const { result } = renderHook(() => useSpaceEvents("space-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_space_events");
    expect(result.current.items).toEqual([]);
  });

  it("subscribes to a realtime channel filtered by space_id once the user is known", async () => {
    const channels: ReturnType<typeof makeChannel>[] = [];
    (mockedSupabase.channel as jest.Mock) = jest.fn(() => {
      const ch = makeChannel();
      channels.push(ch);
      return ch;
    });

    renderHook(() => useSpaceEvents("space-1"));
    await waitFor(() => expect(mockedSupabase.channel).toHaveBeenCalled());

    expect(channels).toHaveLength(1);
    expect(channels[0].on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ filter: "space_id=eq.space-1" }),
      expect.any(Function)
    );
  });

  it("tears down the old channel and opens a new one when spaceId changes", async () => {
    const channels: ReturnType<typeof makeChannel>[] = [];
    (mockedSupabase.channel as jest.Mock) = jest.fn(() => {
      const ch = makeChannel();
      channels.push(ch);
      return ch;
    });

    const { rerender } = renderHook(({ spaceId }: { spaceId: string }) => useSpaceEvents(spaceId), {
      initialProps: { spaceId: "space-1" },
    });
    await waitFor(() => expect(channels).toHaveLength(1));

    rerender({ spaceId: "space-2" });
    await waitFor(() => expect(channels).toHaveLength(2));

    expect(channels[0].unsubscribe).toHaveBeenCalled();
    expect(channels[1].on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ filter: "space_id=eq.space-2" }),
      expect.any(Function)
    );
  });
});
