"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * Remplace `window.confirm` (boîte native du navigateur : hors thème, non stylable, qui bloque aussi l'automatisation
 * et les tests) par une fenêtre de confirmation aux couleurs du dashboard.
 *
 *   if (!(await confirmDialog("Supprimer ce webhook ?"))) return;
 *
 * Renvoie une promesse : true si l'utilisateur confirme, false s'il annule (bouton, Échap ou clic à côté).
 * Aucun provider à monter : la fenêtre s'insère toute seule dans le document. Les demandes simultanées sont mises en file.
 */

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" : bouton de confirmation rouge. Déduit du texte (supprimer, annuler, retirer…) si absent. */
  tone?: "danger" | "default";
}

const DANGER_WORDS = /suppr|retir|annul|réinitialis|reinitialis|verrouill|redémarr|redemarr|révoqu|revoqu|déconnect|deconnect|purg|expuls|banni/i;

function resolveOptions(message: string, options: ConfirmOptions | undefined) {
  const danger = options?.tone ? options.tone === "danger" : DANGER_WORDS.test(message);
  return {
    title: options?.title ?? (danger ? "Confirmer l'action" : "Confirmation"),
    confirmLabel: options?.confirmLabel ?? (/suppr/i.test(message) ? "Supprimer" : /réinitialis|reinitialis/i.test(message) ? "Réinitialiser" : "Confirmer"),
    cancelLabel: options?.cancelLabel ?? "Annuler",
    danger,
  };
}

function ConfirmView({
  message,
  title,
  confirmLabel,
  cancelLabel,
  danger,
  onResult,
}: {
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  onResult: (value: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Le focus part sur « Annuler » pour une action destructrice : Entrée ne détruit rien par réflexe.
    const target = danger ? document.getElementById("ethone-confirm-cancel") : confirmRef.current;
    (target as HTMLElement | null)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onResult(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [danger, onResult]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onResult(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ethone-confirm-title"
        aria-describedby="ethone-confirm-message"
        className="w-full max-w-sm rounded-2xl border border-[var(--panel-border,rgba(255,255,255,0.08))] bg-[var(--bg-surface-elevated,#161821)] p-5 shadow-2xl"
      >
        <h2 id="ethone-confirm-title" className="text-sm font-semibold text-white">
          {title}
        </h2>
        <p id="ethone-confirm-message" className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-zinc-400">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            id="ethone-confirm-cancel"
            type="button"
            onClick={() => onResult(false)}
            className="cursor-pointer rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onResult(true)}
            className={
              danger
                ? "cursor-pointer rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
                : "cursor-pointer rounded-lg bg-[var(--accent-primary,#6366f1)] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

let queue: Promise<unknown> = Promise.resolve();

function show(message: string, options: ConfirmOptions | undefined): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const host = document.createElement("div");
    host.setAttribute("data-ethone-confirm", "");
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      root.unmount();
      host.remove();
      resolve(value);
    };
    root.render(<ConfirmView message={message} {...resolveOptions(message, options)} onResult={finish} />);
  });
}

export function confirmDialog(message: string, options?: ConfirmOptions): Promise<boolean> {
  // Hors navigateur (rendu serveur, tests) : pas de fenêtre possible, on n'autorise rien par défaut.
  if (typeof document === "undefined") return Promise.resolve(false);
  const next = queue.then(() => show(message, options));
  queue = next.catch(() => undefined);
  return next;
}
