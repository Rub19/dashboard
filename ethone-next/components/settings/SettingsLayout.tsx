"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettingsForm } from "./SettingsFormContext";
import SettingsContent from "./SettingsContent";
import SettingsSidebar from "./SettingsSidebar";
import SettingsBottomBar from "./SettingsBottomBar";
import DangerZone from "./DangerZone";

const MAIN_SECTIONS = [
  { id: "appearance", labelKey: "appearance", icon: "palette" },
  { id: "typography", labelKey: "typography", icon: "type" },
  { id: "language", labelKey: "language", icon: "globe" },
  { id: "density", labelKey: "density", icon: "gauge" },
  { id: "sound", labelKey: "sound", icon: "volume" },
  { id: "account", labelKey: "account", icon: "user" },
  { id: "security", labelKey: "security", icon: "shield" },
  { id: "notifications", labelKey: "notifications", icon: "bell" },
  { id: "workspace", labelKey: "workspace", icon: "layout-grid" },
  { id: "advanced", labelKey: "advanced", icon: "sliders-horizontal" },
];

export default function Settings() {
  const i18n = useI18n();
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
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          setActiveSection(entry.target.getAttribute("data-section") || "appearance");
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root,
      threshold: 0.5,
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

  const sidebarSections = MAIN_SECTIONS.map((s) =>
    s.id === "advanced"
      ? { ...s, badge: showAdvanced ? 1 : undefined }
      : s
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4 pb-28 sm:p-5 lg:p-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">{i18n("settingsTitle")}</h1>
          <p className="text-xs text-zinc-400 mt-1">{i18n("settingsDescription")}</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("journalSearchPlaceholder")}
            aria-label={i18n("journalSearchPlaceholder")}
            className="h-9 w-full sm:w-64 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-[var(--accent)]/50"
          />
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
          <SettingsSidebar
            sections={sidebarSections}
            activeId={activeSection}
            onChange={handleSectionChange}
          />
        </aside>

        <main ref={contentRef} className="min-h-0 space-y-4">
          <SettingsContent />
          <DangerZone />
        </main>
      </div>

      <SettingsBottomBar />
    </div>
  );
}
