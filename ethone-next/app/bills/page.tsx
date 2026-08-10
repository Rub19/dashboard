"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useUserData } from "@/lib/hooks/useUserData";
import { Receipt, Plus, Trash2, AlertCircle } from "lucide-react";

const TODAY = new Date();
const WEEK = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + i);
  return d;
});

export default function BillsPage() {
  const { items: bills, create, remove } = useUserData("bill");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(TODAY));
  const [currency, setCurrency] = useState("EUR");

  const totalDue = useMemo(() => bills.reduce((sum, b) => sum + Number((b.data as { amount?: number }).amount || 0), 0), [bills]);

  function add() {
    if (!label.trim() || !amount) return;
    create(label, "", { amount: Number(amount), date, currency, paid: false });
    setLabel("");
    setAmount("");
  }

  function formatCurrency(amount: number, curr: string) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(amount);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bills & Paiements</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {formatCurrency(totalDue, "EUR")} dû
        </span>
      </div>

      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Suivez vos factures et échéances sur 7 jours.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nom de la facture..."
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          </div>
          <button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </Card3D>

      <div className="grid grid-cols-7 gap-2">
        {WEEK.map((d) => {
          const iso = toISODate(d);
          const dayBills = bills.filter((b) => (b.data as { date?: string }).date === iso);
          return (
            <Card3D key={iso}>
              <div className="space-y-2 text-center">
                <p className="text-xs uppercase text-[var(--muted)]">{d.toLocaleDateString("fr-FR", { weekday: "narrow" })}</p>
                <p className="text-lg font-semibold">{d.getDate()}</p>
                {dayBills.length > 0 && (
                  <p className="text-[10px] text-[var(--accent)]">{dayBills.length} fact.</p>
                )}
              </div>
            </Card3D>
          );
        })}
      </div>

      <div className="space-y-3">
        {bills.map((b) => {
          const data = b.data as { amount?: number; date?: string; currency?: string; paid?: boolean };
          const due = data.date ? new Date(data.date) < TODAY && !data.paid : false;
          return (
            <Card3D key={b.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{b.label}</p>
                    <p className="text-xs text-[var(--muted)]">{data.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${due ? "text-red-400" : ""}`}>
                    {formatCurrency(data.amount || 0, data.currency || "EUR")}
                  </span>
                  {due && <AlertCircle className="h-4 w-4 text-red-400" />}
                  <button onClick={() => remove(b.id)} className="text-[var(--muted)] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
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

function toISODate(date: Date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
