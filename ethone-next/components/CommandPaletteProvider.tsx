"use client";

import { createContext, useContext, useMemo, useState } from "react";
import CommandPalette from "@/components/CommandPalette";

const CommandPaletteContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export const useCommandPalette = () => useContext(CommandPaletteContext);

export default function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}
