"use client";

import { useMemo } from "react";
import Select from "@/components/ui/Select";
import FlagIcon from "@/components/FlagIcon";

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
            <FlagIcon code={option.id} className="h-4 w-6 shrink-0 rounded-sm" />
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
