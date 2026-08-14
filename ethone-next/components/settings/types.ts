import type { ReactNode } from "react";

export type SaveMode = "instant" | "explicit";

export type SettingInputType =
  | "toggle"
  | "range"
  | "select"
  | "button-grid"
  | "checkbox-list"
  | "color"
  | "text"
  | "email"
  | "password"
  | "custom";

export type Option<T = string> = { id: T; label: string };

export type SettingDef = {
  id: string;
  label: string;
  type: SettingInputType;
  saveMode?: SaveMode;
  defaultValue?: unknown;
  path?: string;
  min?: number;
  max?: number;
  unit?: string;
  options?: Option[];
  advanced?: boolean;
  keywords?: string[];
  render?: (props: { value: unknown; onChange: (v: unknown) => void; onSave?: () => void }) => ReactNode;
};

export type SectionDef = {
  id: string;
  label: string;
  icon: string;
  settings: SettingDef[];
  advanced?: boolean;
  danger?: boolean;
};
