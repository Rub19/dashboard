"use client";

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
import {
  AnimatedDropdown,
  AnimatedDropdownTrigger,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
} from "@/components/ui/AnimatedDropdown";

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

function PulsingDot({ color = "bg-[var(--accent-primary)]" }: { color?: string }) {
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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/[0.08] ${iconClass}`}
          >
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</h3>
            <div className="mt-1 flex items-center gap-2">
              {active || running ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  <PulsingDot color="bg-[var(--accent-primary)]" />
                  {running ? "En cours" : "Actif"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-[var(--text-primary)]/[0.03] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  En pause
                </span>
              )}
              {typeof count === "number" && count > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {count} run{count > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {actions.length > 0 && (
          <AnimatedDropdown>
            <AnimatedDropdownTrigger
              className="h-8 w-8 p-0 rounded-lg bg-transparent text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)] shadow-none"
              aria-label="Options"
            >
              <MoreVertical className="h-4 w-4" />
            </AnimatedDropdownTrigger>
            <AnimatedDropdownContent side="bottom" align="end" sideOffset={4} className="min-w-[150px]">
              {actions.map((a, i) => (
                <AnimatedDropdownItem
                  key={i}
                  icon={a.icon ? <Icon name={a.icon} className="h-3.5 w-3.5" /> : undefined}
                  variant={a.danger ? "danger" : "default"}
                  onClick={a.onClick}
                >
                  {a.label}
                </AnimatedDropdownItem>
              ))}
            </AnimatedDropdownContent>
          </AnimatedDropdown>
        )}
      </div>


      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <span key={i} className="contents">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] px-2.5 py-1 text-[11px] font-mono text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">{i + 1}.</span>
              {step}
            </span>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />}
          </span>
        ))}
      </div>

      {children}

      {widgets.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {widgets.map((w) => (
            <span
              key={w}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] text-[var(--text-muted)]"
              title={w}
            >
              <Icon name={widgetIcons[w] || "box"} className="h-3 w-3" />
            </span>
          ))}
        </div>
      )}

      {showFooter && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--text-primary)]/[0.05] pt-3">
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                aria-label="Éditer"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                aria-label="Dupliquer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            {onLogs && (
              <button
                type="button"
                onClick={onLogs}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                aria-label="Logs"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && !onEdit && !onDuplicate && !onLogs && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/[0.08] hover:text-[var(--danger)]"
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
                    ? "bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                    : "bg-[var(--text-primary)]/[0.06] text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
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
