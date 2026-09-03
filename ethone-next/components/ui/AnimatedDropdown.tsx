"use client";

import { Menu } from "@base-ui/react/menu";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// ─── Motion transitions ────────────────────────────────────────────────────────
const motionTransition = {
  reduced: { duration: 0 },
  spatial: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface DropdownContextValue {
  layoutId: string;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const ctx = useContext(DropdownContext);
  if (!ctx)
    throw new Error(
      "AnimatedDropdown subcomponents must be used within <AnimatedDropdown>",
    );
  return ctx;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AnimatedDropdownProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  modal?: boolean;
}

export interface AnimatedDropdownContentProps {
  children: ReactNode;
  className?: string;
  side?: "bottom" | "top" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export interface AnimatedDropdownItemProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface AnimatedDropdownTriggerProps {
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
}

export interface AnimatedDropdownTriggerIndicatorProps {
  className?: string;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function AnimatedDropdown({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  modal = true,
}: AnimatedDropdownProps) {
  const layoutId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setActiveId(null);
    onOpenChange?.(nextOpen);
  };

  return (
    <DropdownContext.Provider value={{ layoutId, activeId, setActiveId }}>
      <LayoutGroup id={layoutId}>
        <Menu.Root
          open={open}
          defaultOpen={defaultOpen}
          disabled={disabled}
          modal={modal}
          onOpenChange={handleOpenChange}
        >
          {children}
        </Menu.Root>
      </LayoutGroup>
    </DropdownContext.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────
export function AnimatedDropdownTrigger({
  children,
  className,
  "aria-labelledby": ariaLabelledBy,
}: AnimatedDropdownTriggerProps) {
  return (
    <Menu.Trigger
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5",
        "bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm font-medium",
        "hover:cursor-pointer hover:bg-[var(--surface-hover)] transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none",
        "data-[popup-open]:bg-[var(--surface-hover)]",
        className,
      )}
    >
      {children}
    </Menu.Trigger>
  );
}

export function AnimatedDropdownTriggerIndicator({
  className,
}: AnimatedDropdownTriggerIndicatorProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-4 shrink-0 text-[var(--text-muted)]",
        "transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "group-data-[popup-open]:rotate-180 motion-reduce:transition-none",
        className,
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────
export function AnimatedDropdownContent({
  children,
  className,
  side = "bottom",
  align = "center",
  sideOffset = 6,
}: AnimatedDropdownContentProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        style={{ zIndex: 9999 }}
      >
        <Menu.Popup
          className={cn(
            "min-w-[160px] rounded-xl p-1",
            "bg-[var(--panel-bg)] text-[var(--text-primary)] shadow-xl",
            "border border-[var(--panel-border)]",
            "backdrop-blur-xl",
            "origin-[var(--transform-origin)]",
            "transition-[opacity,transform]",
            shouldReduceMotion ? "duration-0" : "duration-150",
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────
export function AnimatedDropdownItem({
  children,
  icon,
  variant = "default",
  disabled,
  onClick,
  className,
}: AnimatedDropdownItemProps) {
  const { layoutId, activeId, setActiveId } = useDropdownContext();
  const itemId = useId();
  const shouldReduceMotion = useReducedMotion();

  const isActive = activeId === itemId;

  return (
    <Menu.Item
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer select-none items-center gap-2.5",
        "rounded-lg px-2.5 py-2 text-sm outline-none",
        "transition-colors duration-75",
        variant === "danger"
          ? "text-[var(--error,#ef4444)]"
          : "text-[var(--text-primary)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onMouseEnter={() => setActiveId(itemId)}
      onFocus={() => setActiveId(itemId)}
      onMouseLeave={() => setActiveId(null)}
      onBlur={() => setActiveId(null)}
    >
      <AnimatePresence>
        {isActive && (
          <motion.span
            layoutId={shouldReduceMotion ? undefined : `${layoutId}-highlight`}
            className={cn(
              "absolute inset-0 rounded-lg",
              variant === "danger"
                ? "bg-[var(--error,#ef4444)]/15"
                : "bg-[var(--accent-primary)]/10",
            )}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              shouldReduceMotion
                ? motionTransition.reduced
                : motionTransition.spatial
            }
          />
        )}
      </AnimatePresence>

      {icon && (
        <span
          className={cn(
            "relative z-10 shrink-0 [&_svg]:size-4",
            variant === "danger"
              ? "text-[var(--error,#ef4444)]"
              : "text-[var(--text-muted)]",
          )}
        >
          {icon}
        </span>
      )}

      <span className="relative z-10 flex-1">{children}</span>
    </Menu.Item>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────
export function AnimatedDropdownSeparator({
  className,
}: {
  className?: string;
}) {
  return (
    <Menu.Separator
      className={cn("my-1 h-px bg-[var(--panel-border)] mx-1", className)}
    />
  );
}
