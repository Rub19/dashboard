import { syncCurrentMonthSnapshot, loadBillSnapshots } from "./bills-snapshot";
import { supabase } from "./supabase";
import { loadBills } from "./bills-manager";
import type { Bill } from "./bills-manager";

jest.mock("./supabase");
// Partial mock: only loadBills is replaced — getNextDueDate (used internally
// by billsMonthSnapshot in analytics.ts, imported from this same module via
// the "@/lib/bills-manager" alias) must stay real or every snapshot is 0.
jest.mock("./bills-manager", () => ({
  ...jest.requireActual("./bills-manager"),
  loadBills: jest.fn(),
}));

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedLoadBills = loadBills as jest.MockedFunction<typeof loadBills>;

function bill(overrides: Partial<Bill>): Bill {
  return {
    id: "b1",
    label: "Test",
    amount: 10,
    currency: "EUR",
    dueDate: "2026-09-05",
    paid: false,
    category: "other",
    recurrence: "none",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("syncCurrentMonthSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 10));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does nothing when there is no authenticated user", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: null } });
    const upsert = jest.fn();
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({ upsert }));

    await syncCurrentMonthSnapshot();

    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts a snapshot row keyed on the current user and month", async () => {
    mockedLoadBills.mockReturnValue([
      bill({ id: "1", category: "housing", amount: 800, paid: true, dueDate: "2026-09-05" }),
      bill({ id: "2", category: "food", amount: 150, paid: false, dueDate: "2026-09-20" }),
    ]);
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    const upsert = jest.fn().mockResolvedValue({ data: null, error: null });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({ upsert }));

    await syncCurrentMonthSnapshot();

    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_bill_snapshots");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        month: "2026-09-01",
        paid_amount: 800,
        unpaid_amount: 150,
        category_breakdown: [{ category: "food", amount: 150, count: 1 }],
      }),
      { onConflict: "user_id,month" }
    );
  });
});

describe("loadBillSnapshots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty list when there is no authenticated user", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: null } });
    expect(await loadBillSnapshots()).toEqual([]);
  });

  it("scopes the query to the current user and orders by month", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    const builder: Record<string, jest.Mock> = {};
    ["select", "eq", "order"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    (builder as any).then = (resolve: (v: unknown) => void) =>
      resolve({ data: [{ month: "2026-09-01", paid_amount: 800, unpaid_amount: 150 }], error: null });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => builder);

    const rows = await loadBillSnapshots();

    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_bill_snapshots");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(rows).toEqual([{ month: "2026-09-01", paid_amount: 800, unpaid_amount: 150 }]);
  });
});
