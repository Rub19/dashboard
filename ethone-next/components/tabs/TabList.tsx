"use client";

import { useRef, useState, useEffect, useCallback, useId } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import type { TabItem } from "./types";

const SPRING = { duration: 0.15, ease: "easeOut" as const };

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type TabListProps = {
  tabs: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label?: string;
};

export default function TabList({
  tabs,
  activeId,
  onSelect,
  label,
}: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const listId = useId();

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const updateScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateScroll);
  }, [tabs, activeId, updateScroll]);

  useEffect(() => {
    // Keep active tab visible in scroll view
    const tabEl = tabRefs.current.get(activeId);
    const listEl = listRef.current;
    if (!tabEl || !listEl) return;
    const listRect = listEl.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    const isOutOfView = tabRect.left < listRect.left || tabRect.right > listRect.right;
    if (isOutOfView) {
      tabEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeId]);

  function scrollBy(direction: number) {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth * 0.7), behavior: "smooth" });
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const enabledIndex = enabledTabs.findIndex((t) => t.id === tabs[index]?.id);
    if (enabledIndex === -1) return;

    let nextIndex = enabledIndex;
    if (event.key === "ArrowLeft") nextIndex = Math.max(0, enabledIndex - 1);
    else if (event.key === "ArrowRight") nextIndex = Math.min(enabledTabs.length - 1, enabledIndex + 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = enabledTabs.length - 1;
    else return;

    event.preventDefault();
    const next = enabledTabs[nextIndex];
    onSelect(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  const activeTab = tabs.find((t) => t.id === activeId);

  // Mobile with 5+ tabs : compact trigger for a bottom sheet
  if (isMobile && tabs.length >= 5) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="flex w-full items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--foreground)] backdrop-blur-[var(--panel-blur)]"
          aria-haspopup="listbox"
          aria-expanded={showDrawer}
          aria-label={label || "Select tab"}
        >
          <span className="flex items-center gap-2">
            {activeTab?.icon}
            {activeTab?.label}
          </span>
          <Icon name="chevron-down" className="h-4 w-4 text-[var(--muted)]" />
        </button>

        {showDrawer && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--panel-bg)]/50 backdrop-blur-sm"
            onClick={() => setShowDrawer(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SPRING}
              className="w-full max-w-lg rounded-t-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-2xl backdrop-blur-[var(--panel-blur)]"
              onClick={(e) => e.stopPropagation()}
              role="listbox"
              aria-label={label || "Tabs"}
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
              {label && (
                <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {label}
                </p>
              )}
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onSelect(tab.id);
                    setShowDrawer(false);
                  }}
                  disabled={tab.disabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--panel-radius)] px-4 py-3 text-left text-sm font-medium transition-colors",
                    activeId === tab.id
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--foreground)] hover:bg-[var(--panel-bg)]",
                    tab.disabled && "opacity-40 cursor-not-allowed"
                  )}
                  role="option"
                  aria-selected={activeId === tab.id}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-4" role="tablist" aria-label={label || "Tabs"}>
      {/* Edge fade left */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-[var(--background)] to-transparent" />
      )}
      {/* Edge fade right */}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-[var(--background)] to-transparent" />
      )}

      <div
        ref={listRef}
        className={cn(
          "flex gap-1 overflow-x-auto scrollbar-hide",
          isMobile ? "justify-between rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-1" : "nowrap"
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tabs.map((tab, index) => {
          const active = activeId === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`${listId}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${listId}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "relative z-0 flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[var(--panel-radius)] px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                active
                  ? "text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
                tab.disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {active && (
                <div className="absolute inset-0 -z-10 rounded-[var(--panel-radius)] bg-[var(--accent)]" />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {!isMobile && (
        <>
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="absolute -left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--panel-bg)] text-[var(--muted)] shadow-md ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
              aria-label="Scroll tabs left"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="absolute -right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--panel-bg)] text-[var(--muted)] shadow-md ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
              aria-label="Scroll tabs right"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
