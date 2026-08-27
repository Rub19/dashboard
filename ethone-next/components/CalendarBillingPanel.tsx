"use client";

import { useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { detectBrandMeta, BILL_BRANDS } from "@/lib/bills-brands";
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
import { Check, Trash2, Plus, Calendar, CreditCard, Tag, Sparkles } from "lucide-react";
import { hapticSuccessPattern, hapticRigidImpact } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
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

const CURRENCIES = [
  { id: "€", label: "€", code: "EUR" },
  { id: "$", label: "$", code: "USD" },
  { id: "£", label: "£", code: "GBP" },
  { id: "CHF", label: "CHF", code: "CHF" },
];

function currencyCode(symbol: string) {
  return CURRENCIES.find((c) => c.id === symbol)?.code ?? (symbol.length === 3 ? symbol : "EUR");
}

function formatCurrency(amount: number, currency: string, locale: string) {
  const code = currencyCode(currency);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
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
  const { success, notify } = useToast();

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
    [dayBills]
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

  function handleLabelChange(value: string) {
    setLabel(value);
    const meta = detectBrandMeta(value);
    if (meta.defaultAmount && !amount) {
      setAmount(String(meta.defaultAmount));
    }
    if (meta.currency) {
      setCurrency(meta.currency);
    }
    if (meta.category) {
      setCategory(meta.category);
    }
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
    success("Facture enregistrée", `${label.trim()} (${amount}${currency})`);
    resetForm();
    onChange();
  }

  function togglePaid(bill: Bill) {
    if (!bill.paid) hapticSuccessPattern();
    editBill(bill.id, { paid: !bill.paid });
    onChange();
  }

  function handleDelete(bill: Bill) {
    hapticRigidImpact();
    removeBill(bill.id);
    onChange();
  }

  const hasUnpaid = dayBills.some((b) => !b.paid);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d14]/90 p-4 sm:p-5 backdrop-blur-2xl shadow-xl">
      {/* Header with Selected Date & Total Due */}
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <p className="text-xs font-semibold capitalize text-zinc-400">
            {selectedDate.toLocaleDateString(settings.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h3 className="text-base font-bold text-white mt-0.5">
            {dayBills.length === 0
              ? "Aucune facture ce jour"
              : `${dayBills.length} facture${dayBills.length > 1 ? "s" : ""} / échéance${dayBills.length > 1 ? "s" : ""}`}
          </h3>
        </div>

        {hasUnpaid && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-right">
            <p className="text-sm font-black text-rose-300">
              {formatCurrency(totalDue, dueCurrency, settings.language)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">À payer</p>
          </div>
        )}
      </div>

      {/* List of Bills for the Day */}
      <div className="min-h-0 flex-1 overflow-y-auto os-scroll space-y-2.5 pr-1">
        {dayBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 mb-2">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">Rien à payer ce jour</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Sélectionnez une autre date ou ajoutez un abonnement ci-dessous.
            </p>
          </div>
        ) : (
          dayBills.map((b) => {
            const brand = detectBrandMeta(b.label, { icon: "receipt", color: "#8b5cf6" });
            return (
              <div
                key={b.id}
                className={cn(
                  "group relative flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-200",
                  b.paid
                    ? "border-white/5 bg-white/[0.02] opacity-70"
                    : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
                )}
              >
                {/* Brand Logo or Icon */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-xs"
                    style={{ backgroundColor: brand.bgColor || "#18181b" }}
                  >
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt=""
                        className="h-5 w-5 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Icon name={brand.icon} className="h-5 w-5 text-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{b.label}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
                      <span className="capitalize">{i18n(b.category)}</span>
                      <span>·</span>
                      <span className="capitalize">{i18n(b.recurrence)}</span>
                    </div>
                  </div>
                </div>

                {/* Amount & Paid Toggle */}
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">
                    {formatCurrency(b.amount, b.currency, settings.language)}
                  </span>

                  <button
                    type="button"
                    onClick={() => togglePaid(b)}
                    className={cn(
                      "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                      b.paid
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                    )}
                  >
                    {b.paid ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Payé</span>
                      </>
                    ) : (
                      <span>Non payé</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Bill Form / Trigger */}
      <div className="pt-3 border-t border-white/10 shrink-0">
        {adding ? (
          <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-3.5 animate-in fade-in zoom-in-95 duration-150">
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Nom ou marque (ex: Netflix, ChatGPT, EDF)..."
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Montant"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-500 outline-none"
              />

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs text-zinc-300 outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                className="rounded-xl border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="monthly" className="bg-zinc-900 text-white">Mensuel</option>
                <option value="yearly" className="bg-zinc-900 text-white">Annuel</option>
                <option value="weekly" className="bg-zinc-900 text-white">Hebdo</option>
                <option value="none" className="bg-zinc-900 text-white">Ponctuel</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!label.trim() || !amount}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter une facture / abonnement</span>
          </button>
        )}
      </div>
    </div>
  );
}
