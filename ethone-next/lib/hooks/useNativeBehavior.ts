"use client";

import { useEffect } from "react";

const EDITABLE_SELECTOR = [
  "input:not([type='button']):not([type='submit']):not([type='reset'])",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[data-native-selection='allow']",
].join(",");

const BROWSER_CONTEXT_SELECTOR = [
  EDITABLE_SELECTOR,
  "a[href]",
  "img",
  "video",
  "audio",
  "[data-native-context='browser']",
].join(",");

const NATIVE_CHROME_SELECTOR = [
  ".v8-topbar",
  ".v8-rail",
  ".v8-status-bar",
  ".v8-floating-dock",
  ".v8-breadcrumbs",
  ".v8-panel__header",
  ".v8-window-controls",
  ".v8-context-menu",
  "[data-native-context='suppress']",
].join(",");

const EXPLICIT_DRAG_SELECTOR = "[draggable='true'],[data-native-drag='allow']";
const DEFAULT_DRAG_SELECTOR = "img,svg,a[href]";

function shouldPreserveBrowserContextMenu(target: Element, shiftKey: boolean, selection: string) {
  if (!target) return true;
  if (shiftKey) return true;
  if (selection.trim()) return true;
  return Boolean(target.closest(BROWSER_CONTEXT_SELECTOR));
}

function shouldPreventBrowserDrag(target: Element) {
  if (!target) return false;
  if (target.closest(EXPLICIT_DRAG_SELECTOR)) return false;
  return Boolean(target.closest(DEFAULT_DRAG_SELECTOR));
}

export function useNativeBehavior() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.dataset.v8NativeUi = "ready";

    function handleDragStart(event: DragEvent) {
      const target = (event.target as HTMLElement)?.closest ? (event.target as Element).closest(DEFAULT_DRAG_SELECTOR) : null;
      if (!target) return;
      if (shouldPreventBrowserDrag(target)) {
        event.preventDefault();
      }
    }

    function handleContextMenu(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const target = (event.target as HTMLElement)?.closest(NATIVE_CHROME_SELECTOR) as Element | null;
      if (!target) return;
      const selection = window.getSelection()?.toString() || "";
      if (shouldPreserveBrowserContextMenu(target, event.shiftKey, selection)) return;
      event.preventDefault();
    }

    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      delete document.documentElement.dataset.v8NativeUi;
    };
  }, []);
}
