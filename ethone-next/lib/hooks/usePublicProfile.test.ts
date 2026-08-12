import { renderHook, waitFor } from "@testing-library/react";
import { usePublicProfile } from "./usePublicProfile";
import { getPublicProfile } from "@/lib/api";

jest.mock("@/lib/api");

const mockedGetPublicProfile = getPublicProfile as jest.MockedFunction<typeof getPublicProfile>;

describe("usePublicProfile", () => {
  beforeEach(() => {
    mockedGetPublicProfile.mockReset();
  });

  it("fetches public profile via /api/supabase/public-profile", async () => {
    mockedGetPublicProfile.mockResolvedValue({
      data: { publicId: "pub-1", username: "rubens", displayName: "Rubens", avatarUrl: "https://example.com/avatar.png" },
    });

    const { result } = renderHook(() => usePublicProfile("rubens"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetPublicProfile).toHaveBeenCalledWith("rubens");
    expect(result.current.profile).toEqual({
      publicId: "pub-1",
      username: "rubens",
      displayName: "Rubens",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("does not call the endpoint when username is empty", async () => {
    const { result } = renderHook(() => usePublicProfile(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedGetPublicProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  it("exposes errors", async () => {
    mockedGetPublicProfile.mockRejectedValue(new Error("Network down"));
    const { result } = renderHook(() => usePublicProfile("rubens"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("Network down");
  });
});
