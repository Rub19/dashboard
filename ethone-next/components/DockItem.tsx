"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";

export type DockItemProps = {
  icon: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  badge?: number;
  children?: React.ReactNode;
  className?: string;
};

const DockItem = forwardRef<HTMLButtonElement | HTMLAnchorElement, DockItemProps>(
  function DockItem(
    {
      icon,
      label,
      href,
      active,
      onClick,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      draggable,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      "aria-label": ariaLabel,
      "aria-pressed": ariaPressed,
      "aria-expanded": ariaExpanded,
      badge,
      children,
      className = "",
    },
    ref
  ) {
    const [hovered, setHovered] = useState(false);

    const content = (
      <>
        <span className="relative z-10 flex items-center justify-center">
          {children || <Icon name={icon} className="h-5 w-5" />}
        </span>
        {active && (
          <motion.span
            layoutId="active-dot"
            className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        {badge !== undefined && badge > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-zinc-200 shadow-lg backdrop-blur-md"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );

    const baseClass = [
      "group relative flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition-all",
      "hover:bg-white/[0.08] hover:text-white",
      "active:scale-95",
      active ? "text-white" : "",
      className,
    ].join(" ");

    const handlers = {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    };

    if (href) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          onClick={onClick}
          {...handlers}
          className={baseClass}
          aria-label={ariaLabel || label}
          aria-current={active ? "page" : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        {...handlers}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={baseClass}
        aria-label={ariaLabel || label}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
      >
        {content}
      </button>
    );
  }
);

export default DockItem;
