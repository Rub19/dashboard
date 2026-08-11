"use client";

import { useMemo } from "react";
import Link from "next/link";
import Card3D from "@/components/Card3D";
import { useUserData } from "@/lib/hooks/useUserData";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export default function BillsWidget() {
  const i18n = useI18n();
  const { items: bills, loading } = useUserData("bill");

  const TODAY = new Date();
  const ONE_WEEK = new Date(TODAY);
  ONE_WEEK.setDate(ONE_WEEK.getDate() + 7);

  const totalDue = useMemo(
    () => bills.reduce((sum, b) => sum + Number((b.data as { amount?: number; paid?: boolean }).amount || 0), 0),
    [bills]
  );

  const unpaidBills = useMemo(
    () =>
      bills
        .map((b) => ({
          ...b,
          data: b.data as { amount?: number; date?: string; currency?: string; paid?: boolean },
        }))
        .filter((b) => !b.data.paid)
        .sort((a, b) => new Date(a.data.date || 0).getTime() - new Date(b.data.date || 0).getTime()),
    [bills]
  );

  const upcoming = unpaidBills.filter((b) => {
    const d = new Date(b.data.date || 0);
    return d >= TODAY && d <= ONE_WEEK;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(amount);

  return (
    <Card3D>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="bills" className="h-4 w-4 text-lime-400" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{i18n("billsTitle")}</h2>
        </div>
        <span className="text-xs text-[var(--muted)]">
          {loading ? "-" : unpaidBills.length} {i18n("billsToPay")}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-bold text-lime-400">{loading ? "-" : formatCurrency(totalDue)}</p>
        <p className="text-xs text-[var(--muted)]">{i18n("due")}</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("noUpcomingBills")}</p>
        ) : (
          upcoming.slice(0, 3).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm">
              <span className="min-w-0 flex-1 truncate">{b.label}</span>
              <span className="shrink-0 text-xs text-[var(--muted)]">{formatCurrency(Number(b.data.amount || 0))}</span>
            </div>
          ))
        )}
      </div>

      <Link
        href="/bills"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <Icon name="arrow-right" className="h-3.5 w-3.5" /> {i18n("billsManage")}
      </Link>
    </Card3D>
  );
}
