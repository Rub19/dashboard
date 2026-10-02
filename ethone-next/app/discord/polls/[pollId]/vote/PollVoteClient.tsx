"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { POLL_BOT_API_URL, usePollData } from "../usePollData";
import { formatApiError } from "@/lib/format-error";

/** Vote depuis le web : le bot enregistre le vote au nom du compte Discord connecté (jamais un identifiant saisi). */
export default function PollVoteClient() {
  const { poll, loading, error, reload, guildId, pollId } = usePollData();
  const { success, error: toastError } = useToast();
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const guildQuery = guildId ? `?guildId=${guildId}` : "";

  if (loading)
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Chargement du sondage">
        <div className="skeleton-shimmer h-8 w-2/3 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        {[0, 1].map((i) => (
          <div key={i} className="skeleton-shimmer h-40 rounded-[var(--panel-radius)]" />
        ))}
      </div>
    );

  if (error || !poll) {
    return (
      <div className="rise-in mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Sondage indisponible</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{error || "Ce sondage n'existe pas sur ce serveur."}</p>
      </div>
    );
  }

  const votable = poll.status === "ACTIVE";

  const toggle = (questionId: string, optionId: string, multiple: boolean) => {
    setChoices((prev) => {
      const current = prev[questionId] ?? [];
      if (!multiple) return { ...prev, [questionId]: [optionId] };
      return { ...prev, [questionId]: current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId] };
    });
  };

  const submit = async () => {
    if (!guildId || !POLL_BOT_API_URL) return;
    const missing = poll.questions.find((q) => (choices[q.id]?.length ?? 0) === 0);
    if (missing) {
      toastError("Vote incomplet", `Choisissez une réponse pour « ${missing.title} ».`);
      return;
    }
    setSending(true);
    try {
      // Le bot enregistre une question par requête
      for (const question of poll.questions) {
        const res = await fetch(`${POLL_BOT_API_URL}/api/guilds/${guildId}/polls/${encodeURIComponent(pollId)}/vote`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections: { [question.id]: choices[question.id] } }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) throw new Error(formatApiError(data?.error, "Le bot a refusé ce vote."));
      }
      setDone(true);
      success("Vote enregistré", "Merci pour votre participation.");
      reload();
    } catch (e) {
      toastError("Vote refusé", e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="text-[var(--text-primary)]">
      <div className="stagger-children mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">{poll.title}</h1>
        {poll.description && <p className="mt-2 text-sm text-[var(--text-muted)]">{poll.description}</p>}

        {!votable && <p className="mt-5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--text-primary)]">Ce sondage n&apos;accepte pas de votes pour le moment (statut : {poll.status}).</p>}

        <div className="stagger-children mt-6 space-y-5">
          {poll.questions.map((question) => {
            const multiple = poll.type === "MULTIPLE_CHOICE" || (question.maxSelections ?? 1) > 1;
            return (
              <fieldset key={question.id} disabled={!votable || done} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
                <legend className="px-1 text-sm font-semibold">{question.title}</legend>
                <div className="mt-2 space-y-2">
                  {question.options.map((option) => {
                    const selected = (choices[question.id] ?? []).includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`relative isolate flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-[border-color,background-color,transform] duration-150 active:scale-[0.985] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent-primary)]/50 ${
                          selected ? "border-[var(--accent-primary)]/60" : "border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/70"
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId={multiple ? undefined : `vote-${question.id}`}
                            initial={multiple ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                            className="absolute inset-0 -z-10 rounded-[inherit] bg-[var(--accent-primary)]/10"
                          />
                        )}
                        <input
                          type={multiple ? "checkbox" : "radio"}
                          name={question.id}
                          checked={selected}
                          onChange={() => toggle(question.id, option.id, multiple)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`grid h-5 w-5 shrink-0 place-items-center border transition-colors duration-150 ${multiple ? "rounded-md" : "rounded-full"} ${
                            selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "border-[var(--text-muted)]/50"
                          }`}
                        >
                          <AnimatePresence initial={false}>
                            {selected && (
                              <motion.span key="c" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
                                <Check className="h-3 w-3" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        <span>
                          {option.emoji ? `${option.emoji} ` : ""}
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!votable || done || sending}
            className="cursor-pointer rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={done ? "done" : sending ? "sending" : "idle"}
                initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-1.5"
              >
                {done && <Check className="h-4 w-4" />}
                {done ? "Vote enregistré" : sending ? "Envoi…" : "Voter"}
              </motion.span>
            </AnimatePresence>
          </button>
          <Link href={`/discord/polls/${encodeURIComponent(pollId)}${guildQuery}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            Voir le sondage
          </Link>
        </div>
      </div>
    </div>
  );
}
