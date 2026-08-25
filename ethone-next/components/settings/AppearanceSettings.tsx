"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Moon, Sun, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { isNativeAndroid } from "@/lib/android";
import { Icon as IconifyIcon } from "@iconify/react";
import { useSettings } from "@/components/SettingsProvider";
import { useSettingsForm } from "./SettingsFormContext";
import { useToast } from "@/components/ToastProvider";
import { ACCENTS } from "@/components/SettingsProvider";
import { type Settings, DEFAULTS } from "@/lib/settings";
import { applyAccent } from "@/lib/theme-engine";
import BentoCard from "@/components/ui/BentoCard";
import PremiumThemePicker from "./PremiumThemePicker";
import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";
import Slider from "@/components/ui/Slider";

const ACCENT_COLORS = [
  { id: "violet", label: "Violet" },
  { id: "mint", label: "Menthe" },
  { id: "sky", label: "Ciel" },
  { id: "amber", label: "Ambre" },
  { id: "rose", label: "Rose" },
  { id: "teal", label: "Turquoise" },
  { id: "coral", label: "Corail" },
  { id: "custom", label: "Personnalisé" },
] as const;

const PACKS = [
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "tabler", label: "Tabler" },
  { id: "heroicons", label: "Heroicons" },
  { id: "radix", label: "Radix" },
] as const;

const FONTS = [
  { id: "inter", label: "Inter" },
  { id: "outfit", label: "Outfit" },
  { id: "jetbrains", label: "JetBrains Mono" },
  { id: "editorial", label: "Editorial Serif" },
  { id: "sans", label: "Sans système" },
  { id: "mono", label: "Mono" },
  { id: "serif", label: "Serif" },
] as const;

const DOCK_SCALES = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
] as const;

const DOCK_ALIGNS = [
  { id: "center", label: "Centre" },
  { id: "left", label: "Gauche" },
  { id: "right", label: "Droite" },
  { id: "stretch", label: "Étiré" },
] as const;

const DOCK_GLASS = [
  { id: "vitrified", label: "Vitrifié" },
  { id: "ultra-blur", label: "Ultra-blur" },
  { id: "sober", label: "Sobre" },
] as const;

const BACKGROUND_EFFECTS = [
  { id: "solid", label: "Solide" },
  { id: "gradient", label: "Dégradé" },
  { id: "mesh", label: "Mesh" },
  { id: "aurora", label: "Aurore" },
  { id: "nebula", label: "Nébuleuse" },
  { id: "noise", label: "Bruit" },
] as const;

const AURAS = [
  { id: "classic", label: "Classique" },
  { id: "boreal", label: "Boréale" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "eclipse", label: "Éclipse" },
  { id: "emerald", label: "Émeraude" },
  { id: "mineral", label: "Minéral" },
] as const;

const ICON_PACK_SAMPLE = "smile";

function getSampleIcon(pack: string) {
  const color = "#a1a1aa";
  switch (pack) {
    case "lucide":
      return { icon: `lucide:${ICON_PACK_SAMPLE}`, color };
    case "phosphor":
      return { icon: `ph:smiley`, color };
    case "tabler":
      return { icon: `tabler:mood-smile`, color };
    case "heroicons":
      return { icon: `heroicons:face-smile`, color };
    case "radix":
      return { icon: `radix-icons:face`, color };
    default:
      return { icon: `lucide:${ICON_PACK_SAMPLE}`, color };
  }
}

function isDirty(key: keyof Settings, value: unknown) {
  return JSON.stringify(value) !== JSON.stringify(DEFAULTS[key]);
}

type RowProps = {
  label: string;
  description?: string;
  children: React.ReactNode;
};

function SettingsRow({ label, description, children }: RowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] py-3 last:border-none sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-[var(--text-primary)]">{label}</h4>
        {description && <p className="text-[11px] text-[var(--text-muted)]">{description}</p>}
      </div>
      <div className="flex items-center justify-start gap-2 sm:justify-end">{children}</div>
    </div>
  );
}

export default function AppearanceSettings() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const form = useSettingsForm();
  const { show, dismiss } = useToast();
  const colorInputId = useId();
  const reduce = useReducedMotion();

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (typeof document !== "undefined" && (key === "accentColor" || key === "customAccent")) {
      const nextAccentColor = key === "accentColor" ? String(value) : settings.accentColor;
      const nextCustomAccent = key === "customAccent" ? String(value) : settings.customAccent;
      const hex = nextAccentColor === "custom" ? nextCustomAccent : (ACCENTS[nextAccentColor] || nextCustomAccent);
      applyAccent(document.documentElement, hex);
    }

    if (key === "theme" && value !== settings.theme) {
      const previousTheme = settings.theme;
      form.updateInstant(key, value);
      let toastId = "";
      toastId = show({
        type: "info",
        icon: <Sparkles className="h-5 w-5" />,
        title: i18n("themeChanged", "Thème modifié"),
        description: i18n("themeChangedDesc", "Votre apparence a été mise à jour."),
        duration: 5000,
        dedupKey: "theme-change",
        action: {
          label: i18n("undo", "Annuler"),
          onClick: () => {
            form.updateInstant("theme", previousTheme);
            dismiss(toastId);
          },
        },
      });
      return;
    }
    form.updateInstant(key, value);
  };

  const modifiedCount = useMemo(() => {
    const keys: (keyof Settings)[] = [
      "darkMode",
      "theme",
      "iconPack",
      "accentColor",
      "customAccent",
      "wallpaper",
      "aura",
      "glassEnabled",
      "cardTilt",
      "shadow",
      "backgroundEffect",
      "backgroundSpeed",
      "fontFamily",
      "fontSize",
      "reducedMotion",
      "uiGlow",
      "interfaceBlurEnabled",
      "dockFloatingSave",
      "dockAutoHide",
      "dockMagnify",
      "dockVisible",
      "presenceShowSignals",
    ];
    return keys.filter((k) => isDirty(k, settings[k])).length;
  }, [settings]);

  const currentTheme = settings.theme;
  const currentAccent = settings.accentColor;
  const isGrain = settings.wallpaper === "grain";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Card 1 : Thème & Accent */}
      <BentoCard title="Thème & Accent" icon="palette" className="md:col-span-2">
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold text-[var(--text-primary)]">{i18n("theme")}</h3>
            <PremiumThemePicker value={currentTheme} onChange={(theme) => handleChange("theme", theme)} />
          </div>

          <SettingsRow label="Pack d'icônes" description="Set d'icônes utilisé dans l'interface.">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] p-1">
              {PACKS.map((pack) => {
                const active = settings.iconPack === pack.id;
                const sample = getSampleIcon(pack.id);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handleChange("iconPack", pack.id)}
                    aria-pressed={active}
                    aria-label={pack.label}
                    className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeIconPack"
                        className="absolute inset-0 rounded-lg bg-[var(--text-primary)]/8"
                        transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeOut" as const }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <IconifyIcon icon={sample.icon} className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{pack.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </SettingsRow>

          <SettingsRow label="Couleur d'accent" description="Teinte dominante de l'interface.">
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_COLORS.map((color) => {
                if (color.id === "custom") {
                  return (
                    <label
                      key={color.id}
                      aria-label={color.label}
                      className={`relative flex h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border-2 transition-all active:scale-95 ${
                        currentAccent === "custom"
                          ? "border-[var(--text-primary)] shadow-[0_0_16px_var(--glow-color)]"
                          : "border-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/40"
                      }`}
                      style={{ background: settings.customAccent }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[var(--text-primary)]/80" />
                      <input
                        id={colorInputId}
                        type="color"
                        value={settings.customAccent}
                        onChange={(e) => {
                          handleChange("customAccent", e.target.value);
                          handleChange("accentColor", "custom");
                        }}
                        className="sr-only"
                        aria-label={color.label}
                      />
                    </label>
                  );
                }
                const hex = ACCENTS[color.id] || "#8b5cf6";
                const selected = currentAccent === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleChange("accentColor", color.id)}
                    aria-pressed={selected}
                    aria-label={color.label}
                    className={`relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
                      selected
                        ? "ring-2 ring-[var(--text-primary)] shadow-[0_0_14px_currentColor]"
                        : "ring-1 ring-[var(--text-primary)]/10 hover:ring-[var(--text-primary)]/40"
                    }`}
                    style={{ backgroundColor: hex, color: hex }}
                  >
                    {selected && <Check className="mx-auto h-3.5 w-3.5 text-[var(--text-primary)]" />}
                  </button>
                );
              })}
            </div>
          </SettingsRow>
        </div>
      </BentoCard>

      {/* Card 2 : Typographie & Échelle */}
      <BentoCard title="Typographie" icon="type">
        <div className="space-y-1">
          <SettingsRow label="Police" description="Famille de caractères principale.">
            <Select
              value={settings.fontFamily}
              onChange={(v) => handleChange("fontFamily", v as Settings["fontFamily"])}
              options={FONTS.map((f) => ({ id: f.id, label: f.label }))}
              className="min-w-[9rem]"
            />
          </SettingsRow>

          <SettingsRow label="Échelle du texte" description="Ajuste la taille globale du texte.">
            <div className="w-40">
              <Slider
                value={settings.fontSize}
                onChange={(v) => handleChange("fontSize", v)}
                min={80}
                max={130}
                step={1}
                unit="%"
                showValue
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Mode sombre" description="Forcer le thème sombre.">
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-[var(--text-muted)]" />
              <Switch
                checked={settings.darkMode}
                onChange={(v) => handleChange("darkMode", v)}
                labels={false}
                size="sm"
              />
              <Moon className="h-4 w-4 text-[var(--text-primary)]" />
            </div>
          </SettingsRow>

          {isNativeAndroid() && (
            <SettingsRow label="Material You" description="Utiliser la palette dynamique Android à la place du thème ETHONE.">
              <Switch
                checked={settings.useMaterialYou}
                onChange={(v) => handleChange("useMaterialYou", v)}
                labels={false}
                size="sm"
              />
            </SettingsRow>
          )}
        </div>
      </BentoCard>

      {/* Card 3 : Verre & Effets */}
      <BentoCard title="Verre & Effets" icon="glass-water">
        <div className="space-y-1">
          <SettingsRow label="Flou d'arrière-plan" description="Active l'effet de flou sur les panneaux.">
            <Switch
              checked={settings.interfaceBlurEnabled}
              onChange={(v) => handleChange("interfaceBlurEnabled", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Verre dépoli" description="Transparence des panneaux de l'interface.">
            <Switch
              checked={settings.glassEnabled}
              onChange={(v) => handleChange("glassEnabled", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Bordures lumineuses" description="Halo subtil sur les contours actifs.">
            <Switch
              checked={settings.uiGlow}
              onChange={(v) => handleChange("uiGlow", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Grain sombre" description="Applique un motif de grain en arrière-plan.">
            <Switch
              checked={isGrain}
              onChange={(v) => handleChange("wallpaper", v ? "grain" : "none")}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Mouvements réduits" description="Diminue les animations de l'interface.">
            <Switch
              checked={settings.reducedMotion}
              onChange={(v) => handleChange("reducedMotion", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Ombre des cartes" description="Style d'ombre des panneaux.">
            <Select
              value={settings.shadow}
              onChange={(v) => handleChange("shadow", v as Settings["shadow"])}
              options={[
                { id: "none", label: "Aucune" },
                { id: "sm", label: "Légère" },
                { id: "md", label: "Moyenne" },
                { id: "glow", label: "Néon" },
              ]}
              className="min-w-[7rem]"
            />
          </SettingsRow>

          <SettingsRow label="Arrière-plan" description="Effet appliqué au fond d'écran.">
            <Select
              value={settings.backgroundEffect}
              onChange={(v) => handleChange("backgroundEffect", v as Settings["backgroundEffect"])}
              options={BACKGROUND_EFFECTS.map((b) => ({ id: b.id, label: b.label }))}
              className="min-w-[9rem]"
            />
          </SettingsRow>

          <SettingsRow label="Vitesse d'animation" description="Rapidité de l'effet d'arrière-plan.">
            <div className="w-40">
              <Slider
                value={settings.backgroundSpeed}
                onChange={(v) => handleChange("backgroundSpeed", v)}
                min={0}
                max={100}
                step={1}
                unit="%"
                showValue
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Aura" description="Ambiance chromatique globale.">
            <Select
              value={settings.aura}
              onChange={(v) => handleChange("aura", v)}
              options={AURAS.map((a) => ({ id: a.id, label: a.label }))}
              className="min-w-[9rem]"
            />
          </SettingsRow>
        </div>
      </BentoCard>

      {/* Card 4 : Dock & Barre d'État */}
      <BentoCard title="Dock & Barre d'État" icon="anchor" className="md:col-span-2">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-4">
          <SettingsRow label="Dock visible" description="Afficher le dock en bas de l'écran.">
            <Switch
              checked={settings.dockVisible}
              onChange={(v) => handleChange("dockVisible", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Masquage auto" description="Réduire le dock lorsqu'il est inactif.">
            <Switch
              checked={settings.dockAutoHide}
              onChange={(v) => handleChange("dockAutoHide", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Magnification" description="Zoom au survol des icônes.">
            <Switch
              checked={settings.dockMagnify}
              onChange={(v) => handleChange("dockMagnify", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Sauvegarde flottante" description="Afficher la barre flottante d'enregistrement au-dessus du dock.">
            <Switch
              checked={settings.dockFloatingSave}
              onChange={(v) => handleChange("dockFloatingSave", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Métriques système" description="Afficher CPU/RAM dans la barre d'état.">
            <Switch
              checked={!!settings.presenceShowSignals}
              onChange={(v) => handleChange("presenceShowSignals", v)}
              labels={false}
              size="sm"
            />
          </SettingsRow>

          <SettingsRow label="Taille du dock" description="Échelle visuelle du dock.">
            <Select
              value={settings.dockScale}
              onChange={(v) => handleChange("dockScale", v as Settings["dockScale"])}
              options={DOCK_SCALES.map((s) => ({ id: s.id, label: s.label }))}
              className="min-w-[7rem]"
            />
          </SettingsRow>

          <SettingsRow label="Position du dock" description="Alignement horizontal du dock.">
            <Select
              value={settings.dockAlign}
              onChange={(v) => handleChange("dockAlign", v as Settings["dockAlign"])}
              options={DOCK_ALIGNS.map((a) => ({ id: a.id, label: a.label }))}
              className="min-w-[7rem]"
            />
          </SettingsRow>

          <SettingsRow label="Style du dock" description="Finition en verre du dock.">
            <Select
              value={settings.dockGlass}
              onChange={(v) => handleChange("dockGlass", v as Settings["dockGlass"])}
              options={DOCK_GLASS.map((g) => ({ id: g.id, label: g.label }))}
              className="min-w-[7rem]"
            />
          </SettingsRow>
        </div>
      </BentoCard>

      {modifiedCount > 0 && (
        <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-[--accent-primary]/30 bg-[--accent-primary]/10 px-3 py-2 text-[11px] text-[--accent-primary]">
          <Sparkles className="h-3.5 w-3.5" />
          {modifiedCount} option{modifiedCount > 1 ? "s" : ""} modifiée{modifiedCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
