"use client";

import { useMemo } from "react";
import Select from "@/components/ui/Select";

function FlagFr() {
  return (
    <svg viewBox="0 0 16 12" className="h-3 w-4 shrink-0 rounded-sm shadow-sm">
      <rect x="0" y="0" width="5.33" height="12" fill="#0055A4" />
      <rect x="5.33" y="0" width="5.33" height="12" fill="#FFFFFF" />
      <rect x="10.66" y="0" width="5.34" height="12" fill="#EF4444" />
    </svg>
  );
}

function FlagEn() {
  return (
    <svg viewBox="0 0 16 12" className="h-3 w-4 shrink-0 rounded-sm shadow-sm">
      <rect x="0" y="0" width="16" height="12" fill="#1D4E8C" />
      <rect x="0" y="1.5" width="16" height="1.5" fill="#FFFFFF" />
      <rect x="0" y="4.5" width="16" height="1.5" fill="#FFFFFF" />
      <rect x="0" y="7.5" width="16" height="1.5" fill="#FFFFFF" />
      <rect x="0" y="10.5" width="16" height="1.5" fill="#FFFFFF" />
      <rect x="0" y="0" width="6.5" height="6.5" fill="#1D4E8C" />
      <g fill="#FFFFFF">
        <circle cx="1.3" cy="1.3" r="0.6" />
        <circle cx="3.25" cy="1.3" r="0.6" />
        <circle cx="5.2" cy="1.3" r="0.6" />
        <circle cx="2.3" cy="2.6" r="0.6" />
        <circle cx="4.25" cy="2.6" r="0.6" />
        <circle cx="1.3" cy="3.9" r="0.6" />
        <circle cx="3.25" cy="3.9" r="0.6" />
        <circle cx="5.2" cy="3.9" r="0.6" />
        <circle cx="2.3" cy="5.2" r="0.6" />
        <circle cx="4.25" cy="5.2" r="0.6" />
      </g>
    </svg>
  );
}

function FlagEs() {
  return (
    <svg viewBox="0 0 16 12" className="h-3 w-4 shrink-0 rounded-sm shadow-sm">
      <rect x="0" y="0" width="16" height="3" fill="#AA151B" />
      <rect x="0" y="3" width="16" height="6" fill="#F1BF00" />
      <rect x="0" y="9" width="16" height="3" fill="#AA151B" />
    </svg>
  );
}

function FlagDe() {
  return (
    <svg viewBox="0 0 16 12" className="h-3 w-4 shrink-0 rounded-sm shadow-sm">
      <rect x="0" y="0" width="16" height="4" fill="#000000" />
      <rect x="0" y="4" width="16" height="4" fill="#DD0000" />
      <rect x="0" y="8" width="16" height="4" fill="#FFCE00" />
    </svg>
  );
}

function FlagForLang(id: string) {
  switch (id) {
    case "fr":
      return <FlagFr />;
    case "en":
      return <FlagEn />;
    case "es":
      return <FlagEs />;
    case "de":
      return <FlagDe />;
    default:
      return null;
  }
}

type LanguageControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
};

export default function LanguageControl({ value, onChange, options }: LanguageControlProps) {
  const selectOptions = useMemo(
    () =>
      options.map((option) => ({
        id: option.id,
        label: (
          <span className="flex items-center gap-2">
            {FlagForLang(option.id)}
            <span>{option.label}</span>
          </span>
        ),
      })),
    [options]
  );

  return (
    <Select
      value={value}
      onChange={onChange}
      options={selectOptions}
      className="min-w-[10rem]"
    />
  );
}
