import { signOut } from "./auth";
import { fetchWorker } from "./api";
import { supabase } from "./supabase";

jest.mock("./api");
jest.mock("./supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("auth", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("calls /api/signout before local supabase signOut", async () => {
    mockedFetchWorker.mockResolvedValue({ data: { ok: true } });
    await signOut();
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/signout", { method: "POST" });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("still signs out locally when /api/signout fails", async () => {
    mockedFetchWorker.mockRejectedValue(new Error("Worker down"));
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
