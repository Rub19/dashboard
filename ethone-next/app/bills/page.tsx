"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";

const TODAY = new Date();
const WEEK = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + i);
  return d;
});

function toISODate(date: Date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount: number, curr: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(amount);
}

type BillData = { amount?: number; date?: string; currency?: string; paid?: boolean };

export default function BillsPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings } = useSettings();
  const { items: bills, create, update, remove } = useUserData("bill");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(TODAY));
  const [currency, setCurrency] = useState("EUR");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "overdue">("all");

  const list = useMemo(() => {
    switch (filter) {
      case "paid":
        return bills.filter((b) => (b.data as BillData).paid);
      case "unpaid":
        return bills.filter((b) => !(b.data as BillData).paid);
      case "overdue":
        return bills.filter((b) => {
          const data = b.data as BillData;
          return data.date && new Date(data.date) < TODAY && !data.paid;
        });
      default:
        return bills;
    }
  }, [bills, filter]);

  const stats = useMemo(() => {
    const total = bills.reduce((sum, b) => sum + Number((b.data as BillData).amount || 0), 0);
    const paid = bills.filter((b) => (b.data as BillData).paid).reduce((sum, b) => sum + Number((b.data as BillData).amount || 0), 0);
    const due = total - paid;
    const overdue = bills.filter((b) => {
      const data = b.data as BillData;
      return data.date && new Date(data.date) < TODAY && !data.paid;
    }).length;
    return { total, paid, due, overdue };
  }, [bills]);

  async function add() {
    if (!label.trim() || !amount) return;
    try {
      await create(label, "", { amount: Number(amount), date, currency, paid: false });
      setLabel("");
      setAmount("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteBill(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function togglePaid(b: { id: string; data: Record<string, unknown> }) {
    try {
      const data = { ...(b.data as BillData), paid: !(b.data as BillData).paid };
      await update(b.id, { data });
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  const filters = [
    { id: "all", label: i18n("all"), count: bills.length },
    { id: "paid", label: i18n("paid"), count: bills.filter((b) => (b.data as BillData).paid).length },
    { id: "unpaid", label: i18n("unpaid"), count: bills.filter((b) => !(b.data as BillData).paid).length },
    { id: "overdue", label: i18n("overdue"), count: stats.overdue },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("billsTitle")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {formatCurrency(stats.due, "EUR")} {i18n("due")}
        </span>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
            <select aria-label={i18n("currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
              <option value="EUR">{i18n("currencyEur")}</option>
              <option value="USD">{i18n("currencyUsd")}</option>
              <option value="GBP">{i18n("currencyGbp")}</option>
            </select>
            <input aria-label={i18n("date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          </div>
          <button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            <Icon name="plus" className="h-4 w-4" /> {i18n("add")}
          </button>
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

      <div className="grid grid-cols-7 gap-2">
        {WEEK.map((d) => {
          const iso = toISODate(d);
          const dayBills = bills.filter((b) => (b.data as BillData).date === iso);
          return (
            <Card3D key={iso}>
              <div className="space-y-2 text-center">
                <p className="text-xs uppercase text-[var(--muted)]">{d.toLocaleDateString(settings.language, { weekday: "narrow" })}</p>
                <p className="text-lg font-semibold">{d.getDate()}</p>
                {dayBills.length > 0 && (
                  <p className="text-[10px] text-[var(--accent)]">{dayBills.length} {i18n("bill")}</p>
                )}
              </div>
            </Card3D>
          );
        })}
      </div>

      <div className="space-y-3">
        {list.map((b) => {
          const data = b.data as BillData;
          const due = data.date ? new Date(data.date) < TODAY && !data.paid : false;
          return (
            <Card3D key={b.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePaid(b)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      data.paid ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"
                    }`}
                    aria-label={data.paid ? i18n("markUnpaid") : i18n("markPaid")}
                  >
                    {data.paid && <Icon name="circle-check" className="h-4 w-4" />}
                  </button>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${due ? "bg-rose-500/10 text-rose-400" : "bg-rose-500/10 text-rose-400"}`}>
                    <Icon name="receipt" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={`font-medium ${data.paid ? "text-[var(--muted)] line-through" : ""}`}>{b.label}</p>
                    <p className="text-xs text-[var(--muted)]">{data.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${due ? "text-red-400" : data.paid ? "text-emerald-400" : ""}`}>
                    {formatCurrency(data.amount || 0, data.currency || "EUR")}
                  </span>
                  {due && <Icon name="alert-circle" className="h-4 w-4 text-red-400" />}
                  <button onClick={() => deleteBill(b.id)} className="text-[var(--muted)] hover:text-red-400">
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
