"use client";

import { useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { detectBrandMeta } from "@/lib/bills-brands";
import {
  addBill,
  editBill,
  removeBill,
  getNextDueDate,
  parseISODate,
  toISODate,
  type Bill,
  type BillCategory,
  BILL_CATEGORIES,
} from "@/lib/bills-manager";
import Select from "@/components/ui/Select";
import Input from "@/components/Input";
import { cn } from "@/lib/utils";

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCurrency(amount: number, currency: string, locale: string) {
  const code = currency === "$" || currency === "USD" ? "USD" : currency === "£" || currency === "GBP" ? "GBP" : "EUR";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${currency}${amount.toFixed(2)}`;
  }
}

export type CalendarBillingPanelProps = {
  date: CalendarDate;
  bills: Bill[];
  onChange: () => void;
};

export default function CalendarBillingPanel({ date, bills, onChange }: CalendarBillingPanelProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("€");
  const [category, setCategory] = useState<BillCategory>("subscriptions");
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "monthly" | "yearly">("monthly");

  const selectedDate = useMemo(() => startOfDay(date.toDate(getLocalTimeZone())), [date]);

  const dayBills = useMemo(() => {
    return bills.filter((b) => {
      const next = getNextDueDate(b, selectedDate);
      if (!next) return false;
      const d = parseISODate(next);
      return isSameCalendarDay(d, selectedDate);
    });
  }, [bills, selectedDate]);

  const totalDue = useMemo(
    () => dayBills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0),
    [dayBills],
  );
  const dueCurrency = dayBills.find((b) => !b.paid)?.currency || "€";

  function resetForm() {
    setLabel("");
    setAmount("");
    setCurrency("€");
    setCategory("subscriptions");
    setRecurrence("monthly");
    setAdding(false);
  }

  function handleAdd() {
    if (!label.trim() || !amount) return;
    addBill({
      label: label.trim(),
      amount: Number(amount),
      currency,
      dueDate: toISODate(selectedDate),
      paid: false,
      category,
      recurrence,
    });
    resetForm();
    onChange();
  }

  function togglePaid(bill: Bill) {
    editBill(bill.id, { paid: !bill.paid });
    onChange();
  }

  function handleDelete(bill: Bill) {
    removeBill(bill.id);
    onChange();
  }

  const hasUnpaid = dayBills.some((b) => !b.paid);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">
            {selectedDate.toLocaleDateString(settings.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className="text-lg font-semibold text-white">
            {dayBills.length === 0
              ? i18n("noBillsDay")
              : `${dayBills.length} ${dayBills.length > 1 ? i18n("bills") : i18n("bill")}`}
          </p>
        </div>
        {hasUnpaid && (
          <div className="text-right">
            <p className="text-sm font-medium text-rose-400">
              {formatCurrency(totalDue, dueCurrency, settings.language)}
            </p>
            <p className="text-[10px] text-zinc-500">{i18n("dueToday")}</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto os-scroll">
      <div className="space-y-2">
        {dayBills.map((b) => {
          const brand = detectBrandMeta(b.label, { icon: "receipt", color: "var(--muted)" });
          return (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: brand.color }}
              >
                <Icon name={brand.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{b.label}</p>
                <p className="text-[10px] text-zinc-400">
                  {i18n(b.category)} · {i18n(b.recurrence)} · {b.paid ? i18n("paid") : i18n("unpaid")}
                </p>
              </div>
              <p className="text-sm font-semibold text-white">{formatCurrency(b.amount, b.currency, settings.language)}</p>
              <button
                type="button"
                onClick={() => togglePaid(b)}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
                  b.paid
                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
                )}
              >
                {b.paid ? i18n("paid") : i18n("unpaid")}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(b)}
                className="rounded p-1.5 text-zinc-500 hover:text-rose-400"
                aria-label={i18n("delete")}
              >
                <Icon name="trash-2" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={i18n("billLabel")}
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={i18n("billAmount")}
              className="w-28 rounded-xl border border-white/[0.08] bg-zinc-950/50 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
            <Select
              value={currency}
              onChange={(v) => setCurrency(v)}
              options={[
                { id: "€", label: "€" },
                { id: "$", label: "$" },
                { id: "£", label: "£" },
              ]}
            />
            <Select
              value={category}
              onChange={(v) => setCategory(v as BillCategory)}
              options={BILL_CATEGORIES.map((c) => ({ id: c as string, label: i18n(c as string) }))}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={recurrence}
              onChange={(v) => setRecurrence(v as typeof recurrence)}
              options={[
                { id: "none", label: i18n("once") },
                { id: "weekly", label: i18n("weekly") },
                { id: "monthly", label: i18n("monthly") },
                { id: "yearly", label: i18n("yearly") },
              ]}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              {i18n("save")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              {i18n("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          {i18n("addBill")}
        </button>
      )}
      </div>
    </div>
  );
}


