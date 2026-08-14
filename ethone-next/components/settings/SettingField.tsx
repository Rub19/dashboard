"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/lib/icons";
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

export type FieldDef =
  | {
      key: string;
      path?: string;
      label: string;
      type: FieldType;
      saveMode?: "instant" | "explicit";
      defaultValue?: unknown;
      keywords?: string[];
    }
  | {
      key: string;
      label: string;
      type: "range";
      saveMode?: "instant" | "explicit";
      min?: number;
      max?: number;
      unit?: string;
      defaultValue?: number;
      keywords?: string[];
    }
  | {
      key: string;
      label: string;
      type: "button-grid" | "select";
      saveMode?: "instant" | "explicit";
      options: { id: string; label: string }[];
      defaultValue?: string;
      keywords?: string[];
    }
  | {
      key: string;
      path?: string;
      label: string;
      type: "checkbox-list";
      saveMode?: "instant" | "explicit";
      options: { id: string; label: string }[];
      defaultValue?: string[];
      keywords?: string[];
    }
  | {
      key: string;
      label: string;
      type: "custom";
      render: (value: unknown, onChange: (v: unknown) => void) => React.ReactNode;
      defaultValue?: unknown;
      keywords?: string[];
    };

export default function SettingField({ field }: { field: FieldDef }) {
  const { settings } = useSettings();
  const form = useSettingsForm();
  const [justSaved, setJustSaved] = useState(false);

  const source = settings as Record<string, unknown>;
  const saveMode = ("saveMode" in field ? field.saveMode : undefined) || "instant";
  const path = ("path" in field && field.path) ? field.path : undefined;
  const settingKey = field.key;

  const committedValue = path ? getValueByPath(source, path) : source[settingKey];
  const isDraft = saveMode === "explicit" && settingKey in form.draft;
  const value = isDraft ? form.draft[settingKey] : committedValue;

  const defaultValueSource = DEFAULTS as Record<string, unknown>;
  const defaultValue =
    field.defaultValue !== undefined
      ? field.defaultValue
      : path
        ? getValueByPath(defaultValueSource, path)
        : defaultValueSource[settingKey];

  const isDirty = JSON.stringify(value) !== JSON.stringify(defaultValue);

  const onChange = (v: unknown) => {
    if (saveMode === "explicit") {
      form.setExplicit(settingKey, v);
    } else {
      form.updateInstant(settingKey, v, path);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1500);
    }
  };

  const handleUndo = () => {
    form.resetToDefault(settingKey, path);
  };

  const visible = form.matchesSearch(field.label, field.keywords);

  if (!visible) return null;

  const control = (() => {
    switch (field.type) {
      case "toggle":
        return <SwitchControl checked={Boolean(value)} onChange={(v) => onChange(v)} />;
      case "range":
        return (
          <RangeControl
            value={Number(value)}
            onChange={(v) => onChange(v)}
            min={("min" in field ? field.min : undefined)}
            max={("max" in field ? field.max : undefined)}
            unit={("unit" in field ? field.unit : undefined)}
          />
        );
      case "button-grid":
        return (
          <ButtonGridControl
            value={String(value)}
            onChange={(v) => onChange(v)}
            options={("options" in field ? field.options : []) as { id: string; label: string }[]}
          />
        );
      case "checkbox-list":
        return (
          <CheckboxListControl
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(v) => onChange(v)}
            options={("options" in field ? field.options : []) as { id: string; label: string }[]}
          />
        );
      case "color":
        return <ColorControl value={String(value)} onChange={(v) => onChange(v)} />;
      case "select":
        return (
          <SelectControl
            value={String(value)}
            onChange={(v) => onChange(v)}
            options={("options" in field ? field.options : []) as { id: string; label: string }[]}
          />
        );
      case "text":
      case "email":
      case "password":
        return (
          <TextControl
            value={String(value)}
            onChange={(v) => onChange(v)}
            type={field.type}
          />
        );
      case "custom":
        return ("render" in field ? field.render(value, onChange) : null);
      default:
        return null;
    }
  })();

  return (
    <div
      data-setting-key={settingKey}
      data-setting-label={field.label}
      className="relative border-b border-[var(--border)]/50 py-3 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" title="Modifié" />
            )}
            <span className="text-sm font-medium text-[var(--foreground)]">{field.label}</span>
          </div>
          {form.query && field.keywords && field.keywords.length > 0 && (
            <span className="text-[10px] text-[var(--muted)]">{field.keywords.join(" > ")}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && saveMode === "instant" && (
            <button
              type="button"
              onClick={handleUndo}
              className="rounded p-1 text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
              title="Rétablir la valeur par défaut"
              aria-label="Rétablir"
            >
              <Icon name="rotate-ccw" className="h-3.5 w-3.5" />
            </button>
          )}
          {control}
          <AnimatePresence>
            {saveMode === "instant" && justSaved && (
              <motion.span
                initial={{ opacity: 0, x: 8, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.8 }}
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
