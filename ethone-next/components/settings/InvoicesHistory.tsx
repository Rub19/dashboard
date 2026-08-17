"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Filter } from "lucide-react";
import { listBills, type Bill } from "@/lib/bills-manager";
import { useI18n } from "@/lib/hooks/useI18n";

const DEMO_BILLS: Bill[] = [
  {
    id: "inv-demo-1",
    label: "Netflix",
    amount: 15.49,
    currency: "EUR",
    dueDate: "2026-07-15",
    paid: true,
    category: "subscriptions",
    recurrence: "monthly",
    createdAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "inv-demo-2",
    label: "Adobe Creative Cloud",
    amount: 59.99,
    currency: "EUR",
    dueDate: "2026-08-08",
    paid: true,
    category: "subscriptions",
    recurrence: "monthly",
    createdAt: "2026-08-08T00:00:00.000Z",
  },
  {
    id: "inv-demo-3",
    label: "Figma Pro",
    amount: 12.0,
    currency: "EUR",
    dueDate: "2026-08-22",
    paid: false,
    category: "subscriptions",
    recurrence: "monthly",
    createdAt: "2026-08-22T00:00:00.000Z",
  },
];

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InvoicesHistory() {
  const i18n = useI18n();
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setBills(listBills());
  }, []);

  const rows = useMemo(() => {
    const source = bills.length ? bills : DEMO_BILLS;
    return [...source].sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  }, [bills]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-sm backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">{i18n("invoiceHistory") || "Historique des factures"}</h2>
          <p className="text-[10px] text-zinc-500">{i18n("invoiceHistoryDescription") || "Liste des paiements et échéances récentes"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={i18n("filter") || "Filtrer"}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={i18n("download") || "Télécharger"}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem]">
          <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs font-medium text-zinc-400">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">{i18n("invoice") || "Facture"}</th>
              <th className="px-4 py-2.5 text-left font-medium">{i18n("date") || "Date"}</th>
              <th className="px-4 py-2.5 text-right font-medium">{i18n("amount") || "Montant"}</th>
              <th className="px-4 py-2.5 text-left font-medium">{i18n("status") || "Statut"}</th>
              <th className="px-4 py-2.5 text-right font-medium">{i18n("actions") || "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bill) => (
              <tr
                key={bill.id}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 text-sm text-zinc-200">{bill.label}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">
                  {formatDate(bill.dueDate)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-zinc-200 whitespace-nowrap">
                  {formatCurrency(bill.amount, bill.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                      bill.paid
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {bill.paid ? i18n("paidInvoice") || "Payée" : i18n("pendingInvoice") || "En attente"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={i18n("downloadPdf") || "Télécharger le PDF"}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={i18n("downloadReceipt") || "Télécharger le reçu"}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
