"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { DEFAULTS } from "@/lib/settings";
import { getValueByPath } from "@/lib/object-path";
import { useSettingsForm } from "./SettingsFormContext";

export default function SettingRow({
  settingKey,
  path,
  label,
  saveMode = "instant",
  defaultValue,
  keywords,
  children,
}: {
  settingKey: string;
  path?: string;
  label: string;
  saveMode?: "instant" | "explicit";
  defaultValue?: unknown;
  keywords?: string[];
  children: (props: { value: unknown; onChange: (v: unknown) => void }) => React.ReactNode;
}) {
  const { settings } = useSettings();
  const form = useSettingsForm();

  const source = settings as Record<string, unknown>;
  const committedDefault = defaultValue !== undefined ? defaultValue : path ? getValueByPath(DEFAULTS as Record<string, unknown>, path) : (DEFAULTS as Record<string, unknown>)[settingKey];
  const committedValue = path ? getValueByPath(source, path) : source[settingKey];

  const isDraft = saveMode === "explicit" && form.isExplicitFieldDirty(settingKey);
  const value = isDraft ? form.draft[settingKey] : committedValue;

  const isDirty = committedDefault !== undefined && JSON.stringify(value) !== JSON.stringify(committedDefault);

  const onChange = (v: unknown) => {
    if (saveMode === "explicit") {
      form.setExplicit(settingKey, v);
    } else {
      form.updateInstant(settingKey, v, path);
    }
  };

  const handleUndo = () => {
    form.resetToDefault(settingKey, path);
  };

  const hidden = !form.matchesSearch(label, keywords);

  return (
    <div
      data-setting-key={settingKey}
      data-setting-label={label}
      className={`relative border-b border-[var(--border)]/50 py-3 transition-opacity ${hidden ? "hidden" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            {isDirty && (
              <span
                className="h-2 w-2 rounded-full bg-[var(--accent)]"
                aria-label="Modifié"
                title="Modifié"
              />
            )}
            <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
          </div>
          {form.matchesSearch(form.query, keywords) && form.query && (
            <span className="text-[10px] text-[var(--muted)]">
              {keywords?.join(" > ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleUndo}
              className="rounded p-1 text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
              title="Rétablir la valeur par défaut"
              aria-label="Rétablir la valeur par défaut"
            >
              <Icon name="rotate-ccw" className="h-3.5 w-3.5" />
            </button>
          )}
          {children({ value, onChange })}
          <AnimatePresence>
            {saveMode === "instant" && form.instantSaved(settingKey) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 8 }}
                className="text-[10px] font-medium text-emerald-400"
              >
                ✓ Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
