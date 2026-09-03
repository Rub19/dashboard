"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  Palette,
  Eye,
  RotateCcw,
  Plus,
  Download,
  Upload,
  Layers,
  Sliders,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import {
  PRESET_THEMES,
  PRESET_THEME_IDS,
  UNIVERSAL_ACCENTS,
  validateThemePayload,
  isValidHexColor,
  type ThemeDefinition,
  type PremiumThemeId,
} from "@/lib/theme-engine";
import { transitionTheme } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface ThemeStudioProps {
  className?: string;
}

export default function ThemeStudio({ className }: ThemeStudioProps) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const { settings, update } = useSettings();

  // Tabs: 'preset' | 'accents' | 'builder' | 'import-export'
  const [activeTab, setActiveTab] = useState<"preset" | "accents" | "builder" | "import-export">("preset");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Preview / Rollback state
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [previewAccent, setPreviewAccent] = useState<string | null>(null);
  const originalThemeRef = useRef<{ theme: string; accentColor: string; customAccent: string }>({
    theme: settings.theme,
    accentColor: settings.accentColor,
    customAccent: settings.customAccent,
  });

  // Custom Theme Builder State
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customColorScheme, setCustomColorScheme] = useState<"dark" | "light">("dark");
  const [customBgMain, setCustomBgMain] = useState("#08080a");
  const [customBgSurface, setCustomBgSurface] = useState("#0f0f13");
  const [customBgSidebar, setCustomBgSidebar] = useState("#0c0c10");
  const [customAccent, setCustomAccent] = useState("#8b5cf6");
  const [customGlass, setCustomGlass] = useState<"off" | "low" | "medium" | "high">("medium");

  // Import / Export State
  const [importJson, setImportJson] = useState("");

  // All available themes (presets + custom)
  const allThemes = useMemo(() => {
    const list: ThemeDefinition[] = PRESET_THEME_IDS.map((id) => PRESET_THEMES[id]);
    if (settings.customThemes && settings.customThemes.length > 0) {
      list.push(...settings.customThemes);
    }
    return list;
  }, [settings.customThemes]);

  const filteredThemes = useMemo(() => {
    if (selectedCategory === "all") return allThemes;
    if (selectedCategory === "custom") return allThemes.filter((t) => t.isCustom);
    return allThemes.filter((t) => t.category === selectedCategory);
  }, [allThemes, selectedCategory]);

  const currentThemeId = previewThemeId ?? settings.theme;
  const currentAccent = previewAccent ?? settings.accentColor;

  // Handle Theme Selection / Preview
  const handleSelectTheme = (themeId: string, applyImmediate = true) => {
    if (applyImmediate) {
      setPreviewThemeId(null);
      transitionTheme(themeId, (id) => update({ theme: id }), {
        accentColor: settings.accentColor,
        customAccent: settings.customAccent,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
      const themeLabel = PRESET_THEMES[themeId as PremiumThemeId]?.label || settings.customThemes?.find((t) => t.id === themeId)?.label || themeId;
      success(`Thème "${themeLabel}" appliqué`);
    } else {
      setPreviewThemeId(themeId);
      transitionTheme(themeId, () => {}, {
        accentColor: settings.accentColor,
        customAccent: settings.customAccent,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
    }
  };

  // Handle Accent Selection
  const handleSelectAccent = (accentId: string, hex?: string) => {
    if (accentId === "custom" && hex) {
      update({ accentColor: "custom", customAccent: hex });
      transitionTheme(settings.theme, () => {}, {
        accentColor: "custom",
        customAccent: hex,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
      success("Couleur d'accent personnalisée appliquée");
    } else {
      update({ accentColor: accentId as typeof settings.accentColor });
      transitionTheme(settings.theme, () => {}, {
        accentColor: accentId,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
      success("Accent mis à jour");
    }
  };

  // Rollback preview
  const handleCancelPreview = () => {
    const orig = originalThemeRef.current;
    setPreviewThemeId(null);
    setPreviewAccent(null);
    transitionTheme(orig.theme, (id) => update({ theme: id, accentColor: orig.accentColor as typeof settings.accentColor, customAccent: orig.customAccent }), {
      accentColor: orig.accentColor,
      customAccent: orig.customAccent,
      glassLevel: settings.glassLevel,
      performanceMode: settings.performanceMode,
      customThemes: settings.customThemes,
      reducedMotion: settings.reducedMotion,
    });
    success("Aperçu annulé, thème restauré");
  };

  // Confirm preview
  const handleApplyPreview = () => {
    if (previewThemeId) {
      update({ theme: previewThemeId });
      setPreviewThemeId(null);
      originalThemeRef.current.theme = previewThemeId;
      success("Thème confirmé et enregistré");
    }
  };

  // Reset to default Obsidian
  const handleResetToDefault = () => {
    transitionTheme("obsidian", (id) => update({ theme: id, accentColor: "violet", customAccent: "#8b5cf6", glassLevel: "medium" }), {
      accentColor: "violet",
      customAccent: "#8b5cf6",
      glassLevel: "medium",
      performanceMode: "normal",
      reducedMotion: settings.reducedMotion,
    });
    setPreviewThemeId(null);
    success("Thème réinitialisé aux paramètres d'origine");
  };

  // Save Custom Theme
  const handleSaveCustomTheme = () => {
    if (!customName.trim()) {
      toastError("Veuillez donner un nom à votre thème.");
      return;
    }

    const payload = {
      id: `custom-${Date.now()}`,
      label: customName.trim(),
      description: customDescription.trim() || "Thème personnalisé",
      colorScheme: customColorScheme,
      bgMain: customBgMain,
      bgSurface: customBgSurface,
      bgSidebar: customBgSidebar,
      accentPrimary: customAccent,
      glassDefault: customGlass,
    };

    const validated = validateThemePayload(payload);
    if (!validated.ok) {
      toastError(validated.error);
      return;
    }

    const updatedList = [...(settings.customThemes || []), validated.theme];
    update({ customThemes: updatedList, theme: validated.theme.id });
    handleSelectTheme(validated.theme.id, true);
    setCustomName("");
    setCustomDescription("");
    setActiveTab("preset");
    success(`Thème "${validated.theme.label}" créé avec succès !`);
  };

  // Delete Custom Theme
  const handleDeleteCustomTheme = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = (settings.customThemes || []).filter((t) => t.id !== id);
    const nextTheme = settings.theme === id ? "obsidian" : settings.theme;
    update({ customThemes: updatedList, theme: nextTheme });
    if (settings.theme === id) handleSelectTheme("obsidian", true);
    success("Thème personnalisé supprimé");
  };

  // Export Theme JSON
  const handleExportTheme = (theme: ThemeDefinition) => {
    const jsonStr = JSON.stringify(theme, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      success(`Configuration de "${theme.label}" copiée dans le presse-papier !`);
    }).catch(() => {
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${theme.id}-theme.json`;
      a.click();
      URL.revokeObjectURL(url);
      success(`Thème "${theme.label}" téléchargé !`);
    });
  };

  // Import Theme JSON
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson);
      const res = validateThemePayload(parsed);
      if (!res.ok) {
        toastError(res.error);
        return;
      }
      const updatedList = [...(settings.customThemes || []), res.theme];
      update({ customThemes: updatedList, theme: res.theme.id });
      handleSelectTheme(res.theme.id, true);
      setImportJson("");
      setActiveTab("preset");
      success(`Thème "${res.theme.label}" importé avec succès !`);
    } catch {
      toastError("Le format JSON est invalide.");
    }
  };

  return (
    <div className={cn("space-y-6 select-none", className)}>
      {/* Floating Preview Confirmation Banner */}
      <AnimatePresence>
        {previewThemeId && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="sticky top-2 z-50 flex items-center justify-between gap-3 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--panel-bg)]/95 p-3.5 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-5 w-5 text-[var(--accent-primary)] animate-pulse" />
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Mode Prévisualisation actif
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Thème testé : <span className="font-semibold text-[var(--accent-primary)]">{previewThemeId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleCancelPreview}>
                Annuler
              </Button>
              <Button size="sm" variant="primary" onClick={handleApplyPreview} leftIcon={<Check className="h-3.5 w-3.5" />}>
                Appliquer définitivement
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all touch-manipulation",
              activeTab === "preset"
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Thèmes ({allThemes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("accents")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all touch-manipulation",
              activeTab === "accents"
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Couleurs d'accent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all touch-manipulation",
              activeTab === "builder"
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Créateur Custom</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("import-export")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all touch-manipulation",
              activeTab === "import-export"
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Import / Export</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
          title="Rétablir les réglages d'origine"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Rétablir défaut</span>
        </button>
      </div>

      {/* TAB 1: PRESET & CUSTOM THEMES */}
      {activeTab === "preset" && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "Tous" },
              { id: "dark", label: "Sombres" },
              { id: "oled", label: "OLED Black" },
              { id: "vibrant", label: "Vibrants" },
              { id: "light", label: "Clair (Arctic)" },
              { id: "glass", label: "Liquid Glass" },
              { id: "custom", label: "Mes Thèmes" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
                  selectedCategory === cat.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredThemes.map((theme) => {
              const isSelected = currentThemeId === theme.id;
              const isLight = theme.colorScheme === "light";

              return (
                <motion.div
                  key={theme.id}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTheme(theme.id, true)}
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 p-4 text-left transition-all cursor-pointer shadow-lg",
                    isSelected
                      ? "border-[var(--accent-primary)] shadow-[0_0_24px_var(--glow-color)]"
                      : "border-[var(--panel-border)]/60 hover:border-[var(--panel-border)]"
                  )}
                  style={{
                    backgroundColor: theme.bgMain,
                    color: theme.textPrimary,
                  }}
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <span
                      className="absolute right-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full shadow-md"
                      style={{ backgroundColor: theme.accentPrimary, color: theme.accentContrast }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}

                  {/* Header info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 pr-8">
                      <h4 className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
                        {theme.label}
                      </h4>
                      {theme.isCustom && (
                        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                          Custom
                        </span>
                      )}
                      {isLight ? (
                        <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">
                          Light
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300">
                          Dark
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed opacity-75 line-clamp-2" style={{ color: theme.textMuted }}>
                      {theme.description}
                    </p>
                  </div>

                  {/* Miniature Desktop / Mobile UI Preview */}
                  <div
                    className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border p-2 flex gap-1.5"
                    style={{
                      borderColor: theme.borderSubtle,
                      backgroundColor: theme.bgSurface,
                    }}
                  >
                    {/* Mini Sidebar */}
                    <div
                      className="w-1/4 rounded-xl border p-1.5 flex flex-col justify-between"
                      style={{
                        borderColor: theme.borderSubtle,
                        backgroundColor: theme.bgSidebar,
                      }}
                    >
                      <div className="space-y-1">
                        <div className="h-2 w-4 rounded-full" style={{ backgroundColor: theme.accentPrimary }} />
                        <div className="h-1.5 w-6 rounded-full opacity-50" style={{ backgroundColor: theme.textMuted }} />
                        <div className="h-1.5 w-5 rounded-full opacity-30" style={{ backgroundColor: theme.textMuted }} />
                      </div>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accentSecondary }} />
                    </div>

                    {/* Mini Content Area */}
                    <div className="flex-1 space-y-1.5">
                      <div
                        className="h-4 w-full rounded-lg border flex items-center px-1.5 justify-between"
                        style={{ borderColor: theme.borderSubtle, backgroundColor: theme.bgCard }}
                      >
                        <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: theme.accentPrimary }} />
                        <div className="h-1.5 w-3 rounded-full opacity-40" style={{ backgroundColor: theme.textMuted }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div
                          className="h-8 rounded-lg border p-1"
                          style={{ borderColor: theme.borderSubtle, backgroundColor: theme.bgCard }}
                        >
                          <div className="h-1.5 w-5 rounded-full opacity-70" style={{ backgroundColor: theme.textPrimary }} />
                          <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: theme.accentPrimary }} />
                        </div>
                        <div
                          className="h-8 rounded-lg border p-1"
                          style={{ borderColor: theme.borderSubtle, backgroundColor: theme.bgCard }}
                        >
                          <div className="h-1.5 w-6 rounded-full opacity-70" style={{ backgroundColor: theme.textPrimary }} />
                          <div className="mt-1 h-1 w-8 rounded-full" style={{ backgroundColor: theme.borderActive }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTheme(theme.id, false);
                      }}
                      className="text-[11px] font-semibold opacity-70 hover:opacity-100 flex items-center gap-1 transition-opacity"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Prévisualiser</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportTheme(theme);
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all"
                        title="Exporter la configuration JSON"
                      >
                        <Download className="h-3 w-3" />
                      </button>

                      {theme.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTheme(theme.id, e)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="Supprimer ce thème"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: UNIVERSAL ACCENT SELECTOR */}
      {activeTab === "accents" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Couleur d'accent universelle
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Cette couleur dynamique se propage instantanément à travers les boutons, indicateurs, Dynamic Island, Focus et badges.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {UNIVERSAL_ACCENTS.map((accent) => {
              const isSelected = currentAccent === accent.id;

              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => handleSelectAccent(accent.id)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 rounded-2xl border p-3.5 text-center transition-all touch-manipulation",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--surface-raised)] shadow-lg"
                      : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <span
                    className="relative flex h-10 w-10 items-center justify-center rounded-2xl shadow-md transition-transform hover:scale-110"
                    style={{ backgroundColor: accent.hex }}
                  >
                    {isSelected && <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-full">
                    {accent.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Hex Color Picker */}
          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-5 space-y-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Palette className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Couleur d'accent personnalisée (Hex)</span>
            </h4>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={isValidHexColor(settings.customAccent) ? settings.customAccent : "#8b5cf6"}
                onChange={(e) => handleSelectAccent("custom", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-xl border border-[var(--panel-border)] bg-transparent p-1"
              />
              <input
                type="text"
                value={settings.customAccent}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isValidHexColor(val)) {
                    handleSelectAccent("custom", val);
                  }
                }}
                placeholder="#8b5cf6"
                className="w-36 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
              <span className="text-xs text-[var(--text-muted)]">
                Entrez un code hexadécimal valide pour un accent unique.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THEME BUILDER */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Constructeur de Thème Sur Mesure
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Concevez votre propre palette ETHONE et sauvegardez-la dans vos préférences utilisateur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-5">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)]">Nom du thème</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Mon Thème Cyberpunk"
                  className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)]">Description</label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Description courte de l'ambiance"
                  className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Fond Principal</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgMain}
                      onChange={(e) => setCustomBgMain(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={customBgMain}
                      onChange={(e) => setCustomBgMain(e.target.value)}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Fond Surface</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgSurface}
                      onChange={(e) => setCustomBgSurface(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={customBgSurface}
                      onChange={(e) => setCustomBgSurface(e.target.value)}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Barre Latérale</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgSidebar}
                      onChange={(e) => setCustomBgSidebar(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={customBgSidebar}
                      onChange={(e) => setCustomBgSidebar(e.target.value)}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Couleur d'Accent</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={handleSaveCustomTheme} className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
                  Sauvegarder et Appliquer
                </Button>
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div
              className="rounded-3xl border-2 p-6 flex flex-col justify-between shadow-2xl"
              style={{
                backgroundColor: customBgMain,
                borderColor: customAccent,
                color: "#ededed",
              }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Aperçu en direct</span>
                <h4 className="text-lg font-bold mt-1 truncate">{customName || "Mon Nouveau Thème"}</h4>
                <p className="text-xs opacity-75 mt-0.5">{customDescription || "Aperçu des surfaces et contrastes"}</p>
              </div>

              <div className="my-6 space-y-3">
                <div
                  className="rounded-2xl p-3.5 border shadow-md flex items-center justify-between"
                  style={{ backgroundColor: customBgSurface, borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <span className="text-xs font-semibold">Surface Bento Card</span>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: customAccent }} />
                </div>

                <div
                  className="rounded-2xl p-3.5 border shadow-md flex items-center justify-between"
                  style={{ backgroundColor: customBgSidebar, borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <span className="text-xs font-semibold">Barre Latérale / Dock</span>
                  <span className="text-[10px] font-mono opacity-60">{customBgSidebar}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl py-2 text-xs font-bold shadow-md"
                  style={{ backgroundColor: customAccent, color: "#ffffff" }}
                >
                  Bouton Principal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: IMPORT / EXPORT */}
      {activeTab === "import-export" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Import & Export de Thèmes
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Partagez vos créations ou importez des thèmes JSON communautaires en toute sécurité.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-5 space-y-4">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Collez le code JSON du thème :
            </label>
            <textarea
              rows={6}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{\n  "label": "Cyber Matrix",\n  "bgMain": "#001100",\n  "bgSurface": "#002200",\n  "bgSidebar": "#001800",\n  "accentPrimary": "#00ff66"\n}'
              className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3.5 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />

            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleImportJson} leftIcon={<Upload className="h-4 w-4" />}>
                Importer le thème
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
