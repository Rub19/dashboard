"use client";

import { useMemo, useState } from "react";
import { Calendar, X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import CalendarGrid from "@/components/CalendarGrid";
import { EventsCard, InvoicesCard } from "@/components/EventsAndBillsCards";
import type { CalendarItem } from "@/components/CalendarBills";
import Modal from "@/components/ui/Modal";
import VendorLogo from "@/components/logos/VendorLogo";

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function CalendarInvoicesPage() {
  const i18n = useI18n();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [today] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [items] = useState<CalendarItem[]>([]);

  const dots = useMemo(
    () =>
      items.map((it) => ({
        date: it.date,
        category: (it.category === "monthly" || it.category === "yearly" ? "bill" : "meeting") as "bill" | "meeting" | "flow",
      })),
    [items]
  );

  const dayItems = useMemo(
    () => items.filter((it) => it.date === toISODate(selectedDate)),
    [items, selectedDate]
  );

  function openAdd() {
    setSelectedItem(null);
    setModalOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-3">
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            today={today}
            dots={dots}
            onSelect={setSelectedDate}
            onChange={setCurrentDate}
            monthLabel={formatMonthYear(currentDate)}
          />
        </div>

        <div className="col-span-12 flex flex-col gap-4 lg:col-span-5">
          <EventsCard
            date={selectedDate}
            items={dayItems}
            onAdd={openAdd}
          />
          <InvoicesCard
            items={items}
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAdd={openAdd}
          />

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Réunion
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Facture
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[--accent-primary]" />
              Flow
            </span>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? selectedItem.title : "Ajouter une facture ou un événement"}
        size="sm"
        hideFooter
      >
        {selectedItem ? (
          <div className="mt-2 space-y-2 text-sm text-[var(--text-muted)]">
            <p>
              Catégorie : <span className="text-[var(--text-primary)]">{selectedItem.category}</span>
            </p>
            <p>
              Date : <span className="text-[var(--text-primary)]">{selectedItem.date}</span>
            </p>
            {selectedItem.amount ? (
              <p>
                Montant : <span className="text-[var(--text-primary)]">${selectedItem.amount.toFixed(2)}</span>
              </p>
            ) : null}
            {selectedItem.vendor && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] p-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-primary)]"
                  style={{ backgroundColor: selectedItem.color || "#A259FF" }}
                >
                  <VendorLogo vendor={selectedItem.vendor} className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{selectedItem.title}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-col items-center justify-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Calendar className="h-6 w-6" />
            <p className="text-sm">{i18n("addInvoiceSoon", "Le formulaire d'ajout sera intégré prochainement.")}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(false)}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-color, var(--accent-primary))" }}
        >
          <X className="h-4 w-4" />
          Fermer
        </button>
      </Modal>
      </div>
    </div>
  );
}
