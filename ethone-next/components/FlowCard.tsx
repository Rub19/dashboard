"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Edit3,
  Copy,
  History,
  MoreVertical,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { Icon } from "@/lib/icons";

type MenuAction = {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
};

export type FlowCardProps = {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconClass?: string;
  steps: string[];
  active?: boolean;
  count?: number;
  running?: boolean;
  widgets?: string[];
  widgetIcons?: Record<string, string>;
  onRun?: () => void;
  onStop?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onLogs?: () => void;
  onDelete?: () => void;
  menuActions?: MenuAction[];
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
};

function PulsingDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

export default function FlowCard({
  title,
  description,
  icon,
  iconClass = "bg-sky-500/10 text-sky-400",
  steps,
  active = false,
  count,
  running = false,
  widgets = [],
  widgetIcons = {},
  onRun,
  onEdit,
  onDuplicate,
  onLogs,
  onDelete,
  menuActions,
  rightAction,
  children,
}: FlowCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const defaultMenu: MenuAction[] = [
    ...(onEdit ? [{ label: "Éditer", icon: "file-edit", onClick: onEdit }] : []),
    ...(onDuplicate ? [{ label: "Dupliquer", icon: "copy", onClick: onDuplicate }] : []),
    ...(onLogs ? [{ label: "Logs", icon: "history", onClick: onLogs }] : []),
    ...(onDelete ? [{ label: "Supprimer", icon: "trash-2", onClick: onDelete, danger: true }] : []),
  ];
  const actions = menuActions?.length ? menuActions : defaultMenu;

  const showFooter = onEdit || onDuplicate || onLogs || onRun || rightAction;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl v8-panel p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-white/15 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] ${iconClass}`}
          >
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-white">{title}</h3>
            <div className="mt-1 flex items-center gap-2">
              {active || running ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <PulsingDot color="bg-emerald-400" />
                  {running ? "En cours" : "Actif"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  En pause
                </span>
              )}
              {typeof count === "number" && count > 0 && (
                <span className="text-[10px] text-zinc-500">
                  {count} run{count > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-white"
            aria-label="Options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl shadow-black/80 backdrop-blur-md">
              {actions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick();
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    a.danger
                      ? "text-red-400 hover:bg-red-500/[0.08]"
                      : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {a.icon && <Icon name={a.icon} className="h-3.5 w-3.5" />}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{description}</p>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <span key={i} className="contents">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono text-zinc-300">
              <span className="text-zinc-500">{i + 1}.</span>
              {step}
            </span>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-zinc-600" />}
          </span>
        ))}
      </div>

      {children}

      {widgets.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {widgets.map((w) => (
            <span
              key={w}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-500"
              title={w}
            >
              <Icon name={widgetIcons[w] || "box"} className="h-3 w-3" />
            </span>
          ))}
        </div>
      )}

      {showFooter && (
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-white"
                aria-label="Éditer"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-white"
                aria-label="Dupliquer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            {onLogs && (
              <button
                type="button"
                onClick={onLogs}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-white"
                aria-label="Logs"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && !onEdit && !onDuplicate && !onLogs && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/[0.08] hover:text-red-400"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {rightAction ||
            (onRun ? (
              <button
                type="button"
                onClick={onRun}
                disabled={running}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  active || running
                    ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    : "bg-white/[0.06] text-zinc-200 hover:bg-white/10"
                }`}
              >
                {running ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                    En cours
                  </>
                ) : active ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Démarrer
                  </>
                )}
              </button>
            ) : null)}
        </div>
      )}
    </div>
  );
}
