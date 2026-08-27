"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { RotateCcw, Save, X, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Input from "@/components/Input";
import { useSettings } from "@/components/SettingsProvider";
import { useSettingsForm } from "./SettingsFormContext";
import { useToast } from "@/components/ToastProvider";
import { DEFAULTS, type Settings } from "@/lib/settings";
import { CATEGORY_KEYS } from "@/lib/settings-category-keys";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SettingsNavigation, { CATEGORY_ORDER, sectionCategory } from "./SettingsNavigation";
import SettingsContent from "./SettingsContent";

function resolveCategory(value: string | null | undefined): string {
  if (!value) return CATEGORY_ORDER[0].id;
  return CATEGORY_ORDER.some((c) => c.id === value) ? value : sectionCategory(value);
}

export default function SettingsLayout({ initialSection }: { initialSection?: string }) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { error: showError, notify } = useToast();
  const form = useSettingsForm();
  const params = useParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sectionParam = typeof params?.section === "string" ? params.section : undefined;
  const [activeCategory, setActiveCategory] = useState(() =>
    resolveCategory(initialSection ?? sectionParam)
  );
  const isScrollingRef = useRef(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ type: "section" | "field"; id: string; label: string | null; sectionId?: string }[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const scrollToCategory = useCallback((id: string) => {
    const el =
      (contentRef.current?.querySelector(`[data-section="${id}"]`) as HTMLElement | null) ||
      (contentRef.current?.querySelector(`[data-category="${id}"]`) as HTMLElement | null);
    if (!el) return;
    isScrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  }, []);

  const scrollToSearchResult = useCallback((result: { type: "section" | "field"; id: string; sectionId?: string }) => {
    let el: HTMLElement | null = null;
    if (result.type === "section") {
      el = contentRef.current?.querySelector(`[data-section="${CSS.escape(result.id)}"]`) as HTMLElement | null;
    } else {
      el = contentRef.current?.querySelector(`[data-setting-key="${CSS.escape(result.id)}"]`) as HTMLElement | null;
    }
    if (!el && result.sectionId) {
      el = contentRef.current?.querySelector(`[data-section="${CSS.escape(result.sectionId)}"]`) as HTMLElement | null;
    }
    if (!el) return;
    isScrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setShowSearchDropdown(false);
    window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  }, []);

  useEffect(() => {
    const raw = initialSection ?? sectionParam;
    const category = resolveCategory(raw);
    setActiveCategory(category);
    const t = window.setTimeout(() => {
      scrollToCategory(raw || category);
    }, 120);
    return () => window.clearTimeout(t);
  }, [initialSection, sectionParam, scrollToCategory]);

  const handleSelectCategory = useCallback(
    (id: string) => {
      if (id === activeCategory) return;
      setActiveCategory(id);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/settings/${id}`);
      }
      scrollToCategory(id);
    },
    [activeCategory, scrollToCategory]
  );

  const handleCategoryInView = useCallback(
    (id: string) => {
      if (isScrollingRef.current) return;
      setActiveCategory(id);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/settings/${id}`);
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setIsResetModalOpen(true);
  }, []);

  const handleResetSection = useCallback(() => {
    setIsResetModalOpen(false);
    try {
      const keys = CATEGORY_KEYS[activeCategory];
      if (!keys || keys.length === 0) {
        notify.reset();
        return;
      }
      const next: Partial<Settings> = {};
      for (const key of keys) {
        (next as Record<string, unknown>)[key] = DEFAULTS[key];
      }
      update(next);
      notify.reset();
    } catch (err) {
      showError(String(err));
    }
  }, [activeCategory, notify, showError, update]);

  const handleResetAll = useCallback(() => {
    setIsResetModalOpen(false);
    try {
      update({ ...DEFAULTS });
      notify.reset();
    } catch (err) {
      showError(String(err));
    }
  }, [notify, showError, update]);

  const handleSave = useCallback(() => {
    try {
      form.saveExplicit();
      notify.sync();
    } catch (err) {
      showError(String(err));
    }
  }, [form, notify, showError]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }

      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      if (e.key === "Escape" && form.query.trim()) {
        e.preventDefault();
        form.setQuery("");
      }

      const isUndo = !e.shiftKey && e.key.toLowerCase() === "z";
      const isRedo =
        (isMac && e.shiftKey && e.key.toLowerCase() === "z") ||
        (!isMac && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z")));

      if (ctrl && isUndo) {
        e.preventDefault();
        form.undo();
      }

      if (ctrl && isRedo) {
        e.preventDefault();
        form.redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [form, handleSave]);

  useEffect(() => {
    if (!form.query.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const t = window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;
      const sections = Array.from(root.querySelectorAll('[data-section]:not([hidden])')).map((el) => ({
        type: "section" as const,
        id: (el as HTMLElement).getAttribute("data-section") || "",
        label: (el as HTMLElement).getAttribute("data-section-label") || (el as HTMLElement).querySelector("h2")?.textContent || "",
      })).filter((r) => r.id);
      const fields = Array.from(root.querySelectorAll('[data-setting-label]:not(.hidden)')).map((el) => ({
        type: "field" as const,
        id: (el as HTMLElement).getAttribute("data-setting-key") || "",
        label: (el as HTMLElement).getAttribute("data-setting-label") || "",
        sectionId: (el as HTMLElement).closest('[data-section]')?.getAttribute("data-section") || "",
      })).filter((r) => r.id && r.label);
      setSearchResults([...sections, ...fields].slice(0, 8));
      setShowSearchDropdown(true);
    }, 120);
    return () => window.clearTimeout(t);
  }, [form.query, contentRef]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="mb-4 shrink-0">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Icon name="settings" className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {i18n("settingsTitle") || "Paramètres"}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">
                {i18n("settingsGeneralDesc", "Personnalisez l'apparence et le comportement global d'ETHONE OS.")}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="relative w-full min-w-0 sm:w-80"
            >
              <Input
                ref={searchRef}
                type="text"
                value={form.query}
                onChange={(e) => form.setQuery(e.target.value)}
                placeholder={i18n("settingsSearchPlaceholder", "Rechercher dans les réglages...")}
                aria-label={i18n("settingsSearchPlaceholder", "Rechercher dans les réglages")}
                icon="search"
                inputSize="compact"
                className="w-full min-w-0"
              />
              {showSearchDropdown && searchResults.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full z-[var(--z-dropdown)] mt-1.5 max-h-64 overflow-y-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1.5 shadow-lg backdrop-blur-[var(--panel-blur)]"
                  role="listbox"
                  aria-label={i18n("searchResults", "Résultats de recherche")}
                >
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => scrollToSearchResult(result)}
                      className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                      role="option"
                      aria-selected={false}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", result.type === "section" ? "bg-[var(--accent-primary)]" : "bg-[var(--text-muted)]")} />
                      <span className="min-w-0 flex-1 truncate">{result.label}</span>
                      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{result.type === "section" ? i18n("section") || "Section" : i18n("setting") || "Paramètre"}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div
              className={cn(
                "flex min-h-[44px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
                form.hasExplicitChanges
                  ? "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]"
                  : "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  form.hasExplicitChanges ? "bg-[var(--warning)]" : "bg-[var(--accent-primary)]"
                )}
                aria-hidden="true"
              />
              {form.hasExplicitChanges
                ? i18n("unsavedChanges") || "Modifications non enregistrées"
                : i18n("synced") || "Synchronisé"}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={handleReset}
              >
                {i18n("reset") || "Rétablir"}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={handleSave}
                disabled={!form.hasExplicitChanges || form.isSaving}
                isLoading={form.isSaving}
              >
                {i18n("save") || "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile category strip */}
      <div className="mb-4 block md:hidden">
        <SettingsNavigation
          active={activeCategory}
          onSelect={handleSelectCategory}
          direction="horizontal"
        />
      </div>

      {/* Split view */}
      <div className="flex min-h-0 w-full flex-1 gap-4 overflow-hidden sm:gap-6">
        <aside className="hidden h-full w-64 shrink-0 overflow-y-auto pr-1 no-scrollbar md:block">
          <div className="sticky top-0 h-full max-h-full">
            <SettingsNavigation
              active={activeCategory}
              onSelect={handleSelectCategory}
              direction="vertical"
            />
          </div>
        </aside>

        <main
          ref={contentRef}
          className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pb-8 pr-1 pt-4"
        >
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]"
          >
            <ol className="flex items-center gap-1.5">
              <li>
                <span>{i18n("settingsTitle") || "Paramètres"}</span>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </li>
              <li>
                <span
                  className="font-medium text-[var(--text-primary)]"
                  aria-current="page"
                >
                  {CATEGORY_ORDER.find((c) => c.id === activeCategory)?.label ?? activeCategory}
                </span>
              </li>
            </ol>
          </nav>

          <SettingsContent
            contentRef={contentRef}
            onCategoryChange={handleCategoryInView}
          />
        </main>
      </div>

      {settings.dockFloatingSave && form.hasExplicitChanges && (
        <div
          className="fixed bottom-[max(5rem,env(safe-area-inset-bottom)+4.5rem)] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-[var(--z-modal)] mx-auto w-max max-w-[min(90%,32rem)] animate-in slide-in-from-bottom-4 sm:left-1/2 sm:-translate-x-1/2"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mx-4 flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2.5 text-xs font-medium text-[var(--warning)] shadow-lg backdrop-blur-[var(--panel-blur)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-hidden="true" />
            <span className="whitespace-nowrap">{i18n("unsavedChanges") || "Modifications non enregistrées"}</span>
            <div className="ml-auto flex items-center gap-2 pl-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-3.5 w-3.5" />}
                onClick={form.cancelExplicit}
              >
                {i18n("cancel") || "Annuler"}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={() => {
                  try {
                    form.saveExplicit();
                    notify.sync();
                  } catch (err) {
                    showError(String(err));
                  }
                }}
                disabled={!form.hasExplicitChanges || form.isSaving}
                isLoading={form.isSaving}
              >
                {i18n("save") || "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={i18n("resetModalTitle", "Réinitialiser les réglages")}
        description={i18n("resetModalDescription", "Choisissez la portée de la réinitialisation.")}
        size="sm"
        variant="danger"
        hideFooter
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsResetModalOpen(false)}
            >
              {i18n("cancel") || "Annuler"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleResetSection}
            >
              {i18n("resetSection", "Réinitialiser cette section")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleResetAll}
            >
              {i18n("resetAll", "Réinitialiser tous les réglages")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
