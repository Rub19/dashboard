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

  const urlReplaceTimerRef = useRef<number | null>(null);
  const navRequestIdRef = useRef(0);

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

  const navigateTo = useCallback(
    (targetInput: string, reason: NavigationReason = "user") => {
      const validCategory = resolveCategory(targetInput);
      const requestId = ++navRequestIdRef.current;

      log("NavigateTo:", validCategory, "Reason:", reason, "Request #", requestId);

      setActiveCategory(validCategory);
      setNavState("IDLE");
      onNavigate?.(validCategory, reason);

      // Smooth scroll container back to top for clean category view
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (typeof window !== "undefined") {
        if (urlReplaceTimerRef.current) window.clearTimeout(urlReplaceTimerRef.current);
        urlReplaceTimerRef.current = window.setTimeout(() => {
          if (window.location.pathname.startsWith("/settings")) {
            window.history.replaceState(null, "", `/settings/${validCategory}`);
          }
        }, 100);
      }
    },
    [log, onNavigate]
  );

  // Synchronize when initialSection changes from URL navigation or browser back/forward
  useEffect(() => {
    if (initialSection) {
      const valid = resolveCategory(initialSection);
      setActiveCategory(valid);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [initialSection]);

  useEffect(() => {
    return () => {
      if (urlReplaceTimerRef.current) window.clearTimeout(urlReplaceTimerRef.current);
    };
  }, []);

  return {
    activeCategory,
    navState,
    navigateTo,
    registerContainerRef,
    registerCategoryRef,
    isProgrammatic: () => false,
  };
}
