export function bindVisibilityRefresh(runtime, poll, options = {}) {
  const doc = runtime?.document;
  const minGapMs = Math.max(1000, Number(options.minGapMs) || 5000);
  if (!doc?.addEventListener) return () => {};
  let lastPollAt = Date.now();
  function trigger() {
    if (doc.hidden) return;
    if (Date.now() - lastPollAt < minGapMs) return;
    lastPollAt = Date.now();
    poll();
  }
  doc.addEventListener("visibilitychange", trigger);
  runtime.addEventListener?.("focus", trigger);
  return () => {
    doc.removeEventListener("visibilitychange", trigger);
    runtime.removeEventListener?.("focus", trigger);
  };
}
