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
    release();
    unmounts += 1;
    return true;
  }

  function mount(id, render) {
    if (!id || typeof render !== "function") {
      throw new TypeError("A lifecycle mount requires an id and render function");
    }

    unmount();
    const result = render();
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
