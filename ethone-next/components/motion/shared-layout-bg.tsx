"use client";
// beui.dev/components/motion/shared-layout-bg

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  useState,
} from "react";
import { EASE_OUT } from "@/lib/ease";
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
    const reduce = useReducedMotion() ?? false;

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
              <AnimatePresence initial={false}>
                {activeId === childKey && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.15, ease: EASE_OUT }}
                    className={cn(
                      "h-full w-full rounded-2xl bg-[var(--accent-primary)]/[0.06]",
                      pillClassName,
                    )}
                  />
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
      <ul
        {...(props as HTMLAttributes<HTMLUListElement>)}
        ref={forwardedRef as Ref<HTMLUListElement>}
        onMouseLeave={handleMouseLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </ul>
    ) : (
      <div
        {...(props as HTMLAttributes<HTMLDivElement>)}
        ref={forwardedRef as Ref<HTMLDivElement>}
        onMouseLeave={handleMouseLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </div>
    );
  },
);
