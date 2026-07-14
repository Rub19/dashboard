import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createVisualHaptics } from "../v8/ui/visual-haptics.mjs";

function createFixture({ reducedMotion = false } = {}) {
  const attributes = new Map();
  const control = {
    disabled: false,
    inert: false,
    closest: (selector) => selector === "[inert]" ? null : control,
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name)
  };
  const documentListeners = new Map();
  const runtimeListeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const document = {
    documentElement: { dataset: {} },
    addEventListener: (type, listener) => documentListeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    }
  };
  const runtime = {
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener: (type, listener) => runtimeListeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (runtimeListeners.get(type) === listener) runtimeListeners.delete(type);
    },
    setTimeout: (callback, delay) => {
      timerId += 1;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id)
  };
  return { attributes, control, document, documentListeners, runtime, runtimeListeners, timers };
}

test("visual haptics owns one global pointer and keyboard lifecycle", () => {
  const fixture = createFixture();
  const haptics = createVisualHaptics({
    document: fixture.document,
    runtime: fixture.runtime,
    releaseDuration: 240,
    holdLimit: 1000
  });

  assert.equal(haptics.start(), true);
  assert.equal(haptics.start(), false);
  assert.equal(fixture.documentListeners.size, 5);
  assert.equal(fixture.runtimeListeners.size, 1);
  assert.equal(fixture.document.documentElement.dataset.v8Haptics, "ready");
  assert.equal(fixture.document.documentElement.dataset.v8Physics, "spring-friction-v1");
  assert.equal(haptics.diagnostics().physics, "spring-friction-v1");

  fixture.documentListeners.get("pointerdown")({ target: fixture.control, button: 0, isPrimary: true, pointerId: 7 });
  assert.equal(fixture.attributes.get("data-haptic-state"), "pressed");
  assert.equal(haptics.diagnostics().active, true);
  assert.equal(haptics.diagnostics().timers, 1);

  fixture.documentListeners.get("pointerup")({ pointerId: 7 });
  assert.equal(fixture.attributes.get("data-haptic-state"), "released");
  assert.equal(haptics.diagnostics().active, false);
  assert.equal(haptics.diagnostics().releases, 1);
  const [releaseTimerId, releaseTimer] = [...fixture.timers.entries()][0];
  assert.equal(releaseTimer.delay, 240);
  fixture.timers.delete(releaseTimerId);
  releaseTimer.callback();
  assert.equal(fixture.attributes.has("data-haptic-state"), false);

  fixture.documentListeners.get("keydown")({ target: fixture.control, key: " ", repeat: false, isComposing: false });
  assert.equal(fixture.attributes.get("data-haptic-state"), "pressed");
  fixture.documentListeners.get("keyup")({ target: fixture.control, key: " " });
  assert.equal(fixture.attributes.get("data-haptic-state"), "released");

  assert.equal(haptics.destroy(), true);
  assert.equal(haptics.destroy(), false);
  assert.equal(fixture.documentListeners.size, 0);
  assert.equal(fixture.runtimeListeners.size, 0);
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.document.documentElement.dataset.v8Haptics, undefined);
  assert.equal(fixture.document.documentElement.dataset.v8Physics, undefined);
});

test("visual haptics honors reduced motion and ignores disabled controls", () => {
  const reduced = createFixture({ reducedMotion: true });
  const haptics = createVisualHaptics({ document: reduced.document, runtime: reduced.runtime });
  haptics.start();
  reduced.documentListeners.get("pointerdown")({ target: reduced.control, button: 0, pointerId: 1 });
  assert.equal(reduced.attributes.has("data-haptic-state"), false);
  assert.equal(haptics.diagnostics().reducedMotion, true);
  haptics.destroy();

  const disabled = createFixture();
  disabled.control.disabled = true;
  const disabledHaptics = createVisualHaptics({ document: disabled.document, runtime: disabled.runtime });
  disabledHaptics.start();
  disabled.documentListeners.get("pointerdown")({ target: disabled.control, button: 0, pointerId: 1 });
  assert.equal(disabled.attributes.has("data-haptic-state"), false);
  disabledHaptics.destroy();
});

test("visual haptics uses GPU-friendly shared motion primitives", () => {
  const manager = fs.readFileSync(new URL("../v8/ui/visual-haptics.mjs", import.meta.url), "utf8");
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const workspaces = fs.readFileSync(new URL("../v8/styles/workspaces.css", import.meta.url), "utf8");

  assert.doesNotMatch(manager, /requestAnimationFrame|setInterval/);
  for (const primitive of ["impulse", "friction", "momentum", "inertia", "spring", "overshoot", "recoil"]) {
    assert.match(tokens, new RegExp(`--v8-physics-${primitive}:`));
  }
  assert.match(tokens, /--v8-haptic-press-transform:\s*translate3d/);
  assert.match(tokens, /--v8-haptic-spring:\s*var\(--v8-physics-spring\)/);
  assert.match(tokens, /--v8-ease-window:\s*var\(--v8-physics-inertia\)/);
  assert.match(tokens, /--v8-ease-standard:\s*var\(--v8-physics-friction\)/);
  assert.match(components, /data-haptic-state="pressed"[\s\S]*var\(--v8-haptic-press-transform\)/);
  assert.match(components, /@keyframes v8-haptic-release[\s\S]*var\(--v8-physics-recoil\)/);
  assert.match(components, /@keyframes v8-window-haptic-open[\s\S]*62%[\s\S]*82%[\s\S]*transform:/);
  assert.match(components, /@keyframes v8-window-haptic-close[\s\S]*opacity:[\s\S]*transform:/);
  assert.match(shell, /--v8-switch-thumb-x/);
  assert.match(shell, /data-haptic-state="pressed"[\s\S]*scaleX\(1\.14\)/);
  assert.match(shell, /v8-dock-app\[data-haptic-state="pressed"\][\s\S]*v8-dock-app__plate/);
  assert.match(shell, /@keyframes v8-dock-haptic-release[\s\S]*74%/);
  assert.match(workspaces, /@keyframes v8-haptic-check/);
  assert.match(components, /prefers-reduced-motion:\s*reduce[\s\S]*\[data-haptic-state="released"\][\s\S]*animation:\s*none/);
});
