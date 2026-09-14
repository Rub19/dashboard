import { renderHook, waitFor } from "@testing-library/react";
import { useFocusSessionHistory } from "./useFocusSessionHistory";
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

describe("useFocusSessionHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty list when there is no session", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: null } });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => makeQueryBuilder({ data: [], error: null }));

    const { result } = renderHook(() => useFocusSessionHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("loads and maps rows scoped to the current user, newest first", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    (mockedSupabase.from as jest.Mock) = jest.fn(() =>
      makeQueryBuilder({
        data: [
          { id: "s2", duration: 900, preset: "pomodoro", goal: null, completed_at: "2026-09-02T09:00:00.000Z" },
          { id: "s1", duration: 1500, preset: "pomodoro", goal: "Write report", completed_at: "2026-09-01T09:00:00.000Z" },
        ],
        error: null,
      })
    );

    const { result } = renderHook(() => useFocusSessionHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_focus_sessions");
    expect(result.current.items).toEqual([
      { id: "s2", duration: 900, preset: "pomodoro", goal: undefined, completedAt: "2026-09-02T09:00:00.000Z" },
      { id: "s1", duration: 1500, preset: "pomodoro", goal: "Write report", completedAt: "2026-09-01T09:00:00.000Z" },
    ]);
  });
});
