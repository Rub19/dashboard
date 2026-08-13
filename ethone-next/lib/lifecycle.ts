export type LifecycleStats = {
  mounted: 0 | 1;
  mounts: number;
  unmounts: number;
};

export type Lifecycle = {
  mount: (id: string, render: () => unknown | (() => void)) => string | null;
  unmount: () => boolean;
  current: () => string | null;
  stats: () => LifecycleStats;
};

export function createLifecycle(): Lifecycle {
  let activeId: string | null = null;
  let cleanup: (() => void) | null = null;
  let mounts = 0;
  let unmounts = 0;

  function unmount(): boolean {
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

  function mount(id: string, render: () => unknown | (() => void)): string | null {
    if (!id || typeof render !== "function") {
      if (globalThis.console) globalThis.console.error("A lifecycle mount requires an id and render function");
      return null;
    }
    unmount();
    let result: unknown;
    try {
      result = render();
    } catch (err) {
      if (globalThis.console) globalThis.console.error(`Failed to mount route ${id}:`, err);
      return null;
    }
    activeId = String(id);
    cleanup = typeof result === "function" ? (result as () => void) : null;
    mounts += 1;
    return activeId;
  }

  return Object.freeze({
    mount,
    unmount,
    current: () => activeId,
    stats: () => Object.freeze({ mounted: activeId ? 1 : 0, mounts, unmounts }),
  });
}
