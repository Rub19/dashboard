"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import BentoCard from "@/components/BentoCard";
import Modal from "@/components/ui/Modal";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { listBills, upcomingBills, getNextDueDate, type Bill } from "@/lib/bills-manager";

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

const BillsWidget = memo(function BillsWidget({ className = "", scrollable = true, standalone = false }: { className?: string; scrollable?: boolean; standalone?: boolean }) {
  const i18n = useI18n();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Bill | null>(null);
  const handleOpenBills = useCallback(() => { router.push("/bills"); }, [router]);
  const handleSelectBill = useCallback((b: Bill) => setSelected(b), []);
  const handleCloseModal = useCallback(() => setSelected(null), []);

  useEffect(() => {
    setBills(listBills());
  }, []);

  const totalDue = useMemo(
    () => bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0),
    [bills]
  );

  const unpaidBills = useMemo(
    () =>
      bills
        .filter((b) => !b.paid)
        .sort((a, b) => {
          const aNext = getNextDueDate(a) || a.dueDate;
          const bNext = getNextDueDate(b) || b.dueDate;
          return new Date(aNext).getTime() - new Date(bNext).getTime();
        }),
    [bills]
  );

  // Recalculate upcoming whenever the bills state updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const upcoming = useMemo(() => upcomingBills(7), [bills]);

  const content = (
    <div className="flex flex-1 flex-col justify-between gap-3">
      {standalone && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="bills" className="h-4 w-4 text-[--accent-primary]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("billsTitle")}</h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {unpaidBills.length} {i18n("billsToPay")}
          </span>
        </div>
      )}

      <div>
        <p className="text-2xl font-bold text-[--accent-primary]">{formatCurrency(totalDue)}</p>
        <p className="text-xs text-[var(--text-muted)]">{unpaidBills.length} {i18n("billsToPay")}</p>
      </div>

      <div className="space-y-1.5 flex-1 min-h-0">
        {upcoming.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] p-3 text-center">
            <Icon name="receipt" className="h-5 w-5 text-[var(--text-muted)]" />
            <p className="text-xs font-medium text-[var(--text-primary)]">{i18n("noUpcomingBills", "Aucune facture à venir")}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{i18n("billsEmptyHint", "Ajoutez une facture pour suivre vos échéances.")}</p>
          </div>
        ) : (
          upcoming.slice(0, 3).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelectBill(b)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--text-primary)]/[0.06]"
            >
              <span className="min-w-0 flex-1 truncate text-left">{b.label}</span>
              <span className="shrink-0 font-medium text-[var(--text-primary)]">{formatCurrency(b.amount, b.currency)}</span>
            </button>
          ))
        )}
      </div>

      <Link
        href="/bills"
        className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] backdrop-blur-[var(--panel-blur)]"
      >
        <Icon name="arrow-right" className="h-3.5 w-3.5" /> {i18n("billsManage")}
      </Link>
    </div>
  );

  const widgetState = bills.length === 0 ? "empty" : undefined;

  return (
    <>
      {standalone ? (
        <Card3D>{content}</Card3D>
      ) : (
        <BentoCard
          title={i18n("billsTitle")}
          icon="bills"
          scrollable={scrollable}
          className={cn("h-full", className)}
          state={widgetState}
          stateMessage={widgetState ? i18n("billsEmpty", "Aucune facture enregistrée") : undefined}
          onAction={widgetState ? handleOpenBills : undefined}
          actionLabel={i18n("billsManage")}
        >
          {content}
        </BentoCard>
      )}

      <Modal
        isOpen={!!selected}
        onClose={handleCloseModal}
        title={selected?.label || ""}
        size="sm"
        position="bottom"
        hideFooter
      >
        {selected && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
              <span className="text-sm text-[var(--text-muted)]">{i18n("due")}</span>
              <span className="font-semibold">{formatDate(getNextDueDate(selected) || selected.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
              <span className="text-sm text-[var(--text-muted)]">{i18n("amount")}</span>
              <span className="font-semibold">{formatCurrency(selected.amount, selected.currency)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
              <span className="text-sm text-[var(--text-muted)]">{i18n("status")}</span>
              <span className={`flex items-center gap-1.5 font-semibold ${selected.paid ? "text-[--accent-primary]" : "text-[var(--warning)]"}`}>
                <Icon name={selected.paid ? "check" : "circle"} className="h-4 w-4" />
                {selected.paid ? i18n("paid") : i18n("unpaid")}
              </span>
            </div>
            <Link
              href="/bills"
              className="flex w-full items-center justify-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-90"
              onClick={handleCloseModal}
            >
              <Icon name="arrow-right" className="h-4 w-4" /> {i18n("billsManage")}
            </Link>
          </div>
        )}
      </Modal>
    </>
  );
});

export default BillsWidget;
