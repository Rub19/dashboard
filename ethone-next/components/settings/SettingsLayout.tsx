"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, RotateCcw, Save } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useSettingsForm } from "./SettingsFormContext";
import { DEFAULTS } from "@/lib/settings";
import SettingsContent from "./SettingsContent";
import SettingsSidebar from "./SettingsSidebar";
import SettingsBottomBar from "./SettingsBottomBar";
import DangerZone from "./DangerZone";

const MAIN_SECTIONS = [
  { id: "appearance", label: "Apparence", icon: "palette" },
  { id: "typography", label: "Typographie", icon: "type" },
  { id: "language", label: "Langue", icon: "globe" },
  { id: "density", label: "Densité", icon: "gauge" },
  { id: "sound", label: "Audio", icon: "volume" },
  { id: "account", label: "Profil", icon: "user" },
  { id: "security", label: "Sécurité", icon: "shield" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "workspace", label: "Dock & Bureau", icon: "layout-grid" },
  { id: "advanced", label: "Avancé", icon: "sliders-horizontal" },
];

export default function SettingsLayout() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const { query, setQuery, showAdvanced, setShowAdvanced } = useSettingsForm();
  const [activeSection, setActiveSection] = useState<string>("appearance");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = contentRef.current;
    if (!root) return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          setActiveSection(entry.target.getAttribute("data-section") || "appearance");
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root,
      threshold: 0.4,
      rootMargin: "-80px 0px -40% 0px",
    });

    const sections = root.querySelectorAll("[data-section]");
    sections.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [showAdvanced]);

  function handleSectionChange(id: string) {
    if (id === "advanced") {
      setShowAdvanced(!showAdvanced);
      const el = document.querySelector(`[data-section="advanced"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection("advanced");
      return;
    }
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }

  function handleReset() {
    if (!window.confirm(i18n("resetSettingsConfirm") || "Rétablir tous les paramètres par défaut ?")) return;
    try {
      update({ ...DEFAULTS });
      success(i18n("settingsReset") || "Paramètres rétablis");
    } catch (err) {
      showError(String(err));
    }
  }

  function handleSave() {
    try {
      update({ ...settings });
      success(i18n("settingsSaved") || "Modifications enregistrées");
    } catch (err) {
      showError(String(err));
    }
  }

  const sidebarSections = MAIN_SECTIONS.map((s) =>
    s.id === "advanced" ? { ...s, badge: showAdvanced ? 1 : undefined } : s
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col gap-6 p-4 pb-24 sm:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{i18n("settingsTitle")}</h1>
            <p className="mt-1 text-xs text-zinc-400">{i18n("settingsDescription")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={i18n("journalSearchPlaceholder")}
                aria-label={i18n("journalSearchPlaceholder")}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/40 sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300 transition-all hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {i18n("reset") || "Rétablir"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold text-zinc-950 shadow-lg transition-all hover:brightness-110 active:scale-95"
                style={{ background: "var(--accent-color, #10b981)" }}
              >
                <Save className="h-3.5 w-3.5" />
                {i18n("save") || "Enregistrer"}
              </button>
            </div>
          </div>
        </motion.header>

        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="top-6 h-fit w-full shrink-0 md:sticky md:w-64">
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-2 shadow-sm backdrop-blur-2xl">
              <SettingsSidebar
                sections={sidebarSections}
                activeId={activeSection}
                onChange={handleSectionChange}
              />
            </div>
          </aside>

          <main ref={contentRef} className="min-w-0 flex-1 space-y-6">
            <SettingsContent />
            <DangerZone />
          </main>
        </div>
      </div>

      <SettingsBottomBar />
    </div>
  );
}
