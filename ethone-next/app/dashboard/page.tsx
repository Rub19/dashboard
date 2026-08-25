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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (hasThanked.current) return;
    if (searchParams?.get("supported") !== "true") return;

    hasThanked.current = true;
    setOpen(true);

    if (canvasRef.current) {
      confetti
        .create(canvasRef.current, { resize: true })({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.55 },
          colors: ["#10B981", "#06B6D4", "#F43F5E", "#F59E0B", "#FFFFFF"],
        });
    }

    window.history.replaceState(null, "", "/dashboard");
  }, [searchParams]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9999]"
        aria-hidden="true"
      />
      <DashboardOverview />
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Merci ! ✨"
        description="Votre soutien aide ETHONE OS à grandir."
        cancelLabel="Fermer"
        size="sm"
        closeOnBackdrop={false}
        closeOnEscape={false}
        hideFooter
      >
        <p className="text-center text-[var(--foreground)]">
          Un grand merci pour votre précieux soutien. Vous êtes génial·e.
        </p>
      </Modal>
    </>
  );
}
