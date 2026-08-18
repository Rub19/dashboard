"use client";
// beui.dev/components/motion/shared-layout-bg

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  isValidElement,
  useId,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface SharedLayoutBgProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /** Semantic container used for the children. */
  as?: "div" | "ul";
  /** Tailwind class applied to the moving pill. Defaults to a subtle accent tint. */
  pillClassName?: string;
  /** Horizontal inset of the pill relative to each row (px). Default 16. */
  inset?: number;
  /** Optional positioning override for the pill wrapper inside each item. */
  pillContainerClassName?: string;
}

export const SharedLayoutBg = forwardRef<HTMLElement, SharedLayoutBgProps>(
  function SharedLayoutBg(
    {
      children,
      as = "div",
      className,
      onMouseLeave,
      pillClassName,
      pillContainerClassName,
      inset = 16,
      ...props
    },
    forwardedRef,
  ) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const uid = useId();
    const reduce = useReducedMotion();

    const pill = activeId !== null ? (
      <motion.div
        layoutId={`shared-bg-${uid}`}
        transition={reduce ? { duration: 0 } : { ...SPRING_LAYOUT, opacity: { duration: 0 } }}
        className={cn(
          "pointer-events-none h-full w-full rounded-2xl bg-[var(--accent)]/[0.06]",
          pillClassName,
        )}
      />
    ) : null;

    const renderedChildren = Children.toArray(children)
      .filter(isValidElement)
      .map((child, index) => {
        const el = child as ReactElement<{
          className?: string;
          onMouseEnter?: () => void;
          children?: ReactNode;
        }>;
        const childKey = el.key ? String(el.key) : `item-${index}`;
        return cloneElement(
          el,
          {
            key: childKey,
            className: cn("relative", el.props.className),
            onMouseEnter: () => {
              el.props.onMouseEnter?.();
              setActiveId(childKey);
            },
          },
          <>
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0",
                pillContainerClassName,
              )}
              style={{ left: -inset, right: -inset }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {activeId === childKey && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: EASE_OUT }}
                    className="h-full w-full"
                  >
                    {pill}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative z-10">{el.props.children}</div>
          </>,
        );
      });

    const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
      setActiveId(null);
      onMouseLeave?.(event);
    };

    return as === "ul" ? (
      <motion.ul
        {...(props as HTMLMotionProps<"ul">)}
        ref={forwardedRef as Ref<HTMLUListElement>}
        layoutRoot
        onMouseLeave={handleMouseLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </motion.ul>
    ) : (
      <motion.div
        {...(props as HTMLMotionProps<"div">)}
        ref={forwardedRef as Ref<HTMLDivElement>}
        layoutRoot
        onMouseLeave={handleMouseLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </motion.div>
    );
  },
);
