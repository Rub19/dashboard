"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Input from "@/components/Input";
import { useSettings } from "@/components/SettingsProvider";
import { X } from "lucide-react";
import { useSettingsForm } from "./SettingsFormContext";
import { useToast } from "@/components/ToastProvider";
import { DEFAULTS } from "@/lib/settings";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import SettingsNavigation, { CATEGORY_ORDER, sectionCategory } from "./SettingsNavigation";
import SettingsContent from "./SettingsContent";

function resolveCategory(value: string | null | undefined): string {
  if (!value) return CATEGORY_ORDER[0].id;
  return CATEGORY_ORDER.some((c) => c.id === value) ? value : sectionCategory(value);
}

export default function SettingsLayout() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { error: showError, notify } = useToast();
  const form = useSettingsForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState(() => resolveCategory(searchParams?.get("category") ?? searchParams?.get("tab")));

  const scrollToCategory = useCallback((id: string) => {
    const el =
      (contentRef.current?.querySelector(`[data-section="${id}"]`) as HTMLElement | null) ||
      (contentRef.current?.querySelector(`[data-category="${id}"]`) as HTMLElement | null);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const raw = searchParams?.get("category") ?? searchParams?.get("tab");
    const category = resolveCategory(raw);
    setActiveCategory(category);
    const t = window.setTimeout(() => {
      scrollToCategory(raw || category);
    }, 120);
    return () => window.clearTimeout(t);
  }, [searchParams, scrollToCategory]);

  const handleSelectCategory = useCallback(
    (id: string) => {
      router.push(`/settings?category=${id}`, { scroll: false });
    },
    [router]
  );

  const handleCategoryInView = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  const handleReset = () => {
    if (!window.confirm(i18n("resetSettingsConfirm") || "Rétablir tous les paramètres par défaut ?")) return;
    try {
      update({ ...DEFAULTS });
      notify.reset();
    } catch (err) {
      showError(String(err));
    }
  };

  const handleSave = () => {
    try {
      form.saveExplicit();
      notify.sync();
    } catch (err) {
      showError(String(err));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full select-none flex-col overflow-hidden p-4 sm:p-6">
      {/* Header */}
      <div className="shrink-0 mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name="settings" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              {i18n("settingsTitle") || "Paramètres"}
            </h1>
            <p className="text-[11px] text-[var(--muted)]">
              {i18n("settingsGeneralDesc", "Personnalisez l'apparence et le comportement global d'ETHONE OS.")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="text"
            value={form.query}
            onChange={(e) => form.setQuery(e.target.value)}
            placeholder={i18n("journalSearchPlaceholder") || "Rechercher..."}
            aria-label={i18n("journalSearchPlaceholder") || "Rechercher"}
            icon="search"
            inputSize="compact"
            className="w-full sm:w-56"
          />

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
              form.hasExplicitChanges
                ? "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]"
                : "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                form.hasExplicitChanges ? "bg-[var(--warning)]" : "bg-[var(--accent-primary)]"
              )}
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
            >
              {i18n("save") || "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile category strip */}
      <div className="mb-4 block md:hidden">
        <SettingsNavigation
          active={activeCategory}
          onSelect={handleSelectCategory}
          direction="horizontal"
        />
      </div>

      {/* Split view */}
      <div className="flex min-h-0 w-full flex-1 gap-6 overflow-hidden">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-0">
            <SettingsNavigation
              active={activeCategory}
              onSelect={handleSelectCategory}
              direction="vertical"
            />
          </div>
        </aside>

        <main
          ref={contentRef}
          className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1 pt-4"
        >
          <SettingsContent
            contentRef={contentRef}
            onCategoryChange={handleCategoryInView}
          />
        </main>
      </div>

      {settings.dockFloatingSave && form.hasExplicitChanges && (
        <div className="fixed inset-x-0 bottom-20 z-50 mx-auto w-max max-w-[min(90%,32rem)] animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2.5 text-xs font-medium text-[var(--warning)] shadow-lg backdrop-blur-[var(--panel-blur)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
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
              >
                {i18n("save") || "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
