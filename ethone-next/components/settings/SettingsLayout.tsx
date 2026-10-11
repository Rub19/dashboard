"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Redo2, RotateCcw, Save, Search, Undo2, X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useSettingsForm } from "./SettingsFormContext";
import { useToast } from "@/components/ToastProvider";
import { DEFAULTS, type Settings } from "@/lib/settings";
import { CATEGORY_KEYS } from "@/lib/settings-category-keys";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useSyncStore } from "@/lib/stores/sync";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import MobileTabs from "@/components/ui/MobileTabs";
import { CATEGORY_ORDER } from "./SettingsNavigation";
import SettingsContent from "./SettingsContent";
import SettingsRail, { SETTINGS_GROUPS, categoryById } from "./SettingsRail";
import SettingsPalette, { type PaletteResult } from "./SettingsPalette";
import { useSettingsNavigation, resolveCategory } from "./useSettingsNavigation";

const SYNC_LABEL: Record<string, { label: string; tone: string }> = {
  idle: { label: "Synchronisé", tone: "bg-[var(--success)]" },
  syncing: { label: "Synchronisation…", tone: "bg-[var(--info)] animate-pulse" },
  offline: { label: "Hors ligne", tone: "bg-[var(--warning)]" },
  error: { label: "Erreur de synchro", tone: "bg-[var(--danger)]" },
};

/** Fait clignoter un réglage trouvé par la recherche, une fois sa catégorie affichée. */
function flash(key: string) {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-setting-key="${CSS.escape(key)}"], [data-section="${CSS.escape(key)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("settings-flash");
    void el.offsetWidth;
    el.classList.add("settings-flash");
  }, 450);
}

/**
 * Réglages : navigation par groupes à gauche, une catégorie à la fois à droite avec son en-tête, transitions
 * orientées (on monte ou on descend dans la liste), recherche Ctrl K, barre d'enregistrement flottante.
 */
export default function SettingsLayout({ initialSection }: { initialSection?: string }) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { error: showError, notify } = useToast();
  const form = useSettingsForm();
  const params = useParams();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLElement | null>(null);
  const { reduced } = useMotionPref();
  const syncStatus = useSyncStore((s) => s.status);

  const sectionParam = typeof params?.section === "string" ? params.section : undefined;
  const categoryParam = searchParams?.get("category") || searchParams?.get("section") || undefined;
  const { activeCategory, navigateTo, registerContainerRef, registerCategoryRef } = useSettingsNavigation({
    initialSection: initialSection ?? sectionParam ?? categoryParam,
  });

  const [resetOpen, setResetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [results, setResults] = useState<PaletteResult[]>([]);
  const order = CATEGORY_ORDER.map((c) => c.id);
  const index = Math.max(0, order.indexOf(activeCategory));
  const [direction, setDirection] = useState(1);
  const lastIndex = useRef(index);
  useEffect(() => {
    setDirection(index >= lastIndex.current ? 1 : -1);
    lastIndex.current = index;
  }, [index]);

  const category = categoryById(activeCategory);
  const group = SETTINGS_GROUPS.find((g) => g.ids.includes(activeCategory));
  const prev = index > 0 ? categoryById(order[index - 1]) : null;
  const next = index < order.length - 1 ? categoryById(order[index + 1]) : null;
  const isSearching = Boolean(form.query.trim());

  const modified = useMemo(() => {
    const keys = CATEGORY_KEYS[activeCategory] ?? [];
    return keys.filter((k) => JSON.stringify(settings[k]) !== JSON.stringify(DEFAULTS[k])).length;
  }, [activeCategory, settings]);

  const go = useCallback((id: string) => navigateTo(id, "user"), [navigateTo]);
  // Raccourcis de l'accueil des réglages (SettingsOverview) : ouvrir une catégorie.
  useEffect(() => {
    const onNav = (e: Event) => go(String((e as CustomEvent).detail));
    window.addEventListener("settings:navigate", onNav);
    return () => window.removeEventListener("settings:navigate", onNav);
  }, [go]);

  const handleResetSection = useCallback(() => {
    setResetOpen(false);
    try {
      const keys = CATEGORY_KEYS[activeCategory] ?? [];
      const nextValues: Partial<Settings> = {};
      for (const key of keys) (nextValues as Record<string, unknown>)[key] = DEFAULTS[key];
      if (keys.length) update(nextValues);
      notify.reset();
    } catch (err) {
      showError(String(err));
    }
  }, [activeCategory, notify, showError, update]);

  const handleResetAll = useCallback(() => {
    setResetOpen(false);
    try {
      update({ ...DEFAULTS });
      notify.reset();
    } catch (err) {
      showError(String(err));
    }
  }, [notify, showError, update]);

  const handleSave = useCallback(async () => {
    try {
      const saved = await form.saveExplicit();
      const failed = saved.filter((r) => !r.ok);
      if (failed.length > 0) showError("Certaines modifications de compte n'ont pas pu être enregistrées", failed.map((f) => f.field).join(", "));
      if (saved.some((r) => r.ok && r.message === "confirm")) notify.sync("Email de confirmation envoyé", "Vérifiez votre boîte de réception pour confirmer le changement.");
      else notify.sync();
    } catch (err) {
      showError(String(err));
    }
  }, [form, notify, showError]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    form.setQuery("");
  }, [form]);

  const pick = useCallback(
    (r: PaletteResult) => {
      setPaletteOpen(false);
      form.setQuery("");
      navigateTo(resolveCategory(r.sectionId || r.id), "search");
      flash(r.id);
    },
    [form, navigateTo]
  );

  // Raccourcis : Ctrl K recherche, Ctrl S enregistre, Ctrl Z / Ctrl Y annule et rétablit.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (ctrl && k === "s") {
        e.preventDefault();
        void handleSave();
      } else if (ctrl && !e.shiftKey && k === "z") {
        e.preventDefault();
        form.undo();
      } else if (ctrl && ((isMac && e.shiftKey && k === "z") || (!isMac && (k === "y" || (e.shiftKey && k === "z"))))) {
        e.preventDefault();
        form.redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [form, handleSave]);

  // Résultats de la recherche : lus dans la page, qui affiche toutes les catégories filtrées pendant la saisie.
  useEffect(() => {
    if (!isSearching) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;
      const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-section]")).map((el) => ({
        type: "section" as const,
        id: el.dataset.section || "",
        label: el.dataset.sectionLabel || el.querySelector("h2")?.textContent || "",
      }));
      const fields = Array.from(root.querySelectorAll<HTMLElement>("[data-setting-label]:not(.hidden)")).map((el) => ({
        type: "field" as const,
        id: el.dataset.settingKey || "",
        label: el.dataset.settingLabel || "",
        sectionId: el.closest<HTMLElement>("[data-section]")?.dataset.section || "",
      }));
      setResults([...fields, ...sections].filter((r) => r.id && r.label).slice(0, 12));
    }, 160);
    return () => window.clearTimeout(t);
  }, [form.query, isSearching]);

  const sync = SYNC_LABEL[syncStatus] ?? SYNC_LABEL.idle;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Navigation (PC) */}
      <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/25 px-3 pb-4 pt-5 md:flex">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-[0_6px_20px_-8px_var(--glow-color)]">
            <Icon name="settings" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">{i18n("settingsTitle") || "Réglages"}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span className={cn("h-1.5 w-1.5 rounded-full", sync.tone)} />
              {sync.label}
            </p>
          </div>
        </div>
        <SettingsRail active={activeCategory} onSelect={go} onOpenSearch={() => setPaletteOpen(true)} />
      </aside>

      {/* Contenu */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Téléphone : catégories en onglets */}
        <div className="flex items-center gap-2 px-3 pt-3 md:hidden">
          <h1 className="flex-1 text-lg font-bold text-[var(--text-primary)]">{i18n("settingsTitle") || "Réglages"}</h1>
          <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Rechercher un réglage" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)]">
            <Search className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 md:hidden">
          <MobileTabs layoutId="settings-cat-tab" tabs={CATEGORY_ORDER.map((c) => ({ id: c.id, label: c.label }))} value={activeCategory} onChange={go} />
        </div>

        <main
          ref={(el) => {
            contentRef.current = el;
            registerContainerRef(el);
          }}
          className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain os-scroll"
        >
          <div className="mx-auto w-full max-w-4xl px-3 pb-32 pt-4 sm:px-8 sm:pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSearching ? "search" : activeCategory}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 * direction }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 * direction, transition: { duration: 0.14 } }}
                transition={{ type: "spring", bounce: 0, duration: 0.42 }}
              >
                {!isSearching && (
                  <header className="relative mb-6 hidden overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-6 sm:block">
                    <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/20 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-40 w-72 rounded-full bg-[var(--accent-primary)]/[0.08] blur-3xl" />
                    <div className="relative flex items-start gap-5">
                      <motion.span
                        initial={reduced ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 }}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)]/60 text-[var(--accent-contrast)] shadow-[0_12px_32px_-10px_var(--glow-color)]"
                      >
                        <Icon name={category.icon} className="h-6 w-6" />
                      </motion.span>
                      <div className="min-w-0 flex-1">
                        {group && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">{group.label}</p>}
                        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--text-primary)]">{category.label}</h1>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{i18n(category.descriptionKey || "", category.description)}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--background)]/40 px-3 py-1 text-xs text-[var(--text-muted)]">
                            {modified ? (
                              <>
                                <span className="font-semibold text-[var(--accent-primary)]">{modified}</span> réglage{modified > 1 ? "s" : ""} personnalisé{modified > 1 ? "s" : ""}
                              </>
                            ) : (
                              "Réglages par défaut"
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setResetOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Réinitialiser
                          </button>
                          <span className="ml-auto flex items-center gap-1">
                            <button type="button" onClick={form.undo} disabled={!form.canUndo} title="Annuler (Ctrl Z)" aria-label="Annuler" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] disabled:opacity-30">
                              <Undo2 className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={form.redo} disabled={!form.canRedo} title="Rétablir (Ctrl Y)" aria-label="Rétablir" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] disabled:opacity-30">
                              <Redo2 className="h-4 w-4" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </header>
                )}

                <SettingsContent activeCategory={activeCategory} contentRef={contentRef} registerCategoryRef={registerCategoryRef} />

                {!isSearching && (
                  <nav aria-label="Catégories voisines" className="mt-8 grid grid-cols-2 gap-3">
                    {prev ? (
                      <button type="button" onClick={() => go(prev.id)} className="group flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] p-4 text-left transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/[0.04]">
                        <ArrowLeft className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:-translate-x-0.5 group-hover:text-[var(--accent-primary)]" />
                        <span className="min-w-0">
                          <span className="block text-[11px] text-[var(--text-muted)]">Précédent</span>
                          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{prev.label}</span>
                        </span>
                      </button>
                    ) : (
                      <span />
                    )}
                    {next && (
                      <button type="button" onClick={() => go(next.id)} className="group flex items-center justify-end gap-3 rounded-2xl border border-[var(--panel-border)] p-4 text-right transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/[0.04]">
                        <span className="min-w-0">
                          <span className="block text-[11px] text-[var(--text-muted)]">Suivant</span>
                          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{next.label}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-primary)]" />
                      </button>
                    )}
                  </nav>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modifications de compte à enregistrer */}
      <AnimatePresence>
        {form.hasExplicitChanges && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom)+5rem)] z-[var(--z-modal)] flex justify-center px-4 md:bottom-8"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface,var(--panel-bg))]/90 py-2 pl-4 pr-2 text-sm shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--warning)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--warning)]" />
              </span>
              <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">Modifications non enregistrées</span>
              <Button type="button" variant="ghost" size="sm" leftIcon={<X className="h-3.5 w-3.5" />} onClick={form.cancelExplicit}>
                Annuler
              </Button>
              <Button type="button" variant="primary" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSave} disabled={form.isSaving} isLoading={form.isSaving}>
                Enregistrer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsPalette open={paletteOpen} query={form.query} onQuery={form.setQuery} results={results} onClose={closePalette} onPick={pick} />

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Réinitialiser les réglages"
        description={`Remettre « ${category.label} » ou tous les réglages comme au premier jour.`}
        size="sm"
        variant="danger"
        hideFooter
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="md" onClick={() => setResetOpen(false)}>
            Annuler
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={handleResetSection}>
            Cette catégorie
          </Button>
          <Button type="button" variant="danger" size="md" onClick={handleResetAll}>
            Tout réinitialiser
          </Button>
        </div>
      </Modal>
    </div>
  );
}
