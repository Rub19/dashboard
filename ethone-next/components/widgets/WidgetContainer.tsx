"use client";

import React, { Component, useTransition, type ReactNode } from "react";
import {
  MoreHorizontal,
  Settings,
  Pin,
  PinOff,
  Star,
  EyeOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { getWidgetManifest, type WidgetSize } from "@/lib/widget-registry";
import {
  AnimatedDropdown,
  AnimatedDropdownTrigger,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownSeparator,
} from "@/components/ui/AnimatedDropdown";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Widget Error]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
          <p className="text-xs font-bold text-rose-300">
            {this.props.fallbackTitle || "Erreur du widget"}
          </p>
          <p className="max-w-[240px] text-[11px] text-zinc-400">
            {this.state.error?.message || "Une erreur inattendue est survenue dans ce composant."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-1 rounded-xl bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type WidgetContainerProps = {
  id: string;
  size?: WidgetSize;
  pinned?: boolean;
  favorite?: boolean;
  onResize?: (size: WidgetSize) => void;
  onPin?: () => void;
  onFavorite?: () => void;
  onConfigure?: () => void;
  onHide?: () => void;
  onRemove?: () => void;
  onRefresh?: () => void;
  className?: string;
  children: ReactNode;
};

export default function WidgetContainer({
  id,
  size = "medium",
  pinned = false,
  favorite = false,
  onResize,
  onPin,
  onFavorite,
  onConfigure,
  onHide,
  onRemove,
  onRefresh,
  className,
  children,
}: WidgetContainerProps) {
  const [isRefreshing, startTransition] = useTransition();
  const manifest = getWidgetManifest(id);

  const handleRefreshClick = () => {
    startTransition(() => {
      onRefresh?.();
    });
  };

  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)]/70 bg-[var(--panel-bg)]/80 backdrop-blur-xl shadow-xs transition-all duration-200",
        className
      )}
    >
      {/* Widget Header Controls */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--panel-border)]/50 px-3 select-none">
        <div className="flex items-center gap-2 truncate">
          {manifest?.icon && (
            <Icon
              name={manifest.icon}
              className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]"
            />
          )}
          <span className="truncate text-xs font-bold text-[var(--text-primary)]">
            {manifest?.name || id}
          </span>
          {manifest?.realtime && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
              title="Flux en temps réel actif"
            />
          )}
          {pinned && (
            <span title="Épinglé">
              <Pin className="h-3 w-3 text-[var(--accent-primary)] shrink-0" />
            </span>
          )}
        </div>

        {/* Quick Menu Trigger */}
        <AnimatedDropdown>
          <AnimatedDropdownTrigger
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            aria-label="Options du widget"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </AnimatedDropdownTrigger>

          <AnimatedDropdownContent side="bottom" align="end" sideOffset={4}>
            {manifest?.configurable && onConfigure && (
              <AnimatedDropdownItem icon={<Settings className="h-3.5 w-3.5 text-[var(--accent-primary)]" />} onClick={onConfigure}>
                Configurer
              </AnimatedDropdownItem>
            )}

            {onRefresh && (
              <AnimatedDropdownItem icon={<RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-[var(--accent-primary)]")} />} onClick={handleRefreshClick}>
                Actualiser
              </AnimatedDropdownItem>
            )}

            {onPin && (
              <AnimatedDropdownItem icon={pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} onClick={onPin}>
                {pinned ? "Désépingler" : "Épingler"}
              </AnimatedDropdownItem>
            )}

            {onFavorite && (
              <AnimatedDropdownItem icon={<Star className={cn("h-3.5 w-3.5", favorite ? "text-amber-400 fill-amber-400" : "")} />} onClick={onFavorite}>
                {favorite ? "Retirer des favoris" : "Favori"}
              </AnimatedDropdownItem>
            )}

            {(onHide || onRemove) && <AnimatedDropdownSeparator />}

            {onHide && (
              <AnimatedDropdownItem icon={<EyeOff className="h-3.5 w-3.5" />} onClick={onHide}>
                Masquer
              </AnimatedDropdownItem>
            )}

            {onRemove && (
              <AnimatedDropdownItem variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onRemove}>
                Retirer
              </AnimatedDropdownItem>
            )}
          </AnimatedDropdownContent>
        </AnimatedDropdown>
      </div>

      {/* Widget Body with Error Boundary */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <WidgetErrorBoundary fallbackTitle={manifest?.name}>
          {children}
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
