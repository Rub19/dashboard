"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, RefreshCw, Search, Trash2, Upload, X } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import PageHeader from "@/components/discord/PageHeader";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { confirmDialog } from "@/lib/confirmDialog";
import { EASE_SNAP, SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const MAX_BYTES = 256 * 1024;

type ServerEmoji = { id: string; name: string; animated: boolean; url: string; managed?: boolean };
type Quota = { usedStatic: number; usedAnimated: number; maxStatic: number; maxAnimated: number; boostTier: number };
type Draft = { key: string; name: string; dataUrl: string; animated: boolean; bytes: number; status: "ready" | "uploading" | "error"; error?: string };

/** Nom d'émoji valide d'après le nom de fichier : lettres, chiffres et « _ », 2 à 32 caractères. */
function nameFromFile(file: string) {
  const base = file.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return (base.length >= 2 ? base : `emoji_${base}`).slice(0, 32);
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** Image fixe trop lourde : réduite à 128 × 128 (taille d'affichage maximale d'un émoji) en PNG. */
async function shrinkStatic(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = 128;
  const scale = Math.min(1, side / Math.max(bmp.width, bmp.height));
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion"))), "image/png"));
}

export default function EmojiStudioClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: toastError } = useToast();

  const [emojis, setEmojis] = useState<ServerEmoji[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<"all" | "static" | "animated">("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = `${BOT_API_URL}/api/guilds/${guildId}/server/emojis`;

  const load = useCallback(async () => {
    if (!BOT_API_URL || !guildId) return;
    try {
      const res = await fetch(base, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setEmojis(Array.isArray(data?.emojis) ? data.emojis : []);
      setQuota(data?.quota ?? null);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [base, guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const next: Draft[] = [];
      for (const file of Array.from(files).slice(0, 20)) {
        if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
          toastError(`${file.name} : formats acceptés PNG, JPG, GIF ou WebP.`);
          continue;
        }
        const animated = file.type === "image/gif";
        let blob: Blob = file;
        if (file.size > MAX_BYTES) {
          if (animated) {
            toastError(`${file.name} : GIF trop lourd (${Math.round(file.size / 1024)} Ko, 256 Ko maximum). Réduisez-le avant de l'importer pour garder l'animation.`);
            continue;
          }
          blob = await shrinkStatic(file).catch(() => file);
        }
        next.push({ key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, name: nameFromFile(file.name), dataUrl: await readAsDataUrl(blob), animated, bytes: blob.size, status: "ready" });
      }
      if (next.length) setDrafts((d) => [...d, ...next]);
    },
    [toastError],
  );

  const uploadOne = async (d: Draft): Promise<boolean> => {
    setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, status: "uploading", error: undefined } : x)));
    try {
      const res = await fetch(base, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: d.name, imageBase64OrUrl: d.dataUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.emoji) throw new Error(data?.error || "Impossible d'ajouter cet émoji.");
      setEmojis((list) => [data.emoji as ServerEmoji, ...list]);
      setQuota((q) => (q ? { ...q, usedStatic: q.usedStatic + (d.animated ? 0 : 1), usedAnimated: q.usedAnimated + (d.animated ? 1 : 0) } : q));
      setDrafts((list) => list.filter((x) => x.key !== d.key));
      return true;
    } catch (e) {
      setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, status: "error", error: e instanceof Error ? e.message : "Erreur" } : x)));
      return false;
    }
  };

  const uploadAll = async () => {
    let ok = 0;
    for (const d of drafts.filter((x) => x.status !== "uploading")) {
      if (!/^[A-Za-z0-9_]{2,32}$/.test(d.name)) {
        setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, status: "error", error: "Nom : 2 à 32 caractères, lettres, chiffres ou « _ »." } : x)));
        continue;
      }
      if (await uploadOne(d)) ok++;
    }
    if (ok) success(`${ok} émoji${ok > 1 ? "s" : ""} ajouté${ok > 1 ? "s" : ""} au serveur.`);
  };

  const remove = async (e: ServerEmoji) => {
    if (!(await confirmDialog(`Supprimer l'émoji :${e.name}: du serveur ?`))) return;
    const before = emojis;
    setEmojis((list) => list.filter((x) => x.id !== e.id));
    try {
      const res = await fetch(`${base}/${e.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setQuota((q) => (q ? { ...q, usedStatic: q.usedStatic - (e.animated ? 0 : 1), usedAnimated: q.usedAnimated - (e.animated ? 1 : 0) } : q));
      success(`:${e.name}: supprimé.`);
    } catch {
      setEmojis(before);
      toastError("Suppression impossible : vérifiez la permission « Gérer les expressions » du bot.");
    }
  };

  const copyCode = async (e: ServerEmoji) => {
    await navigator.clipboard.writeText(`<${e.animated ? "a" : ""}:${e.name}:${e.id}>`).catch(() => undefined);
    setCopied(e.id);
    setTimeout(() => setCopied((c) => (c === e.id ? null : c)), 1400);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emojis.filter((e) => (filter === "all" || (filter === "animated") === e.animated) && (!q || e.name.toLowerCase().includes(q)));
  }, [emojis, filter, query]);

  if (!BOT_API_URL || !guildId || state === "loading") {
    return <ModuleSkeleton label="Chargement des émojis…" />;
  }

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] px-4 pb-44 pt-6 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="stagger-children mx-auto max-w-5xl space-y-6">
        <PageHeader
          guildId={guildId}
          icon="mod-emojis"
          tint="amber"
          title="Émojis du serveur"
          subtitle="Déposez vos images ou GIF animés : le bot les ajoute directement sur votre serveur."
          actions={
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Actualiser"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] active:scale-[0.94]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          }
        />

        {state === "offline" ? (
          <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-[var(--text-muted)]">
            Le bot n&apos;a pas répondu pour ce serveur. Vérifiez qu&apos;il est présent, puis actualisez.
          </div>
        ) : (
          <>
            {quota && (
              <div className="grid gap-3 sm:grid-cols-2">
                <QuotaBar label="Émojis fixes" used={quota.usedStatic} max={quota.maxStatic} />
                <QuotaBar label="Émojis animés" used={quota.usedAnimated} max={quota.maxAnimated} hint={`Niveau de boost ${quota.boostTier}`} />
              </div>
            )}

            {/* Zone de dépôt */}
            <motion.div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void addFiles(e.dataTransfer.files);
              }}
              animate={{ scale: dragging ? 1.015 : 1 }}
              transition={SPRING_LAYOUT}
              className={cn(
                "relative overflow-hidden rounded-[var(--panel-radius)] border-2 border-dashed p-8 text-center transition-colors duration-200",
                dragging ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/8" : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30",
              )}
            >
              <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => e.target.files && void addFiles(e.target.files)} />
              <motion.div animate={{ y: dragging ? -4 : 0 }} transition={SPRING_LAYOUT} className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                <Upload className="h-6 w-6" />
              </motion.div>
              <p className="text-sm font-semibold">{dragging ? "Lâchez pour ajouter" : "Glissez vos images ici"}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">PNG, JPG, WebP ou GIF animé · 256 Ko maximum · jusqu&apos;à 20 à la fois</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                <Upload className="h-4 w-4" /> Choisir des fichiers
              </button>
            </motion.div>

            {/* Brouillons à envoyer */}
            <AnimatePresence initial={false}>
              {drafts.length > 0 && (
                <motion.section
                  key="drafts"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_SNAP }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold">À ajouter ({drafts.length})</h2>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDrafts([])} className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-[color,transform] duration-150 hover:text-[var(--text-primary)] active:scale-[0.97]">
                          Tout retirer
                        </button>
                        <button
                          type="button"
                          onClick={() => void uploadAll()}
                          disabled={drafts.some((d) => d.status === "uploading")}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform,opacity] duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" /> Ajouter au serveur
                        </button>
                      </div>
                    </div>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {drafts.map((d) => (
                        <motion.div
                          key={d.key}
                          layout
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 24, scale: 0.96 }}
                          transition={SPRING_LAYOUT}
                          className={cn("grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_auto]", d.status === "error" ? "border-[var(--danger)]/40" : "border-[var(--panel-border)]")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.dataUrl} alt="" className="h-14 w-14 rounded-lg object-contain" />
                          <div className="min-w-0 space-y-1.5">
                            <label className="flex h-9 items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--input-bg)] px-2.5 text-sm">
                              <span className="text-[var(--text-muted)]">:</span>
                              <input
                                value={d.name}
                                maxLength={32}
                                onChange={(e) => setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, name: e.target.value.replace(/[^A-Za-z0-9_]/g, "_"), status: "ready", error: undefined } : x)))}
                                className="w-full bg-transparent outline-none"
                                aria-label="Nom de l'émoji"
                              />
                              <span className="text-[var(--text-muted)]">:</span>
                            </label>
                            {/* Aperçu tel que dans un message Discord */}
                            <p className="flex items-center gap-1.5 truncate rounded-lg bg-[#313338] px-2.5 py-1.5 text-[13px] text-[#dbdee1]">
                              Trop bien
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={d.dataUrl} alt="" className="h-[22px] w-[22px] object-contain" />
                              <span className="text-[#949ba4]">
                                {d.animated ? "animé" : "fixe"} · {Math.round(d.bytes / 1024)} Ko
                              </span>
                            </p>
                            {d.error && <p className="text-xs text-[var(--danger)]">{d.error}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 sm:flex-col sm:justify-center">
                            {d.status === "uploading" ? (
                              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                                aria-label="Retirer"
                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] active:scale-90"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Émojis du serveur */}
            <section className="space-y-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 rounded-xl border border-[var(--panel-border)] p-1" role="tablist" aria-label="Filtrer les émojis">
                  {(
                    [
                      ["all", "Tous", emojis.length],
                      ["static", "Fixes", emojis.filter((e) => !e.animated).length],
                      ["animated", "Animés", emojis.filter((e) => e.animated).length],
                    ] as const
                  ).map(([id, label, n]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={filter === id}
                      onClick={() => setFilter(id)}
                      className={cn("relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", filter === id ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                    >
                      {filter === id && <motion.span layoutId="emoji-filter-pill" transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--accent-primary)]" />}
                      <span className="relative">
                        {label} <span className="tabular-nums opacity-70">{n}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <label className="flex h-9 min-w-[200px] items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3">
                  <Search className="h-4 w-4 text-[var(--text-muted)]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" />
                </label>
              </div>

              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">{emojis.length ? "Aucun émoji ne correspond." : "Ce serveur n'a pas encore d'émoji personnalisé."}</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visible.map((e, i) => (
                      <motion.div
                        key={e.id}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1, transition: { ...SPRING_LAYOUT, delay: Math.min(i, 20) * 0.015 } }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={SPRING_LAYOUT}
                        className="group relative flex flex-col items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.url} alt={e.name} loading="lazy" className="h-12 w-12 object-contain transition-transform duration-200 group-hover:scale-110" />
                        <p className="w-full truncate text-center text-xs text-[var(--text-primary)]/85" title={`:${e.name}:`}>
                          :{e.name}:
                        </p>
                        {e.animated && <span className="absolute left-2 top-2 rounded bg-[var(--accent-primary)]/15 px-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">GIF</span>}
                        <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void copyCode(e)}
                            aria-label={`Copier le code de :${e.name}:`}
                            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] active:scale-90"
                          >
                            {copied === e.id ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          {!e.managed && (
                            <button
                              type="button"
                              onClick={() => void remove(e)}
                              aria-label={`Supprimer :${e.name}:`}
                              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--danger)]/12 hover:text-[var(--danger)] active:scale-90"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function QuotaBar({ label, used, max, hint }: { label: string; used: number; max: number; hint?: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-semibold tabular-nums">
          {used} <span className="text-[var(--text-muted)]">/ {max}</span>
        </p>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--text-primary)]/8">
        <motion.div
          className={cn("h-full rounded-full", pct >= 90 ? "bg-[var(--danger)]" : "bg-[var(--accent-primary)]")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE_SNAP }}
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
