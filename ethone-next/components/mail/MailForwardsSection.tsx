"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Trash2 } from "@/components/icons/ph";
import { fetchWorker, WorkerError } from "@/lib/api";
import type { MailAlias } from "@/lib/hooks/useMail";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Forward = { id: string; alias_id: string | null; destination: string; verified_at: string | null; is_active: boolean; last_sent_at: string | null };

const MESSAGES: Record<string, string> = {
  FORWARD_INVALID_EMAIL: "Cette adresse e-mail n'est pas valide.",
  FORWARD_SELF_DOMAIN: "Une adresse @ethone.dev ne peut pas recevoir de redirection.",
  FORWARD_LIMIT: "Tu as déjà 5 redirections. Retires-en une pour en ajouter une autre.",
  FORWARD_COOLDOWN: "Un code vient d'être envoyé. Attends une minute avant d'en redemander un.",
  FORWARD_CODE_EXPIRED: "Ce code a expiré. Demandes-en un nouveau.",
  FORWARD_TOO_MANY_ATTEMPTS: "Trop de codes faux. Demande un nouveau code.",
};

function errorText(err: unknown): string {
  if (err instanceof WorkerError) {
    if (err.code === "FORWARD_WRONG_CODE") {
      const left = (err.detail as { remaining?: number } | null)?.remaining;
      return typeof left === "number" ? `Code incorrect. Il te reste ${left} essai${left > 1 ? "s" : ""}.` : "Code incorrect.";
    }
    if (err.code && MESSAGES[err.code]) return MESSAGES[err.code];
  }
  return "Action impossible pour le moment. Réessaie.";
}

/**
 * Redirections : les mails reçus sur une adresse ETHONE sont recopiés vers une boîte externe (Gmail, iCloud…).
 * Une destination ne reçoit rien tant que le code envoyé dessus n'a pas été saisi ici.
 */
export default function MailForwardsSection({ aliases }: { aliases: MailAlias[] }) {
  const { success, error: showError } = useToast();
  const [forwards, setForwards] = useState<Forward[] | null>(null);
  const [destination, setDestination] = useState("");
  const [aliasId, setAliasId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = (await fetchWorker("/api/mail/forwards")) as { data?: Forward[] } | null;
      setForwards(res?.data ?? []);
    } catch {
      setForwards([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!destination.trim() || busy) return;
    setBusy(true);
    try {
      await fetchWorker("/api/mail/forwards", { method: "POST", body: JSON.stringify({ destination: destination.trim(), aliasId: aliasId || undefined }) });
      success("Code envoyé", `Ouvre ${destination.trim()} et saisis le code reçu.`);
      setDestination("");
      await load();
    } catch (err) {
      showError("Redirection", errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async (f: Forward) => {
    try {
      await fetchWorker("/api/mail/forwards", { method: "POST", body: JSON.stringify({ destination: f.destination, aliasId: f.alias_id || undefined }) });
      success("Nouveau code envoyé", f.destination);
      setCodeError((e) => ({ ...e, [f.id]: "" }));
      await load();
    } catch (err) {
      showError("Redirection", errorText(err));
    }
  };

  const verify = async (f: Forward) => {
    const code = (codes[f.id] || "").replace(/\D/g, "");
    if (code.length !== 6) return;
    try {
      await fetchWorker("/api/mail/forwards/verify", { method: "POST", body: JSON.stringify({ id: f.id, code }) });
      success("Redirection confirmée", `Tes mails arriveront aussi sur ${f.destination}.`);
      setCodes((c) => ({ ...c, [f.id]: "" }));
      await load();
    } catch (err) {
      setCodeError((e) => ({ ...e, [f.id]: errorText(err) }));
    }
  };

  const toggle = async (f: Forward) => {
    setForwards((list) => list?.map((x) => (x.id === f.id ? { ...x, is_active: !x.is_active } : x)) ?? null);
    try {
      await fetchWorker("/api/mail/forwards", { method: "PATCH", body: JSON.stringify({ id: f.id, active: !f.is_active }) });
    } catch (err) {
      showError("Redirection", errorText(err));
      void load();
    }
  };

  const remove = async (f: Forward) => {
    try {
      await fetchWorker("/api/mail/forwards", { method: "DELETE", body: JSON.stringify({ id: f.id }) });
      setForwards((list) => list?.filter((x) => x.id !== f.id) ?? null);
    } catch (err) {
      showError("Redirection", errorText(err));
    }
  };

  const aliasLabel = (id: string | null) => (id ? aliases.find((a) => a.id === id)?.alias ?? "Adresse supprimée" : "Toutes mes adresses");
  const input =
    "w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none";

  return (
    <div className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Redirections</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
          Reçois aussi tes mails ETHONE sur une autre boîte (Gmail, iCloud…). Un code est envoyé à cette boîte : la redirection ne marche qu&apos;une fois le code saisi, pour prouver qu&apos;elle t&apos;appartient.
        </p>
      </div>

      {forwards === null ? (
        <p className="py-2 text-center text-xs text-[var(--text-muted)]">Chargement…</p>
      ) : (
        forwards.length > 0 && (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {forwards.map((f) => (
                <motion.li
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING_LAYOUT}
                  className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--text-primary)]">
                        <span className="truncate font-mono text-[var(--text-muted)]">{aliasLabel(f.alias_id)}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate font-mono font-semibold">{f.destination}</span>
                      </p>
                      <p className={cn("mt-0.5 text-[10px]", f.verified_at ? (f.is_active ? "text-[var(--success)]" : "text-[var(--text-muted)]") : "text-[var(--warning)]")}>
                        {f.verified_at ? (f.is_active ? "Confirmée · active" : "Confirmée · en pause") : "En attente du code"}
                      </p>
                    </div>
                    {f.verified_at && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={f.is_active}
                        aria-label={f.is_active ? "Mettre en pause" : "Réactiver"}
                        onClick={() => toggle(f)}
                        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", f.is_active ? "bg-[var(--success)]" : "bg-[var(--panel-border)]")}
                      >
                        <motion.span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" initial={false} animate={{ x: f.is_active ? 16 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} />
                      </button>
                    )}
                    <button type="button" onClick={() => remove(f)} aria-label={`Supprimer la redirection vers ${f.destination}`} className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {!f.verified_at && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          value={codes[f.id] || ""}
                          onChange={(e) => {
                            setCodes((c) => ({ ...c, [f.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }));
                            setCodeError((er) => ({ ...er, [f.id]: "" }));
                          }}
                          onKeyDown={(e) => e.key === "Enter" && verify(f)}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="Code à 6 chiffres"
                          aria-label={`Code reçu sur ${f.destination}`}
                          className={cn(input, "font-mono tracking-[0.3em]")}
                        />
                        <button
                          type="button"
                          onClick={() => verify(f)}
                          disabled={(codes[f.id] || "").length !== 6}
                          className="flex shrink-0 items-center gap-1 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-contrast)] disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Confirmer
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-[var(--danger)]">{codeError[f.id]}</p>
                        <button type="button" onClick={() => resend(f)} className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          Renvoyer le code
                        </button>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )
      )}

      <div className="space-y-2">
        {aliases.length > 1 && (
          <select value={aliasId} onChange={(e) => setAliasId(e.target.value)} aria-label="Adresse ETHONE à rediriger" className={input}>
            <option value="">Toutes mes adresses ETHONE</option>
            {aliases.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alias}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="email"
            value={destination}
            onChange={(e) => setDestination(e.target.value.slice(0, 320))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="ton.adresse@gmail.com"
            aria-label="Boîte de destination"
            className={input}
          />
          <button
            type="button"
            onClick={add}
            disabled={busy || !destination.includes("@")}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-contrast)] disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Envoyer le code
          </button>
        </div>
      </div>
    </div>
  );
}
