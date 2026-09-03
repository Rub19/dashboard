"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { getWidgetManifest } from "@/lib/widget-registry";

export type WidgetConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
  currentConfig?: Record<string, unknown>;
  onSaveConfig: (config: Record<string, unknown>) => void;
};

export default function WidgetConfigModal({
  isOpen,
  onClose,
  widgetId,
  currentConfig = {},
  onSaveConfig,
}: WidgetConfigModalProps) {
  const manifest = getWidgetManifest(widgetId);
  const [config, setConfig] = useState<Record<string, unknown>>(currentConfig);

  const handleChange = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSaveConfig(config);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configuration — ${manifest?.name || widgetId}`}
      description="Personnalisez les options d'affichage et le comportement de ce widget."
      size="sm"
    >
      <div className="space-y-4 p-2 text-xs">
        {widgetId === "live" && (
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-2.5">
              <span className="font-semibold text-[var(--text-primary)]">Effet 3D Tilt interactif</span>
              <input
                type="checkbox"
                checked={config.show3DTilt !== false}
                onChange={(e) => handleChange("show3DTilt", e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--accent-primary)] cursor-pointer"
              />
            </label>
          </div>
        )}

        {widgetId === "productivity" && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                Nombre maximum de tâches
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={Number(config.limit) || 5}
                onChange={(e) => handleChange("limit", Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
        )}

        {widgetId === "daystream" && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                Événements affichés
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={Number(config.maxItems) || 4}
                onChange={(e) => handleChange("maxItems", Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
        )}

        {widgetId === "system" && (
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-2.5">
              <span className="font-semibold text-[var(--text-primary)]">Afficher la latence réseau</span>
              <input
                type="checkbox"
                checked={config.showLatency !== false}
                onChange={(e) => handleChange("showLatency", e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--accent-primary)] cursor-pointer"
              />
            </label>
          </div>
        )}

        {widgetId !== "live" && widgetId !== "productivity" && widgetId !== "daystream" && widgetId !== "system" && (
          <p className="text-zinc-400 py-2">
            Ce widget utilise les paramètres par défaut d'ETHONE OS.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]/50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
