"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";

export type SortableWidgetProps = {
  id: string;
  index: number;
  customizing: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function SortableWidget({
  id,
  index,
  customizing,
  className,
  children,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !customizing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    touchAction: customizing ? "none" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-home-widget
      className={cn(
        "relative flex min-w-0 flex-col",
        customizing && "cursor-grab active:cursor-grabbing",
        className
      )}
      {...attributes}
      {...listeners}
    >
      {customizing && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 rounded border border-[var(--text-primary)]/[0.08] bg-[var(--panel-bg)] p-1 text-[var(--text-muted)] shadow-sm">
          <Icon name="dots-six-vertical" pack="phosphor" className="h-3.5 w-3.5" />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, delay: index * 0.04, ease: EASE_OUT }}
        className={cn(
          "flex h-full min-w-0 flex-col",
          customizing && "pointer-events-none"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
