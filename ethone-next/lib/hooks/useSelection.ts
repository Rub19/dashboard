"use client";

import { useState, useMemo, useCallback } from "react";

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const select = useCallback((id: string) => {
    setSelected((prev) => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);

  return {
    selected,
    selectedItems,
    hasSelection: selected.size > 0,
    isAllSelected: items.length > 0 && selected.size === items.length,
    toggle,
    select,
    deselect,
    selectAll,
    clear,
    isSelected,
  };
}
