"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card3D from "@/components/Card3D";
import BottomSheet from "@/components/BottomSheet";
import { useUserData } from "@/lib/hooks/useUserData";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

type BillData = {
  amount?: number;
  date?: string;
  currency?: string;
  paid?: boolean;
};

type Bill = {
  id: string;
  label: string;
  data: BillData;
};

export default function BillsWidget() {
  const i18n = useI18n();
  const { items: bills, loading } = useUserData("bill");

  const TODAY = new Date();
  const ONE_WEEK = new Date(TODAY);
  ONE_WEEK.setDate(ONE_WEEK.getDate() + 7);

  const typedBills = useMemo(
    () =>
      bills.map((b) => ({
        id: b.id,
        label: b.label,
        data: (b.data || {}) as BillData,
      })),
    [bills]
  );

  const totalDue = useMemo(
    () => typedBills.reduce((sum, b) => sum + Number(b.data.amount || 0), 0),
    [typedBills]
  );

  const unpaidBills = useMemo(
    () =>
      typedBills
        .filter((b) => !b.data.paid)
        .sort((a, b) => new Date(a.data.date || 0).getTime() - new Date(b.data.date || 0).getTime()),
    [typedBills]
  );

  const upcoming = unpaidBills.filter((b) => {
    const d = new Date(b.data.date || 0);
    return d >= TODAY && d <= ONE_WEEK;
  });

  const [selected, setSelected] = useState<Bill | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
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
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface)]"
              >
                <span className="min-w-0 flex-1 truncate text-left">{b.label}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{formatCurrency(Number(b.data.amount || 0))}</span>
              </button>
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

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.label} position="bottom" draggable>
        {selected && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <span className="text-sm text-[var(--muted)]">{i18n("due")}</span>
              <span className="font-semibold">{formatDate(selected.data.date)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <span className="text-sm text-[var(--muted)]">{i18n("amount")}</span>
              <span className="font-semibold">{formatCurrency(Number(selected.data.amount || 0))}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <span className="text-sm text-[var(--muted)]">{i18n("status")}</span>
              <span className={`flex items-center gap-1.5 font-semibold ${selected.data.paid ? "text-emerald-400" : "text-amber-400"}`}>
                <Icon name={selected.data.paid ? "check" : "circle"} className="h-4 w-4" />
                {selected.data.paid ? i18n("paid") : i18n("unpaid")}
              </span>
            </div>
            <Link
              href="/bills"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              onClick={() => setSelected(null)}
            >
              <Icon name="arrow-right" className="h-4 w-4" /> {i18n("billsManage")}
            </Link>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
