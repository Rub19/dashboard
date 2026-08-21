"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

export type UseListKeyboardOptions<T> = {
  items: T[];
  onSelect: (item: T, index: number) => void;
  onDelete: (item: T, index: number) => void;
  selectMessage?: string | null;
  deleteMessage?: string | null;
};

export type UseListKeyboardReturn<T> = {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  getItemProps: (index: number) => {
    "data-active": boolean;
    "data-index": number;
  };
  activeItem: T | null;
};

export function useListKeyboard<T>({
  items,
  onSelect,
  onDelete,
  selectMessage,
  deleteMessage,
}: UseListKeyboardOptions<T>): UseListKeyboardReturn<T> {
  const [activeIndex, setActiveIndex] = useState(-1);
  const { success } = useToast();

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(-1);
      return;
    }
    if (activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [items, activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev === -1 ? 0 : (prev + 1) % items.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev === -1 ? items.length - 1 : (prev - 1 + items.length) % items.length
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const item = items[activeIndex];
        onSelect(item, activeIndex);
        if (selectMessage !== null) {
          success(selectMessage ?? "Sélectionné");
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        activeIndex >= 0
      ) {
        e.preventDefault();
        const item = items[activeIndex];
        onDelete(item, activeIndex);
        if (deleteMessage !== null) {
          success(deleteMessage ?? "Supprimé");
        }
        if (items.length > 1) {
          setActiveIndex((prev) => Math.min(prev, items.length - 2));
        } else {
          setActiveIndex(-1);
        }
      }
    },
    [items, activeIndex, onSelect, onDelete, selectMessage, deleteMessage, success]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      "data-active": index === activeIndex,
      "data-index": index,
    }),
    [activeIndex]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps,
    activeItem: activeIndex >= 0 ? items[activeIndex] ?? null : null,
  };
}
