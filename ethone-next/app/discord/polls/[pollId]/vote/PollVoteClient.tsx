"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { POLL_BOT_API_URL, usePollData } from "../usePollData";

/** Vote depuis le web : le bot enregistre le vote au nom du compte Discord connecté (jamais un identifiant saisi). */
export default function PollVoteClient() {
  const { poll, loading, error, reload, guildId, pollId } = usePollData();
  const { success, error: toastError } = useToast();
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const guildQuery = guildId ? `?guildId=${guildId}` : "";

  if (loading) return <div className="flex h-full items-center justify-center text-xs text-zinc-400">Chargement du sondage…</div>;

  if (error || !poll) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-white">Sondage indisponible</p>
        <p className="mt-2 text-xs text-zinc-400">{error || "Ce sondage n'existe pas sur ce serveur."}</p>
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
        if (!res.ok || data?.success === false) throw new Error(data?.error || "Le bot a refusé ce vote.");
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
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">{poll.title}</h1>
        {poll.description && <p className="mt-2 text-sm text-zinc-400">{poll.description}</p>}

        {!votable && <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">Ce sondage n&apos;accepte pas de votes pour le moment (statut : {poll.status}).</p>}

        <div className="mt-6 space-y-5">
          {poll.questions.map((question) => {
            const multiple = poll.type === "MULTIPLE_CHOICE" || (question.maxSelections ?? 1) > 1;
            return (
              <fieldset key={question.id} disabled={!votable || done} className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
                <legend className="px-1 text-sm font-semibold">{question.title}</legend>
                <div className="mt-2 space-y-2">
                  {question.options.map((option) => {
                    const selected = (choices[question.id] ?? []).includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                          selected ? "border-indigo-400/60 bg-indigo-500/10" : "border-[var(--panel-border)] hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type={multiple ? "checkbox" : "radio"}
                          name={question.id}
                          checked={selected}
                          onChange={() => toggle(question.id, option.id, multiple)}
                          className="h-4 w-4 accent-indigo-500"
                        />
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
            className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {done ? "Vote enregistré" : sending ? "Envoi…" : "Voter"}
          </button>
          <Link href={`/discord/polls/${encodeURIComponent(pollId)}${guildQuery}`} className="text-xs text-zinc-400 hover:text-white">
            Voir le sondage
          </Link>
        </div>
      </div>
    </div>
  );
}
