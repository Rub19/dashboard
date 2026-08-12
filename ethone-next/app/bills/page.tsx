"use client";

import { useEffect, useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useItems } from "@/lib/hooks/useItems";
import { Icon } from "@/lib/icons";
import {
  addBill,
  editBill,
  removeBill,
  listBills,
  upcomingBills,
  totalDueThisMonth,
  categorizeWithBrain,
  getNextDueDate,
  toISODate,
  type Bill,
  type BillCategory,
  type Recurrence,
  BILL_CATEGORIES,
} from "@/lib/bills-manager";

const TODAY = new Date();

function formatCurrency(amount: number, curr: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOverdue(bill: Bill) {
  if (bill.paid) return false;
  const next = getNextDueDate(bill, TODAY);
  if (next) return parseISODate(next) < startOfDay(TODAY);
  return parseISODate(bill.dueDate) < startOfDay(TODAY);
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

const RECURRENCES: Recurrence[] = ["none", "weekly", "monthly", "yearly"];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillsPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings } = useSettings();
  const { items: notes } = useItems("notes");
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "overdue">("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [date, setDate] = useState(toISODate(TODAY));
  const [category, setCategory] = useState<BillCategory>("other");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [paid, setPaid] = useState(false);

  const categories = settings.billsCategories?.length
    ? (settings.billsCategories as BillCategory[])
    : (BILL_CATEGORIES as unknown as BillCategory[]);

  useEffect(() => {
    setBills(listBills());
  }, []);

  const notesSnapshot = useMemo(() => {
    const scratch = typeof window !== "undefined" ? localStorage.getItem("ethone-scratchpad") || "" : "";
    const noteTexts = notes.map((n) => n.body || "");
    return scratch ? [scratch, ...noteTexts] : noteTexts;
  }, [notes]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "paid":
        return bills.filter((b) => b.paid);
      case "unpaid":
        return bills.filter((b) => !b.paid);
      case "overdue":
        return bills.filter(isOverdue);
      default:
        return bills;
    }
  }, [bills, filter]);

  const stats = useMemo(() => {
    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    const paid = bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const due = total - paid;
    const overdue = bills.filter(isOverdue).length;
    return { total, paid, due, overdue };
  }, [bills]);

  const upcomingTotal = upcomingBills(30).reduce((sum, b) => sum + b.amount, 0);
  const thisMonthTotal = totalDueThisMonth();

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setAmount("");
    setCurrency("EUR");
    setDate(toISODate(TODAY));
    setCategory("other");
    setRecurrence("none");
    setPaid(false);
  }

  function setForm(bill: Bill) {
    setEditingId(bill.id);
    setLabel(bill.label);
    setAmount(String(bill.amount));
    setCurrency(bill.currency);
    setDate(bill.dueDate);
    setCategory(bill.category);
    setRecurrence(bill.recurrence);
    setPaid(bill.paid);
  }

  function save() {
    if (!label.trim() || !amount) return;
    try {
      const data = {
        label: label.trim(),
        amount: Number(amount),
        currency,
        dueDate: date,
        paid,
        category,
        recurrence,
      };
      if (editingId) {
        editBill(editingId, data);
        success(i18n("saved"));
      } else {
        addBill(data);
        success(i18n("created"));
      }
      setBills(listBills());
      resetForm();
    } catch {
      showError(i18n("error"));
    }
  }

  function deleteBill(id: string) {
    try {
      removeBill(id);
      setBills(listBills());
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  function togglePaid(id: string) {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    try {
      editBill(id, { paid: !bill.paid });
      setBills(listBills());
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  function scanBrain() {
    if (notesSnapshot.length === 0) {
      showError(i18n("billsNoNotes"));
      return;
    }
    const updated = categorizeWithBrain(bills, notesSnapshot);
    setBills(updated);
    success(i18n("billsScanned"));
  }

  function categoryLabel(cat: BillCategory) {
    const key = `billCategory${capitalize(String(cat))}`;
    const mapped = i18n(key);
    if (mapped !== key) return mapped;
    return capitalize(String(cat));
  }

  function recurrenceLabel(rec: Recurrence) {
    const key = `recurrence${capitalize(rec)}`;
    const mapped = i18n(key);
    if (mapped !== key) return mapped;
    return capitalize(rec);
  }

  const filters = [
    { id: "all", label: i18n("all"), count: bills.length },
    { id: "paid", label: i18n("paid"), count: bills.filter((b) => b.paid).length },
    { id: "unpaid", label: i18n("unpaid"), count: bills.filter((b) => !b.paid).length },
    { id: "overdue", label: i18n("overdue"), count: stats.overdue },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("billsTitle")}</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
            {formatCurrency(upcomingTotal, "EUR")} {i18n("billsUpcoming")}
          </span>
          <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
            {formatCurrency(thisMonthTotal, "EUR")} {i18n("billsTotalThisMonth")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("total")}</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.total, "EUR")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("paid")}</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.paid, "EUR")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("unpaid")}</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.due, "EUR")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("overdue")}</p>
          <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
        </Card3D>
      </div>

      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{i18n("billsDescription")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              aria-label={i18n("label")}
              placeholder={i18n("label")}
            />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={i18n("amount")}
              placeholder={i18n("amount")}
            />
            <select
              aria-label={i18n("currency")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
            >
              <option value="EUR">{i18n("currencyEur")}</option>
              <option value="USD">{i18n("currencyUsd")}</option>
              <option value="GBP">{i18n("currencyGbp")}</option>
            </select>
            <input
              aria-label={i18n("date")}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <select
              aria-label={i18n("category")}
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
            <select
              aria-label={i18n("recurrence")}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {recurrenceLabel(r)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              {i18n("paid")}
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Icon name="plus" className="h-4 w-4" /> {editingId ? i18n("edit") : i18n("add")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                {i18n("cancel")}
              </button>
            )}
            <button
              type="button"
              onClick={scanBrain}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              <Icon name="brain" className="h-4 w-4" /> {i18n("scanBrain")}
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-4 gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id as typeof filter)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              filter === f.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((b) => {
          const next = getNextDueDate(b, TODAY);
          const due = isOverdue(b);
          return (
            <Card3D key={b.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePaid(b.id)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      b.paid ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"
                    }`}
                    aria-label={b.paid ? i18n("markUnpaid") : i18n("markPaid")}
                  >
                    {b.paid && <Icon name="circle-check" className="h-4 w-4" />}
                  </button>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${due ? "bg-rose-500/10 text-rose-400" : "bg-rose-500/10 text-rose-400"}`}>
                    <Icon name="receipt" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={`font-medium ${b.paid ? "text-[var(--muted)] line-through" : ""}`}>{b.label}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5">{categoryLabel(b.category)}</span>
                      <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5">{recurrenceLabel(b.recurrence)}</span>
                      <span>{next ? formatDate(next) : formatDate(b.dueDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${due ? "text-red-400" : b.paid ? "text-emerald-400" : ""}`}>
                    {formatCurrency(b.amount, b.currency)}
                  </span>
                  {due && <Icon name="alert-circle" className="h-4 w-4 text-red-400" />}
                  <button
                    type="button"
                    onClick={() => setForm(b)}
                    className="text-[var(--muted)] hover:text-[var(--foreground)]"
                    aria-label={i18n("edit")}
                  >
                    <Icon name="file-edit" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBill(b.id)}
                    className="text-[var(--muted)] hover:text-red-400"
                    aria-label={i18n("delete")}
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
        {filtered.length === 0 && (
          <Card3D>
            <p className="text-center text-sm text-[var(--muted)]">{i18n("noBills")}</p>
          </Card3D>
        )}
      </div>
    </div>
  );
}
