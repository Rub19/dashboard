"use client";

import { memo, useId } from "react";
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
      options: { id: string; label: string }[];
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

  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const descId = `${fieldId}-desc`;
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

  return (
    <div
      data-testid={`setting-field-${settingKey}`}
      data-setting-key={settingKey}
      data-setting-path={path}
      data-setting-label={field.label}
      className={`relative px-4 py-2 transition-opacity ${hidden ? "hidden" : ""}`}
    >
      <div className="flex min-h-[44px] items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {isDirty && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
              title="Modifié"
              aria-label="Modifié"
            />
          )}
          <div className="flex min-w-0 flex-col">
            <span id={labelId} className="text-sm font-medium text-[var(--text-primary)]">
              {field.label}
            </span>
            {field.description && (
              <span id={descId} className="text-[11px] leading-tight text-[var(--text-muted)]">
                {field.description}
              </span>
            )}
            {form.query && field.keywords && field.keywords.length > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">{field.keywords.join(" > ")}</span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleUndo}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--panel-radius)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--accent-primary)]"
              title="Rétablir la valeur par défaut"
              aria-label="Rétablir la valeur par défaut"
            >
              <Icon name="rotate-ccw" className="h-3.5 w-3.5" />
            </button>
          )}
          {control}
        </div>
      </div>
    </div>
  );
}

export default memo(SettingField);
