"use client";

import { Checkbox } from "@/components/ui/Checkbox";

export default function StylizedTaskCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => onChange()}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
