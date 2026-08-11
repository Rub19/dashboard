"use client";

import { useState, type ReactNode } from "react";

export default function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {open && label && (
        <span className="absolute left-1/2 top-full z-50 mt-1 w-max max-w-[10rem] -translate-x-1/2 rounded-lg bg-[var(--foreground)] px-2 py-1 text-center text-xs text-[var(--background)] shadow">
          {label}
        </span>
      )}
    </span>
  );
}
