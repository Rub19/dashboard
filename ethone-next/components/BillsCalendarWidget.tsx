"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";
import { uploadWorker } from "@/lib/api";
import {
  listBills,
  getNextDueDate,
  parseISODate,
  toISODate,
  addBill,
  removeBill,
  type Bill,
  type BillCategory,
  BILL_CATEGORIES,
} from "@/lib/bills-manager";
import { detectBrandMeta } from "@/lib/bills-brands";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BillCategory>("subscriptions");
  const [currency, setCurrency] = useState("€");
  const [recurrence, setRecurrence] = useState<"none" | "monthly" | "yearly" | "weekly">("monthly");

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

  function handleAdd() {
    if (!label.trim() || !amount) return;
    addBill({
      label: label.trim(),
      amount: Number(amount),
      currency,
      dueDate: toISODate(selected),
      paid: false,
      category,
      recurrence,
    });
    setLabel("");
    setAmount("");
    setAdding(false);
    reload();
  }

  function handleDelete(id: string) {
    removeBill(id);
    reload();
  }

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const res = await uploadWorker("/api/bills/scan", file);
      if (res?.data) {
        const scanned = res.data;
        if (scanned.label) setLabel(scanned.label);
        if (scanned.amount) setAmount(String(scanned.amount));
        if (scanned.currency) setCurrency(scanned.currency);
        if (scanned.category && (BILL_CATEGORIES as unknown as string[]).includes(scanned.category)) {
          setCategory(scanned.category as BillCategory);
        }
        if (scanned.dueDate) {
          const d = parseISODate(scanned.dueDate);
          if (!isNaN(d.getTime())) setSelected(d);
        }
        setAdding(true);
      }
    } catch {
      // ignore scan errors, fallback to manual add
    } finally {
      setScanning(false);
    }
  }

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
            <p className="text-[10px] text-[var(--muted)]">{upcoming30.length} {i18n("upcomingIn30")}</p>
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
                className={`relative flex flex-col items-center gap-1 rounded-[var(--panel-radius)] p-2 text-xs transition-colors duration-150 ${
                  isSelected
                    ? "bg-[var(--accent)] text-white"
                    : isToday
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "bg-[var(--panel-bg)] text-[var(--foreground)] hover:bg-[var(--panel-bg)]"
                }`}
              >
                <span className={`text-[10px] uppercase ${isSelected ? "text-white/70" : "text-[var(--muted)]"}`}>{weekdayFormatter.format(d)}</span>
                <span className="text-sm font-semibold">{d.getDate()}</span>
                {dayBills.length > 0 && (
                  <span className="mt-0.5 flex -space-x-1.5 overflow-hidden p-0.5">
                    {dayBills.slice(0, 3).map((b) => {
                      const brand = detectBrandMeta(b.label, { icon: "receipt", color: "var(--muted)" });
                      return brand.logo ? (
                        <Image
                          key={b.id}
                          src={brand.logo}
                          alt=""
                          width={16}
                          height={16}
                          unoptimized
                          className="h-4 w-4 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/20 object-contain p-0.5 backdrop-blur-[var(--panel-blur)]"
                        />
                      ) : (
                        <span
                          key={b.id}
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--panel-border)] text-[8px]"
                          style={{ backgroundColor: brand.color }}
                        >
                          <Icon name={brand.icon} className="h-2.5 w-2.5 text-white" />
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            {i18n("add")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel-bg)] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
          >
            <Icon name={scanning ? "loader-2" : "scan"} className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
            {i18n("scan")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScan(file);
              e.target.value = "";
            }}
          />
        </div>

        {adding && (
          <div className="space-y-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3 backdrop-blur-[var(--panel-blur)]">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={i18n("billLabel")} />
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={i18n("billAmount")}
                className="w-28 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
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
                className="flex-1 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
              >
                {i18n("save")}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {selectedBills.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">{i18n("noBillsDay")}</p>
          ) : (
            selectedBills.map((b) => {
              const brand = detectBrandMeta(b.label, { icon: "receipt", color: "var(--muted)" });
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2.5">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/20 object-contain p-1.5 backdrop-blur-[var(--panel-blur)]"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--panel-radius)] text-white"
                      style={{ backgroundColor: brand.color }}
                    >
                      <Icon name={brand.icon} className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.label}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {i18n(b.category)} · {b.paid ? i18n("paid") : i18n("unpaid")} · {i18n(b.recurrence)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(b.amount, b.currency, settings.language)}</p>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--panel-bg)] hover:text-red-400"
                    aria-label={i18n("delete")}
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card3D>
  );
}
