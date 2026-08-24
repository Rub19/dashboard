"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";
import VendorLogo from "@/components/logos/VendorLogo";

export type BillCategory = "monthly" | "yearly" | "event";

export type CalendarItem = {
  id: string;
  title: string;
  amount?: number;
  date: string; // ISO 8601 (YYYY-MM-DD)
  category: BillCategory;
  vendor?: "netflix" | "adobe" | "apple" | "figma" | "spotify" | "notion" | string;
  logo?: string;
  color?: string;
};

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarBills({ items = [] }: { items?: CalendarItem[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [today] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const start = startOfMonth(currentDate);

  // Build grid cells (always show 6 weeks to keep layout stable)
  const gridDays = useMemo(() => {
    const days: Date[] = [];
    const startDayOfWeek = (start.getDay() + 6) % 7; // MON=0 ... SUN=6
    const firstCell = new Date(start);
    firstCell.setDate(start.getDate() - startDayOfWeek);
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstCell);
      d.setDate(firstCell.getDate() + i);
      days.push(d);
    }
    return days;
  }, [start]);

  const monthItems = useMemo(
    () => items.filter((it) => {
      const d = new Date(it.date);
      return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
    }),
    [items, currentDate]
  );

  const monthlyTotal = useMemo(
    () => monthItems.filter((it) => it.category === "monthly").reduce((sum, it) => sum + (it.amount || 0), 0),
    [monthItems]
  );

  const subscriptionsCount = monthItems.filter((it) => it.category === "monthly").length;
  const newCount = monthItems.filter((it) => it.category === "yearly" || it.category === "event").length;

  function itemsForDay(day: Date) {
    return monthItems.filter((it) => it.date === toISODate(day));
  }

  function openAdd() {
    setSelected(null);
    setModalOpen(true);
  }

  function openItem(item: CalendarItem) {
    setSelected(item);
    setModalOpen(true);
  }

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.04] shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {formatMonthYear(currentDate)}
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentDate((d) => addMonths(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--text-primary)]/5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--foreground)]"
              aria-label="Previous month"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl bg-[var(--text-primary)]/10 px-4 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--text-primary)]/15"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--text-primary)]/5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--foreground)]"
              aria-label="Next month"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--warning)] text-[var(--text-primary)] shadow-lg shadow-[var(--warning)]/30 transition-transform active:scale-[0.98]"
            aria-label="Add item"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.03] backdrop-blur-[var(--panel-blur)]">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 bg-[var(--panel-bg)]/[0.02]">
          {gridDays.map((day, idx) => {
            const inMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, today);
            const dayItems = itemsForDay(day);

            return (
              <div
                key={idx}
                onClick={() => dayItems.length > 0 && openItem(dayItems[0])}
                className={`group relative min-h-[6.5rem] cursor-pointer border-b border-r border-[var(--panel-border)] p-2 transition-colors hover:bg-[var(--panel-bg)]/[0.03] ${
                  !inMonth ? "bg-black/[0.08] text-[var(--text-muted)]" : "text-[var(--foreground)]"
                } ${isToday ? "bg-orange-500/10 ring-1 ring-inset ring-orange-500/30" : ""} backdrop-blur-[var(--panel-blur)]`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-orange-500 text-white" : "text-[var(--text-muted)] group-hover:text-[var(--foreground)]"
                  }`}
                >
                  {day.getDate()}
                </span>

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.08] px-1.5 py-1 backdrop-blur-[var(--panel-blur)]"
                      title={item.title}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: item.color || (item.category === "monthly" ? "#A259FF" : "#F59E0B") }}
                      >
                        <VendorLogo vendor={item.vendor} className="h-3.5 w-3.5" />
                      </span>
                      {inMonth && (
                        <span className="hidden text-[10px] text-[var(--foreground)] sm:inline">
                          {item.title}
                        </span>
                      )}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[10px] text-[var(--text-muted)]">+{dayItems.length - 3}</span>
                  )}
                </div>

                <div className="absolute bottom-2 left-2 flex gap-1">
                  {dayItems.map((item) => (
                    <span
                      key={`dot-${item.id}`}
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.category === "monthly" ? "bg-purple-500" : item.category === "yearly" ? "bg-yellow-500" : "bg-blue-500"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.03] px-6 py-4 sm:flex-row sm:items-center backdrop-blur-[var(--panel-blur)]">
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              MONTHLY
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              YEARLY
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-medium text-[var(--foreground)]">
              {subscriptionsCount} SUBSCRIPTIONS / {newCount} NEW
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              MONTHLY TOTAL: <span className="text-sm font-bold text-[var(--foreground)]">${monthlyTotal.toFixed(2)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[
              { icon: "more-horizontal", label: "More" },
              { icon: "search", label: "Search" },
              { icon: "download", label: "Export" },
              { icon: "sparkles", label: "Actions" },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                aria-label={action.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--text-primary)]/5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--foreground)]"
              >
                <Icon name={action.icon} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Detail modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? selected.title : "Add bill or event"}
        size="sm"
        hideFooter
      >
        {selected ? (
          <div className="mt-2 space-y-2 text-sm text-[var(--text-muted)]">
            <p>
              Category: <span className="text-[var(--foreground)]">{selected.category}</span>
            </p>
            <p>
              Date: <span className="text-[var(--foreground)]">{selected.date}</span>
            </p>
            {selected.amount ? (
              <p>
                Amount: <span className="text-[var(--foreground)]">${selected.amount.toFixed(2)}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Le formulaire d&apos;ajout sera intégré prochainement.
          </p>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(false)}
          className="mt-6 w-full rounded-[var(--panel-radius)] bg-[var(--accent-primary)] py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
        >
          Close
        </button>
      </Modal>
    </div>
  );
}
