"use client";

import * as React from "react";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PopoverPortalLayout {
  trigger: Rect;
  content: Rect;
}

export function usePopoverPortalPosition(
  triggerRef: React.MutableRefObject<HTMLElement | null>,
  contentRef: React.MutableRefObject<HTMLDivElement | null>,
  ready: boolean,
): PopoverPortalLayout | null {
  const [layout, setLayout] = React.useState<PopoverPortalLayout | null>(null);

  React.useLayoutEffect(() => {
    if (!ready) return;

    function measure() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const content = contentRef.current?.getBoundingClientRect();

      if (!trigger || !content) return;

      setLayout({
        trigger: {
          left: trigger.left,
          top: trigger.top,
          width: trigger.width,
          height: trigger.height,
        },
        content: {
          left: content.left,
          top: content.top,
          width: content.width,
          height: content.height,
        },
      });
    }

    measure();

    const ro = new ResizeObserver(measure);
    if (triggerRef.current) ro.observe(triggerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [ready, triggerRef, contentRef]);

  return layout;
}
