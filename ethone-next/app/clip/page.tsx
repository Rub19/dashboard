"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Globe, ListChecks, NotebookPen, Quote } from "@/components/icons/ph";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { cardEnter, stepEnter } from "@/lib/motion-variants";
import { parseClip, type Clip } from "@/lib/clip";
import { cn } from "@/lib/utils";

type Target = "note" | "task";

const TARGETS: { id: Target; label: string; icon: typeof NotebookPen }[] = [
  { id: "note", label: "Note", icon: NotebookPen },
  { id: "task", label: "Tâche", icon: ListChecks },
];

const fieldCls =
  "w-full rounded-[var(--inset-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] hover:border-[var(--input-border-hover)] focus:border-[var(--accent-primary)]/60";

export default function ClipPage() {
  const { reduced } = useMotionPref();
  const { create: createNote } = useItems("notes");
  const { create: createTask } = useCloudTasks();
  const [clip, setClip] = useState<Clip | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<Target>("note");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    let hash = window.location.hash;
    try {
      hash ||= sessionStorage.getItem("ethone:clip") || "";
      sessionStorage.removeItem("ethone:clip");
    } catch { /* stockage indisponible */ }
    // Le contenu ne doit pas rester dans l'historique ni être re-enregistré au rechargement.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    const parsed = parseClip(hash);
    setClip(parsed);
    // Note rapide sans titre : la première ligne sert de titre.
    setTitle(parsed?.title || parsed?.selection.split("\n")[0].slice(0, 120) || parsed?.url || "");
    if (parsed?.kind) setTarget(parsed.kind);
  }, []);

  const host = clip?.url ? new URL(clip.url).hostname.replace(/^www\./, "") : "";

  async function save() {
    if (!clip || state === "saving") return;
    setState("saving");
    const name = title.trim() || host || "Clip";
    // Extrait de page : cité. Note rapide (sans URL) : texte tel quel.
    const quote = clip.url ? `> ${clip.selection.replace(/\n/g, "\n> ")}` : clip.selection;
    const body = [clip.selection && quote, clip.url && `Source : ${clip.url}`]
      .filter(Boolean)
      .join("\n\n");
    try {
      if (target === "note") await createNote({ title: name.slice(0, 200), body, done: false });
      else
        await createTask({
          title: name.slice(0, 100),
          body,
          done: false,
          data: { category: "Général", priority: "medium" },
        });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  if (clip === undefined) return null;

  return (
    <div className="flex h-full min-h-0 w-full items-start justify-center overflow-y-auto os-scroll px-4 py-10 sm:items-center">
      <motion.div
        variants={cardEnter}
        initial={reduced ? false : "initial"}
        animate="animate"
        className="w-full max-w-lg rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-6 shadow-[var(--panel-shadow)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!clip ? (
            <motion.div key="empty" variants={stepEnter} initial="initial" animate="animate" exit="exit" className="space-y-3 text-center">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Rien à enregistrer</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Cette page reçoit ce que l&apos;extension ETHONE capture. Ouvre l&apos;extension sur une page web pour l&apos;envoyer ici.
              </p>
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary)] hover:underline">
                Retour à l&apos;accueil <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ) : state === "saved" ? (
            <motion.div key="saved" variants={stepEnter} initial="initial" animate="animate" exit="exit" className="space-y-4 py-4 text-center">
              <motion.span
                initial={reduced ? false : { scale: 0.4, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 41 }}
                className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--success)]/15 text-[var(--success)]"
              >
                <Check className="h-7 w-7" />
              </motion.span>
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">{target === "note" ? "Note enregistrée" : "Tâche ajoutée"}</h1>
                <p className="truncate text-sm text-[var(--text-muted)]">{title}</p>
              </div>
              <div className="flex justify-center gap-2 stagger-children">
                <Link
                  href={target === "note" ? "/notes" : "/tasks"}
                  className="btn-sheen relative inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
                >
                  {target === "note" ? "Voir mes notes" : "Voir mes tâches"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => window.close()}
                  className="inline-flex h-9 items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-4 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Fermer l&apos;onglet
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" variants={stepEnter} initial="initial" animate="animate" exit="exit" className="space-y-5">
              <header className="flex items-center gap-3 stagger-children">
                <span className="icon-pop grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                  <Globe className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-[var(--text-primary)]">{clip.url ? "Enregistrer dans ETHONE" : "Note rapide"}</h1>
                  {host && <p className="truncate text-xs text-[var(--text-muted)]">{host}</p>}
                </div>
              </header>

              <div className="space-y-4 stagger-children">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Titre</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={fieldCls} />
                </label>

                {clip.selection && (
                  <figure className="relative rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 pl-9">
                    <Quote className="absolute left-3 top-3 h-4 w-4 text-[var(--accent-primary)]" />
                    <blockquote className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--text-primary)]/90 os-scroll">
                      {clip.selection}
                    </blockquote>
                  </figure>
                )}

                <div role="radiogroup" aria-label="Enregistrer comme" className="grid grid-cols-2 gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-1">
                  {TARGETS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={target === id}
                      onClick={() => setTarget(id)}
                      className={cn(
                        "relative isolate flex h-9 items-center justify-center gap-2 rounded-[calc(var(--inset-radius)-4px)] text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                        target === id ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {target === id && (
                        <motion.span
                          layoutId="clip-target"
                          transition={{ type: "spring", stiffness: 450, damping: 43 }}
                          className="absolute inset-0 -z-10 rounded-[inherit] bg-[var(--accent-primary)] shadow-sm"
                        />
                      )}
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {state === "error" && (
                  <p role="alert" className="text-sm text-[var(--danger)]">
                    L&apos;enregistrement a échoué. Vérifie ta connexion puis réessaie.
                  </p>
                )}

                <button
                  type="button"
                  onClick={save}
                  disabled={state === "saving"}
                  className="btn-sheen relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] text-sm font-semibold text-[var(--accent-contrast)] outline-none transition-[filter,transform] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.98] disabled:opacity-60"
                >
                  {state === "saving" ? "Enregistrement…" : target === "note" ? "Enregistrer la note" : "Ajouter la tâche"}
                  {state !== "saving" && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
