"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER, sectionCategory } from "./SettingsNavigation";

export type NavigationReason = "user" | "keyboard" | "scroll" | "deep-link" | "search" | "system";

export type NavigationState = "IDLE" | "NAVIGATING";

export type UseSettingsNavigationOptions = {
  initialSection?: string;
  onNavigate?: (id: string, reason: NavigationReason) => void;
  debug?: boolean;
};

export function resolveCategory(value: string | null | undefined): string {
  if (!value) return CATEGORY_ORDER[0].id;
  const match = CATEGORY_ORDER.find((c) => c.id === value);
  if (match) return match.id;
  return sectionCategory(value);
}

export function useSettingsNavigation({
  initialSection,
  onNavigate,
  debug = false,
}: UseSettingsNavigationOptions = {}) {
  const [activeCategory, setActiveCategory] = useState<string>(() => resolveCategory(initialSection));
  const [navState, setNavState] = useState<NavigationState>("IDLE");

  const containerRef = useRef<HTMLElement | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());

  const isProgrammaticRef = useRef(false);
  const scrollLockTimerRef = useRef<number | null>(null);
  const urlReplaceTimerRef = useRef<number | null>(null);
  const scrollDebounceTimerRef = useRef<number | null>(null);
  const navRequestIdRef = useRef(0);
  const mountedRef = useRef(false);

  const log = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debug && process.env.NODE_ENV !== "production") {
        console.log(`[SettingsNav] ${message}`, ...args);
      }
    },
    [debug]
  );

  const registerContainerRef = useCallback((el: HTMLElement | null) => {
    containerRef.current = el;
  }, []);

  const registerCategoryRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      categoryRefs.current.set(id, el);
    } else {
      categoryRefs.current.delete(id);
    }
  }, []);

  const performScrollTo = useCallback(
    (targetCategory: string, requestId: number, instant = false) => {
      const container = containerRef.current;
      if (!container) return;

      const targetEl =
        categoryRefs.current.get(targetCategory) ||
        (container.querySelector(`[data-category="${targetCategory}"]`) as HTMLElement | null) ||
        (container.querySelector(`[data-section="${targetCategory}"]`) as HTMLElement | null);

      if (!targetEl) {
        log("Target element not found for category:", targetCategory);
        isProgrammaticRef.current = false;
        setNavState("IDLE");
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 12;
      const clampedScrollTop = Math.max(0, Math.round(targetScrollTop));

      log("Scrolling to:", targetCategory, "scrollTop:", clampedScrollTop, "instant:", instant);

      if (instant) {
        container.scrollTop = clampedScrollTop;
        isProgrammaticRef.current = false;
        setNavState("IDLE");
        return;
      }

      container.scrollTo({
        top: clampedScrollTop,
        behavior: "smooth",
      });

      const handleScrollEnd = () => {
        if (navRequestIdRef.current === requestId) {
          log("Scroll settled for request #", requestId);
          isProgrammaticRef.current = false;
          setNavState("IDLE");
          if (scrollLockTimerRef.current) {
            window.clearTimeout(scrollLockTimerRef.current);
            scrollLockTimerRef.current = null;
          }
        }
      };

      if ("onscrollend" in window) {
        const onEnd = () => {
          container.removeEventListener("scrollend", onEnd);
          handleScrollEnd();
        };
        container.addEventListener("scrollend", onEnd, { once: true });
      }

      if (scrollLockTimerRef.current) {
        window.clearTimeout(scrollLockTimerRef.current);
      }
      scrollLockTimerRef.current = window.setTimeout(handleScrollEnd, 850);
    },
    [log]
  );

  const navigateTo = useCallback(
    (targetInput: string, reason: NavigationReason = "user") => {
      const validCategory = resolveCategory(targetInput);
      const requestId = ++navRequestIdRef.current;

      log("NavigateTo:", validCategory, "Reason:", reason, "Request #", requestId);

      if (reason !== "scroll") {
        isProgrammaticRef.current = true;
        setNavState("NAVIGATING");
      }

      setActiveCategory(validCategory);
      onNavigate?.(validCategory, reason);

      if (typeof window !== "undefined") {
        if (urlReplaceTimerRef.current) window.clearTimeout(urlReplaceTimerRef.current);
        urlReplaceTimerRef.current = window.setTimeout(() => {
          if (window.location.pathname.startsWith("/settings")) {
            window.history.replaceState(null, "", `/settings/${validCategory}`);
          }
        }, 150);
      }

      if (reason !== "scroll") {
        performScrollTo(validCategory, requestId, false);
      }
    },
    [log, onNavigate, performScrollTo]
  );

  const calculateDominantCategory = useCallback((): string | null => {
    const container = containerRef.current;
    if (!container || categoryRefs.current.size === 0) return null;

    // If reached bottom of scroll container, select the last visible category
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 40) {
      const allEntries = Array.from(categoryRefs.current.entries()).filter(([, el]) => el.isConnected);
      if (allEntries.length > 0) {
        return allEntries[allEntries.length - 1][0];
      }
    }

    const containerRect = container.getBoundingClientRect();
    const focalTop = containerRect.top + 20;
    const focalBottom = containerRect.top + containerRect.height * 0.45;

    let bestCategory: string | null = null;
    let maxOverlap = 0;

    for (const [id, el] of categoryRefs.current.entries()) {
      if (!el.isConnected) continue;
      const rect = el.getBoundingClientRect();

      const overlapTop = Math.max(focalTop, rect.top);
      const overlapBottom = Math.min(focalBottom, rect.bottom);
      const overlap = Math.max(0, overlapBottom - overlapTop);

      if (rect.top <= focalTop && rect.bottom >= focalTop) {
        return id;
      }

      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestCategory = id;
      }
    }

    return bestCategory;
  }, []);

  const handleManualScroll = useCallback(() => {
    if (isProgrammaticRef.current) return;

    if (scrollDebounceTimerRef.current) {
      cancelAnimationFrame(scrollDebounceTimerRef.current);
    }

    scrollDebounceTimerRef.current = requestAnimationFrame(() => {
      if (isProgrammaticRef.current) return;

      const dominant = calculateDominantCategory();
      if (dominant && dominant !== activeCategory) {
        log("ScrollSpy detected dominant category:", dominant);
        setActiveCategory(dominant);
        onNavigate?.(dominant, "scroll");

        if (typeof window !== "undefined") {
          if (urlReplaceTimerRef.current) window.clearTimeout(urlReplaceTimerRef.current);
          urlReplaceTimerRef.current = window.setTimeout(() => {
            if (window.location.pathname.startsWith("/settings")) {
              window.history.replaceState(null, "", `/settings/${dominant}`);
            }
          }, 250);
        }
      }
    });
  }, [activeCategory, calculateDominantCategory, log, onNavigate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleManualScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleManualScroll);
    };
  }, [handleManualScroll]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const initial = resolveCategory(initialSection);
    setActiveCategory(initial);

    const timer = window.setTimeout(() => {
      performScrollTo(initial, 0, true);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [initialSection, performScrollTo]);

  useEffect(() => {
    return () => {
      if (scrollLockTimerRef.current) window.clearTimeout(scrollLockTimerRef.current);
      if (urlReplaceTimerRef.current) window.clearTimeout(urlReplaceTimerRef.current);
      if (scrollDebounceTimerRef.current) cancelAnimationFrame(scrollDebounceTimerRef.current);
    };
  }, []);

  return {
    activeCategory,
    navState,
    navigateTo,
    registerContainerRef,
    registerCategoryRef,
    isProgrammatic: () => isProgrammaticRef.current,
  };
}
