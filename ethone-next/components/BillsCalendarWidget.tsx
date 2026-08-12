"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import { listBills, getNextDueDate, parseISODate, toISODate, type Bill, type BillCategory } from "@/lib/bills-manager";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const CATEGORY_META: Record<BillCategory, { icon: string; color: string }> = {
  housing: { icon: "home", color: "#f59e0b" },
  utilities: { icon: "zap", color: "#3b82f6" },
  transport: { icon: "car", color: "#10b981" },
  health: { icon: "heart-pulse", color: "#ef4444" },
  insurance: { icon: "shield", color: "#8b5cf6" },
  subscriptions: { icon: "credit-card", color: "#ec4899" },
  food: { icon: "utensils", color: "#f97316" },
  education: { icon: "graduation-cap", color: "#06b6d4" },
  taxes: { icon: "landmark", color: "#64748b" },
  other: { icon: "file-text", color: "#94a3b8" },
};

function categoryMeta(category: BillCategory) {
  return CATEGORY_META[category] || CATEGORY_META.other;
}

function formatCurrency(amount: number, currency: string, locale: string) {
  const code = currency === "$" || currency === "USD" ? "USD" : currency === "£" || currency === "GBP" ? "GBP" : "EUR";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${currency}${amount.toFixed(2)}`;
  }
}

function billsForDay(bills: Bill[], day: Date) {
  return bills.filter((b) => {
    const next = getNextDueDate(b, day);
    if (!next) return false;
    const d = parseISODate(next);
    return isSameDay(d, day);
  });
}

export default function BillsCalendarWidget() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [bills, setBills] = useState<Bill[]>([]);

  function reload() {
    setBills(listBills());
  }

  useEffect(() => {
    reload();
    function onStorage(e: StorageEvent) {
      if (e.key === "ethone-bills-v1") reload();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const days = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      list.push(startOfDay(d));
    }
    return list;
  }, [today]);

  const selectedBills = useMemo(() => billsForDay(bills, selected), [bills, selected]);

  const upcoming30 = useMemo(() => {
    const to = new Date(today);
    to.setDate(to.getDate() + 30);
    return bills
      .filter((b) => !b.paid)
      .map((b) => ({ bill: b, next: getNextDueDate(b, today) }))
      .filter((x): x is { bill: Bill; next: string } => !!x.next)
      .filter((x) => {
        const d = parseISODate(x.next);
        return d >= today && d <= to;
      });
  }, [bills, today]);

  const total30 = upcoming30.reduce((sum, { bill }) => sum + bill.amount, 0);
  const totalCurrency = upcoming30[0]?.bill.currency || "€";

  const weekdayFormatter = new Intl.DateTimeFormat(settings.language, { weekday: "narrow" });
  const dateFormatter = new Intl.DateTimeFormat(settings.language, { day: "numeric", month: "short" });

  return (
    <Card3D>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="receipt" className="h-5 w-5 text-[var(--accent)]" />
            <p className="font-medium">{i18n("bills")}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatCurrency(total30, totalCurrency, settings.language)}</p>
            <p className="text-[10px] text-[var(--muted)]">
              {upcoming30.length} {i18n("upcomingIn30")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const dayBills = billsForDay(bills, d);
            const isSelected = isSameDay(d, selected);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={toISODate(d)}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={isSelected}
                aria-label={`${dateFormatter.format(d)}, ${dayBills.length} ${dayBills.length > 1 ? i18n("bills") : i18n("bill")}`}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-[var(--accent)] text-white"
                    : isToday
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                }`}
              >
                <span className="text-[10px] uppercase text-[var(--muted)]">{weekdayFormatter.format(d)}</span>
                <span className="text-sm font-semibold">{d.getDate()}</span>
                {dayBills.length > 0 && (
                  <span className="flex gap-0.5">
                    {dayBills.slice(0, 3).map((b) => (
                      <span
                        key={b.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: categoryMeta(b.category).color }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {selectedBills.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">{i18n("noBillsDay")}</p>
          ) : (
            selectedBills.map((b) => {
              const meta = categoryMeta(b.category);
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-raised)] p-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    <Icon name={meta.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.label}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {b.category} · {b.paid ? i18n("paid") : i18n("unpaid")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(b.amount, b.currency, settings.language)}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card3D>
  );
}
