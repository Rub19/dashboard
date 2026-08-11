export function useHaptics() {
  function trigger(pattern: number | number[] = 10, enabled = true) {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore unsupported patterns
    }
  }

  return { trigger };
}
