import { supabase } from "@/lib/supabase";
import { loadBills } from "@/lib/bills-manager";
import { billsMonthSnapshot, billsCategoryBreakdown } from "@/lib/analytics";

// Writes one row per (user, month) into ethone_bill_snapshots — a snapshot
// of "what spend looked like this month", not a migration of the bills
// feature itself (which stays localStorage-only). Real history accumulates
// forward from whenever this is first called; there is no way to backfill
// past months that were never recorded.
export async function syncCurrentMonthSnapshot(): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const bills = loadBills();
    const snapshot = billsMonthSnapshot(bills);
    const breakdown = billsCategoryBreakdown(bills);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    await supabase.from("ethone_bill_snapshots").upsert(
      {
        user_id: userId,
        month,
        paid_amount: snapshot.paidAmount,
        unpaid_amount: snapshot.unpaidAmount,
        category_breakdown: breakdown,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month" },
    );
  } catch {
    // Best-effort snapshot; the current-month view in AnalyticsClient.tsx
    // already computes the same numbers live from loadBills() regardless.
  }
}

export type BillMonthSnapshotRow = {
  month: string;
  paid_amount: number;
  unpaid_amount: number;
};

export async function loadBillSnapshots(): Promise<BillMonthSnapshotRow[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("ethone_bill_snapshots")
    .select("month, paid_amount, unpaid_amount")
    .eq("user_id", userId)
    .order("month", { ascending: true });

  if (error) return [];
  return (data as BillMonthSnapshotRow[]) || [];
}
