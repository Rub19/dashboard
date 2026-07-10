# ETHONE Front-End Architecture

## Runtime Shape

ETHONE is a static, classic-script application. `index.html` owns the document markup and deterministic asset declarations. It does not contain application CSS beyond the three boot-critical anti-flash/safe-mode blocks.

- `ui/app-foundation.css`: preserved base cascade for the existing application markup.
- `ui/tokens.css`, `ui/components.css`: shared design tokens and component primitives.
- `core/`: boot, isolation, lazy loading, event, and DOM lifecycle infrastructure.
- `actions/`: stable user-action and navigation contracts.
- `components/`: reusable overlays, command palette, modal, toast, and input primitives.
- `pages/`: page-owned render and interaction controllers.
- `services/`: cross-page stateful capabilities such as auth, settings, AI, workspaces, and onboarding.
- `state/`: profile/application state adapters.
- `widgets/`: widget controllers registered through `widgets/registry.js`.

## Boot Boundary

The eager path should contain only auth, the core namespace, state/storage adapters, navigation, shell infrastructure, and lightweight global UX behavior. Feature-heavy modules are declared with:

```html
<script type="application/ethone-lazy"
        data-ethone-lazy-group="feature"
        data-src="./path/to/module.js"></script>
```

`core/lazy-modules.js` activates groups in DOM order and keeps their stylesheet cascade position stable.

## DOM Lifecycle

`core/dom-runtime.js` is the single owner of deep child-list observation. Enhancement modules subscribe by stable name:

```js
window.ETHONEDOMRuntime.subscribe("module-name", function (batch) {
  // batch.roots contains newly mounted element roots.
});
```

Registering the same name replaces the previous callback. Subscribers must keep their own work idempotent and bounded. A module may keep a local observer only as a compatibility fallback when `ETHONEDOMRuntime` is unavailable.

## Onboarding Boundary

`services/onboarding/gate.js` is the lightweight dashboard decision layer. It reads the existing profile/local completion markers and loads the `onboarding` group only for an unfinished first run or unread release summary. The full UI remains in `services/onboarding/first-run.js` and its two lazy stylesheets.

## Compatibility Rules

- Route/page IDs, Action Registry IDs, storage keys, and public globals are compatibility contracts.
- Do not delete a file because its name contains `legacy`; first prove that no asset declaration or dynamic loader reaches it.
- Do not append lazy styles to the document head. Activate their existing link elements in place so cascade order remains deterministic.
- Page modules own page logic; global polish modules must stay generic and idempotent.
- New deep MutationObservers are prohibited; use `ETHONEDOMRuntime`.

## Repository Audit

Run:

```powershell
node scripts/codebase-audit.mjs
```

The audit fails for missing local assets, duplicate asset declarations, orphaned JavaScript/CSS files, disabled module declarations, and invalid service-worker boot assets.

The structural contract is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/codebase-cleanup-contract.ps1
```

## Safe Refactoring Order

1. Add or update a contract test.
2. Confirm the test fails for the intended reason.
3. Make the smallest structural change.
4. Run `node --check` on changed JavaScript.
5. Run all contracts.
6. Reload the local app and verify console, layout, and the affected interaction.
