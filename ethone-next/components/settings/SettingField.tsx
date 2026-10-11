"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/SettingsProvider";
import { DEFAULTS } from "@/lib/settings";
import { getValueByPath } from "@/lib/object-path";
import { useSettingsForm } from "./SettingsFormContext";
import {
  SwitchControl,
  RangeControl,
  ButtonGridControl,
  CheckboxListControl,
  ColorControl,
  SelectControl,
  TextControl,
} from "./SettingControls";

export type FieldType =
  | "toggle"
  | "range"
  | "button-grid"
  | "checkbox-list"
  | "color"
  | "select"
  | "text"
  | "email"
  | "password"
  | "custom";

type BaseFieldDef = {
  key: string;
  path?: string;
  label: string;
  saveMode?: "instant" | "explicit";
  defaultValue?: unknown;
  keywords?: string[];
  description?: string;
  options?: unknown;
  onAfterChange?: (value: unknown) => void | Promise<void>;
  autoComplete?: string;
};

export type FieldDef =
  | (BaseFieldDef & { type: "toggle" })
  | (BaseFieldDef & { type: "range"; min?: number; max?: number; unit?: string })
  | (BaseFieldDef & {
      type: "button-grid";
      options: { id: string; label: string; icon?: string }[];
      cols?: number;
    })
  | (BaseFieldDef & {
      type: "select";
      options: { id: string; label: string }[];
    })
  | (BaseFieldDef & {
      type: "checkbox-list";
      options: { id: string; label: string }[];
    })
  | (BaseFieldDef & { type: "color" | "text" | "email" | "password" })
  | (BaseFieldDef & {
      type: "custom";
      render: (value: unknown, onChange: (v: unknown) => void, options?: unknown) => React.ReactNode;
    });

function SettingField({ field }: { field: FieldDef }) {
  const { settings } = useSettings();
  const form = useSettingsForm();

  const source = settings as Record<string, unknown>;
  const saveMode = field.saveMode ?? "instant";
  const path = field.path;
  const settingKey = field.key;

  const committedValue = path ? getValueByPath(source, path) : source[settingKey];
  const isDraft = saveMode === "explicit" && form.isExplicitFieldDirty(settingKey);
  const rawValue = isDraft ? form.draft[settingKey] : committedValue;
  const defaultValue =
    field.defaultValue !== undefined
      ? field.defaultValue
      : path
        ? getValueByPath(DEFAULTS as Record<string, unknown>, path)
        : (DEFAULTS as Record<string, unknown>)[settingKey];
  const value = rawValue !== undefined ? rawValue : defaultValue;

  const isDirty = JSON.stringify(value) !== JSON.stringify(defaultValue);

  const labelId = `${settingKey}-label`;
  const descId = `${settingKey}-desc`;
  const describedBy = field.description ? descId : undefined;

  const onChange = async (v: unknown) => {
    if (saveMode === "explicit") {
      form.setExplicit(settingKey, v);
    } else {
      form.updateInstant(settingKey, v, path);
    }
    if (field.onAfterChange) {
      try {
        await field.onAfterChange(v);
      } catch (err) {
        console.error("onAfterChange error:", err);
      }
    }
  };

  const handleUndo = () => {
    form.resetToDefault(settingKey, path, defaultValue);
  };

  const match = form.matchesSearch(field.label, field.keywords);
  const hidden = !match;

  const control = (() => {
    switch (field.type) {
      case "toggle":
        return <SwitchControl checked={Boolean(value)} onChange={(v) => onChange(v)} aria-label={field.label} aria-describedby={describedBy} />;
      case "range": {
        return (
          <RangeControl
            value={Number(value ?? 0)}
            onChange={(v) => onChange(v)}
            min={field.min}
            max={field.max}
            unit={field.unit}
            aria-label={field.label}
            aria-describedby={describedBy}
          />
        );
      }
      case "button-grid":
        return (
          <ButtonGridControl
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            options={field.options}
            cols={field.cols}
            aria-label={field.label}
            aria-describedby={describedBy}
          />
        );
      case "checkbox-list":
        return (
          <CheckboxListControl
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(v) => onChange(v)}
            options={field.options}
            aria-label={field.label}
            aria-describedby={describedBy}
          />
        );
      case "color":
        return <ColorControl value={String(value ?? "#000000")} onChange={(v) => onChange(v)} aria-label={field.label} aria-describedby={describedBy} />;
      case "select":
        return (
          <SelectControl
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            options={field.options}
            aria-label={field.label}
            aria-describedby={describedBy}
          />
        );
      case "text":
      case "email":
      case "password":
        return (
          <TextControl
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            type={field.type}
            autoComplete={field.autoComplete}
            aria-label={field.label}
            aria-describedby={describedBy}
          />
        );
      case "custom":
        return field.render(value, onChange, field.options);
      default:
        return null;
    }
  })();

  if (!control) return null;
  const saved = form.instantSaved(settingKey);

  return (
    <div
      data-testid={`setting-field-${settingKey}`}
      data-setting-key={settingKey}
      data-setting-path={path}
      data-setting-label={field.label}
      className={cn("group/row relative px-5 py-3.5 transition-colors duration-200 hover:bg-[var(--text-primary)]/[0.025]", hidden && "hidden")}
    >
      <AnimatePresence>
        {isDirty && (
          <motion.span
            key="dirty"
            aria-label="Modifié"
            title="Modifié"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="absolute bottom-3 left-0 top-3 w-[3px] origin-center rounded-r-full bg-[var(--accent-primary)]"
          />
        )}
      </AnimatePresence>
      <div className="grid min-h-[40px] grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2">
            <span id={labelId} className="text-[13.5px] font-medium text-[var(--text-primary)]">
              {field.label}
            </span>
            <AnimatePresence>
              {saved && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]"
                >
                  <Check className="h-3 w-3" />
                  Enregistré
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          {field.description && (
            <span id={descId} className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">
              {field.description}
            </span>
          )}
          {form.query && field.keywords && field.keywords.length > 0 && (
            <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">{field.keywords.join(" › ")}</span>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleUndo}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-60 transition-[opacity,color,background-color,transform] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] hover:opacity-100 active:scale-90 group-hover/row:opacity-100"
              title="Rétablir la valeur par défaut"
              aria-label="Rétablir la valeur par défaut"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="min-w-0 flex-1">{control}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingField);
