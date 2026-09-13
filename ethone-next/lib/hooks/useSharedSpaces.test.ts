import { renderHook, waitFor, act } from "@testing-library/react";
import { useSharedSpaces, useSpaceMembers } from "./useSharedSpaces";
import { fetchWorker } from "../api";

jest.mock("../api", () => {
  const actual = jest.requireActual("../api");
  return { ...actual, fetchWorker: jest.fn() };
});

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("useSharedSpaces", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("loads the caller's owned and member spaces", async () => {
    mockedFetchWorker.mockResolvedValue({ data: [{ id: "s1", owner_id: "u1", name: "Family", role: "owner", created_at: "", updated_at: "" }] });
    const { result } = renderHook(() => useSharedSpaces());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.spaces).toHaveLength(1);
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/shared-spaces");
  });

  it("createSpace posts to the worker and reloads", async () => {
    mockedFetchWorker
      .mockResolvedValueOnce({ data: [] }) // initial load
      .mockResolvedValueOnce({ data: { id: "s1", name: "New space" } }) // create
      .mockResolvedValueOnce({ data: [{ id: "s1", owner_id: "u1", name: "New space", role: "owner", created_at: "", updated_at: "" }] }); // reload

    const { result } = renderHook(() => useSharedSpaces());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSpace("New space");
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/shared-spaces",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "New space" }) })
    );
    expect(result.current.spaces).toHaveLength(1);
  });
});

describe("useSpaceMembers", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("does nothing when spaceId is null", async () => {
    const { result } = renderHook(() => useSpaceMembers(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
    expect(mockedFetchWorker).not.toHaveBeenCalled();
  });

  it("lists members for the given space and invites by email", async () => {
    mockedFetchWorker
      .mockResolvedValueOnce({ data: [] }) // initial load
      .mockResolvedValueOnce({ data: { member: { id: "m1", invited_email: "friend@example.com" }, sent: true } }) // invite
      .mockResolvedValueOnce({ data: [{ id: "m1", space_id: "s1", invited_email: "friend@example.com", user_id: null, role: "member", status: "pending", invite_token_expires_at: "", invited_by: "u1", invited_at: "", accepted_at: null, updated_at: "" }] }); // reload

    const { result } = renderHook(() => useSpaceMembers("s1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.invite("friend@example.com");
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/shared-spaces/members",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ space_id: "s1", email: "friend@example.com" }) })
    );
    expect(result.current.members).toHaveLength(1);
  });
});
