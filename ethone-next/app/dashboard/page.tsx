"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardOverview from "@/components/DashboardOverview";
import Modal from "@/components/ui/Modal";
import confetti from "canvas-confetti";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const hasThanked = useRef(false);

  useEffect(() => {
    if (hasThanked.current) return;
    if (searchParams?.get("supported") !== "true") return;

    hasThanked.current = true;
    setOpen(true);

    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#10B981", "#06B6D4", "#F43F5E", "#F59E0B", "#FFFFFF"],
    });

    window.history.replaceState(null, "", "/dashboard");
  }, [searchParams]);

  return (
    <>
      <DashboardOverview />
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Merci ! ✨"
        description="Votre soutien aide ETHONE OS à grandir."
        cancelLabel="Fermer"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <p className="text-[var(--foreground)]">
            Un grand merci pour votre précieux soutien. Vous êtes génial·e.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-transform hover:scale-105 active:scale-95"
          >
            Fermer
          </button>
        </div>
      </Modal>
    </>
  );
}
