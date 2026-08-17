"use client";

import { Checkbox } from "@/components/ui/Checkbox";

export type CustomCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
};

export default function CustomCheckbox({
  checked,
  onChange,
  label,
  className = "",
}: CustomCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => onChange()}
      label={label}
      className={className}
    />
  );
}
