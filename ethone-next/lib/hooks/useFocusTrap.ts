import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const container = ref.current;
    const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled")
    );
    const first = elements[0];
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      if (elements.length === 0) return;
      const active = document.activeElement as HTMLElement;
      const currentIndex = elements.indexOf(active);
      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          elements[elements.length - 1].focus();
        }
      } else {
        if (currentIndex === -1 || currentIndex === elements.length - 1) {
          event.preventDefault();
          elements[0].focus();
        }
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  return ref;
}
