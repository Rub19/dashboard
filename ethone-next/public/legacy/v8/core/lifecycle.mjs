export function createLifecycle() {
  let activeId = null;
  let cleanup = null;
  let mounts = 0;
  let unmounts = 0;

  function unmount() {
    if (typeof cleanup !== "function") {
      activeId = null;
      cleanup = null;
      return false;
    }

    const release = cleanup;
    cleanup = null;
    activeId = null;
    try {
      release();
    } catch (err) {
      if (globalThis.console) globalThis.console.error("Failed to unmount active route:", err);
    }
    unmounts += 1;
    return true;
  }

  function mount(id, render) {
    if (!id || typeof render !== "function") {
      if (globalThis.console) globalThis.console.error("A lifecycle mount requires an id and render function");
      return null;
    }

    unmount();
    let result;
    try {
      result = render();
    } catch (err) {
      if (globalThis.console) globalThis.console.error(`Failed to mount route ${id}:`, err);
      return null;
    }
    activeId = String(id);
    cleanup = typeof result === "function" ? result : null;
    mounts += 1;
    return activeId;
  }

  return Object.freeze({
    mount,
    unmount,
    current: () => activeId,
    stats: () => Object.freeze({
      mounted: activeId ? 1 : 0,
      mounts,
      unmounts
    })
  });
}
