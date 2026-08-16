"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLayer, computeFloatingPosition } from "@/components/LayerProvider";

export type DensityMode = "automatic" | "comfortable" | "compact";

const DENSITY_OPTIONS: { id: DensityMode; label: string; icon: string }[] = [
  { id: "automatic", label: "Densité automatique", icon: "sparkles" },
  { id: "comfortable", label: "Densité confortable", icon: "rows-3" },
  { id: "compact", label: "Densité compacte", icon: "align-justify" },
];

export type SelectionState = Readonly<{
  toggle: (id: string, force?: boolean) => boolean;
  replace: (ids: string[]) => string[];
  prune: (ids: string[]) => string[];
  clear: () => void;
  has: (id: string) => boolean;
  size: () => number;
  values: () => string[];
}>;

export function useSelectionState(initial: string[] = []): SelectionState & { selected: Set<string> } {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.map(String).filter(Boolean))
  );

  const values = useCallback(
    () => Object.freeze([...selected]) as string[],
    [selected]
  );

  const toggle = useCallback(
    (id: string, force?: boolean) => {
      const key = String(id ?? "");
      if (!key) return false;
      setSelected((prev) => {
        const next = new Set(prev);
        const nextValue = typeof force === "boolean" ? force : !next.has(key);
        if (nextValue) next.add(key);
        else next.delete(key);
        return next;
      });
      return typeof force === "boolean" ? force : !selected.has(key);
    },
    [selected]
  );

  const replace = useCallback(
    (ids: string[] = []) => {
      const next = new Set(ids.map(String).filter(Boolean));
      setSelected(next);
      return values();
    },
    [values]
  );

  const prune = useCallback(
    (ids: string[] = []) => {
      const available = new Set(ids.map(String));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of prev) {
          if (!available.has(id)) next.delete(id);
        }
        return next;
      });
      return values();
    },
    [values]
  );

  const clear = useCallback(() => replace([]), [replace]);
  const has = useCallback((id: string) => selected.has(String(id ?? "")), [selected]);
  const size = useCallback(() => selected.size, [selected]);

  return useMemo(
    () => ({
      toggle,
      replace,
      prune,
      clear,
      has,
      size,
      values,
      selected,
    }),
    [toggle, replace, prune, clear, has, size, values, selected]
  );
}

type DenseContentContextValue = {
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
  selection: SelectionState | null;
};

const DenseContentContext = createContext<DenseContentContextValue>({
  density: "automatic",
  setDensity: () => {},
  selection: null,
});

function useDenseContent() {
  return useContext(DenseContentContext);
}

export type DenseContentProps = {
  children: ReactNode;
  density?: DensityMode;
  defaultDensity?: DensityMode;
  onDensityChange?: (mode: DensityMode) => void;
  selectable?: boolean;
  defaultSelected?: string[];
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
};

export default function DenseContent({
  children,
  density: controlledDensity,
  defaultDensity = "automatic",
  onDensityChange,
  selectable = false,
  defaultSelected,
  selected: controlledSelected,
  onSelectionChange,
  className = "",
}: DenseContentProps) {
  const [internalDensity, setInternalDensity] = useState<DensityMode>(defaultDensity);
  const density = controlledDensity ?? internalDensity;

  const internalSelection = useSelectionState(defaultSelected ?? []);

  const setDensity = useCallback(
    (mode: DensityMode) => {
      if (controlledDensity === undefined) setInternalDensity(mode);
      onDensityChange?.(mode);
    },
    [controlledDensity, onDensityChange]
  );

  const value = useMemo<DenseContentContextValue>(() => {
    const selection: SelectionState | null = selectable
      ? controlledSelected
        ? {
            toggle: (id: string, force?: boolean) => {
              const nextIds = new Set(controlledSelected);
              const key = String(id ?? "");
              if (!key) return false;
              const nextValue = typeof force === "boolean" ? force : !nextIds.has(key);
              if (nextValue) nextIds.add(key);
              else nextIds.delete(key);
              onSelectionChange?.([...nextIds]);
              return nextValue;
            },
            replace: (ids: string[]) => {
              onSelectionChange?.(ids);
              return ids;
            },
            prune: (ids: string[]) => {
              const available = new Set(ids.map(String));
              const next = controlledSelected.filter((id) => available.has(id));
              onSelectionChange?.(next);
              return next;
            },
            clear: () => onSelectionChange?.([]),
            has: (id: string) => new Set(controlledSelected).has(String(id ?? "")),
            size: () => controlledSelected.length,
            values: () => [...controlledSelected],
          }
        : {
            toggle: (id: string, force?: boolean) => {
              const result = internalSelection.toggle(id, force);
              onSelectionChange?.(internalSelection.values());
              return result;
            },
            replace: (ids: string[]) => {
              const result = internalSelection.replace(ids);
              onSelectionChange?.(result);
              return result;
            },
            prune: (ids: string[]) => {
              const result = internalSelection.prune(ids);
              onSelectionChange?.(result);
              return result;
            },
            clear: () => {
              internalSelection.clear();
              onSelectionChange?.([]);
            },
            has: internalSelection.has,
            size: internalSelection.size,
            values: internalSelection.values,
          }
      : null;
    return { density, setDensity, selection };
  }, [density, setDensity, selectable, controlledSelected, internalSelection, onSelectionChange]);

  return (
    <DenseContentContext.Provider value={value}>
      <div
        data-v8-dense-content
        data-density={density}
        className={`v8-dense-content ${className}`}
      >
        {children}
      </div>
    </DenseContentContext.Provider>
  );
}

export function CollectionDensityControl({
  value,
  onChange,
  className = "",
}: {
  value?: DensityMode;
  onChange?: (mode: DensityMode) => void;
  className?: string;
}) {
  const i18n = useI18n();
  const ctx = useDenseContent();
  const mode = value ?? ctx.density;
  const setMode = onChange ?? ctx.setDensity;

  return (
    <div
      className={`v8-collection-density inline-flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 ${className} backdrop-blur-[var(--panel-blur)]`}
      role="group"
      aria-label={i18n("listDensity")}
    >
      {DENSITY_OPTIONS.map((entry) => {
        const active = entry.id === mode;
        return (
          <button
            key={entry.id}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)] ${
              active ? "is-active bg-[var(--panel-bg)] text-[var(--accent)]" : ""
            }`}
            aria-label={entry.label}
            aria-pressed={active}
            data-collection-density={entry.id}
            data-tooltip={entry.label}
            onClick={() => setMode(entry.id)}
          >
            <Icon name={entry.icon} className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export function SelectionControl({
  id,
  checked,
  onToggle,
  label,
  className = "",
}: {
  id: string;
  checked?: boolean;
  onToggle?: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  const ctx = useDenseContent();
  const isChecked = checked ?? (ctx.selection?.has(id) ?? false);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      aria-label={label || "Sélectionner"}
      data-collection-select={id}
      className={`v8-selection-control flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)] ${
        isChecked ? "is-selected bg-[var(--accent)]/10 text-[var(--accent)]" : ""
      } ${className} backdrop-blur-[var(--panel-blur)]`}
      onClick={() => {
        if (onToggle) {
          onToggle(!isChecked);
        } else if (ctx.selection) {
          ctx.selection.toggle(id);
        }
      }}
    >
      <Icon name={isChecked ? "check" : "square"} className="h-4 w-4" />
    </button>
  );
}

export type BulkAction = {
  id: string;
  label: string;
  icon?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

export function DenseBulkActionBar({
  count,
  visibleIds,
  selection,
  actions,
  onToggleAll,
  onClear,
  className = "",
}: {
  count?: number;
  visibleIds?: string[];
  selection?: SelectionState | null;
  actions?: BulkAction[];
  onToggleAll?: (next: boolean) => void;
  onClear?: () => void;
  className?: string;
}) {
  const i18n = useI18n();
  const resolvedCount = Math.max(0, count ?? (selection?.size() ?? 0));
  const resolvedVisible = visibleIds ?? selection?.values() ?? [];
  const allSelected =
    resolvedVisible.length > 0 &&
    resolvedVisible.every((id) => selection?.has(id) ?? false);

  return (
    <div
      className={`v8-bulk-bar flex flex-wrap items-center justify-between gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 shadow-lg ${
        resolvedCount ? "" : "hidden"
      } ${className} backdrop-blur-[var(--panel-blur)]`}
      role="toolbar"
      aria-label={i18n("actions")}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <SelectionControl
          id="__all__"
          checked={allSelected}
          label={
            allSelected
              ? "Désélectionner les éléments visibles"
              : "Sélectionner les éléments visibles"
          }
          onToggle={() => {
            if (onToggleAll) {
              onToggleAll(!allSelected);
            } else if (selection) {
              if (allSelected) selection.replace([]);
              else selection.replace(resolvedVisible);
            }
          }}
        />
        <strong aria-live="polite">
          {resolvedCount} élément{resolvedCount > 1 ? "s" : ""}
        </strong>
      </div>

      <div className="v8-bulk-bar__spacer hidden flex-1 md:block" />

      <div className="flex flex-wrap items-center gap-2">
        {(actions ?? []).filter(Boolean).map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            aria-label={action.label}
            onClick={action.onSelect}
            className={`v8-button inline-flex items-center gap-1.5 rounded-[var(--panel-radius)] px-3 py-1.5 text-xs font-medium transition-colors ${
              action.tone === "danger"
                ? "v8-button--danger bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-[var(--panel-bg)] text-[var(--foreground)] hover:bg-[var(--accent)]/10"
            } disabled:opacity-50`}
          >
            {action.icon && <Icon name={action.icon} className="h-3.5 w-3.5" />}
            <span>{action.label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Effacer la sélection"
          onClick={() => {
            if (onClear) onClear();
            else if (selection) selection.clear();
          }}
          className="v8-icon-button flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export type RowMenuItem = {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  hidden?: boolean;
  onSelect?: () => void;
};

export function useRowMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RowMenuItem[]>([]);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | undefined>();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const close = useCallback(() => setOpen(false), []);
  const { isTop } = useLayer(open, close, {
    boundary: menuRef,
    anchor,
    kind: "menu",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    rovingSelector: "button:not([disabled])",
    initialFocus: true,
  });

  useEffect(() => {
    if (!open || !menuRef.current || !anchor) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const position = computeFloatingPosition({
      anchor: anchorRect,
      point,
      floating: menuRect,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      preferred: "bottom-end",
    });
    setPos({ x: position.x, y: position.y });
    menuRef.current.style.maxHeight = `${position.maxHeight}px`;
  }, [open, anchor, point]);

  const openMenu = useCallback(
    (nextAnchor: HTMLElement, nextItems: RowMenuItem[], nextPoint?: { x: number; y: number }) => {
      const visible = nextItems.filter((entry) => entry && !entry.hidden);
      if (!visible.length) return false;
      close();
      setAnchor(nextAnchor);
      setItems(visible);
      setPoint(nextPoint);
      setOpen(true);
      return true;
    },
    [close]
  );

  const RowMenu = useCallback(
    function RowMenuComponent({ label = "Actions" }: { label?: string }) {
      if (!open) return null;
      return (
        <div
          ref={menuRef}
          className="v8-row-menu fixed z-50 min-w-[12rem] max-w-[18rem] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-[var(--shadow)] outline-none backdrop-blur-[var(--panel-blur)]"
          role="menu"
          aria-label={label}
          style={{ left: pos.x, top: pos.y }}
        >
          {items.map((entry) =>
            entry.separator ? (
              <hr
                key={entry.id}
                className="v8-row-menu__separator my-1 border-[var(--panel-border)]"
                role="separator"
              />
            ) : (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                disabled={entry.disabled}
                className={`flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--panel-bg)] focus:bg-[var(--panel-bg)] disabled:opacity-40 disabled:hover:bg-transparent ${
                  entry.danger ? "is-danger text-red-400" : "text-[var(--foreground)]"
                }`}
                onClick={() => {
                  close();
                  entry.onSelect?.();
                }}
              >
                {entry.icon && <Icon name={entry.icon} className="h-4 w-4 text-[var(--muted)]" />}
                <span className="flex-1 truncate">{entry.label}</span>
                {entry.shortcut && (
                  <kbd className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[10px] text-[var(--muted)]">
                    {entry.shortcut}
                  </kbd>
                )}
              </button>
            )
          )}
        </div>
      );
    },
    [open, items, pos, close]
  );

  return { open, isOpen: open, isTop, close, openMenu, RowMenu };
}
