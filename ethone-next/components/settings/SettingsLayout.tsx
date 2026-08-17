"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  RotateCcw,
  Save,
  Shield,
  Palette,
  Bell,
  Volume2,
  Laptop,
  Lock,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { DEFAULTS } from "@/lib/settings";
import UserProfileCard from "./UserProfileCard";
import SettingsContent from "./SettingsContent";
import SettingsBottomBar from "./SettingsBottomBar";
import BillingSettings from "./BillingSettings";
import IntegrationsSettings from "@/components/IntegrationsSettings";

const TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "advanced", label: "Avancé" },
  { id: "billing", label: "Facturation" },
  { id: "integrations", label: "Intégrations" },
];

const TAB_OVERRIDES: Record<string, string> = {
  security: "advanced",
  account: "advanced",
  billing: "billing",
  integrations: "integrations",
};

function SettingCard({
  icon: Icon,
  title,
  description,
  value,
  action,
  accent = "emerald",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  value?: string;
  action?: string;
  accent?: "emerald" | "amber" | "sky" | "rose";
}) {
  const accentMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className="group flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-sm backdrop-blur-2xl transition-all hover:border-white/15">
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accentMap[accent]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
            <p className="truncate text-[10px] text-zinc-500">{description}</p>
          </div>
        </div>
        {value && <p className="truncate text-xs text-zinc-300">{value}</p>}
      </div>
      {action && (
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
        >
          <span>{action}</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function SettingsLayout() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return (tab && TAB_OVERRIDES[tab]) || "overview";
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;

    const targetTab = TAB_OVERRIDES[tab] || "overview";
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }

    const scrollTo = (selector: string) => {
      window.setTimeout(() => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 200);
    };

    if (tab === "profile") {
      scrollTo("#profile-card");
    } else if (tab === "security") {
      scrollTo('[data-section="security"]');
    } else if (tab === "account") {
      scrollTo('[data-section="account"]');
    }
  }, [searchParams, activeTab]);

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

  return (
    <div className="mx-auto flex w-full max-w-6xl select-none flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
            <Shield className="h-6 w-6 text-emerald-400" />
            <span>{i18n("settingsGeneral", "Général")}</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            {i18n("settingsGeneralDesc", "Personnalisez l'apparence et le comportement global d'ETHONE OS.")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("journalSearchPlaceholder") || "Rechercher..."}
              aria-label={i18n("journalSearchPlaceholder") || "Rechercher"}
              className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/40 sm:w-56"
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
      </div>

      {/* Onglets */}
      <div className="flex w-fit items-center gap-1 rounded-xl border border-white/[0.08] bg-zinc-950/70 p-1 backdrop-blur-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "border border-white/10 bg-white/[0.08] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <div id="profile-card" className="md:col-span-2 xl:col-span-1">
              <UserProfileCard />
            </div>
            <SettingCard
              icon={Palette}
              title={i18n("appearance") || "Apparence"}
              description="Thème, icônes, couleurs"
              value={`Thème : ${settings.theme || "default"} · Pack : ${settings.iconPack || "lucide"}`}
              action="Personnaliser"
              accent="emerald"
            />
            <SettingCard
              icon={Laptop}
              title={i18n("language") || "Langue"}
              description="Langue d'interface"
              value={(settings.language || "fr").toUpperCase()}
              action="Modifier"
              accent="sky"
            />
            <SettingCard
              icon={Bell}
              title={i18n("notifications") || "Notifications"}
              description="Alertes et push"
              value={settings.pushNotifications ? "Activées" : "Désactivées"}
              action="Gérer"
              accent="amber"
            />
            <SettingCard
              icon={Volume2}
              title={i18n("sound") || "Audio"}
              description="Pack sonore et volumes"
              value={`Pack : ${settings.soundPack || "ethone"}`}
              action="Configurer"
              accent="emerald"
            />
            <SettingCard
              icon={Lock}
              title={i18n("security") || "Sécurité"}
              description="Alertes et sessions"
              value={settings.securityAlerts ? "Alertes activées" : "Alertes désactivées"}
              action="Renforcer"
              accent="rose"
            />
            <SettingCard
              icon={SlidersHorizontal}
              title={i18n("workspace") || "Bureau"}
              description="Dock, layout, densité"
              value={`Layout : ${settings.layoutPreset || "default"}`}
              action="Ajuster"
              accent="sky"
            />
          </motion.div>
        ) : activeTab === "advanced" ? (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <SettingsContent />
          </motion.div>
        ) : activeTab === "integrations" ? (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <IntegrationsSettings />
          </motion.div>
        ) : (
          <motion.div
            key="billing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <BillingSettings />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsBottomBar />
    </div>
  );
}
