# ETHONE Front-End Architecture

## Compatibility Boundary

ETHONE remains backward compatible with the existing single-page application.
The former inline application has been split into ordered classic-script
modules. Authentication, Supabase, Workers, routing, translations, PWA behavior
and existing global entry points therefore keep their current contracts while
new code uses the shared ETHONE APIs.

## Folders

- `core/`: application registry, boot sequence, events and runtime utilities.
- `ui/`: Design System tokens, reusable primitives and compatibility mappings.
- `pages/`: page-level controllers, shells and rendering.
- `components/`: reusable interface behavior such as modals and search.
- `widgets/`: isolated dashboard widget controllers.
- `services/`: authentication, AI, language, settings and external adapters.
- `state/`: shared observable state and profile state.
- `actions/`: navigation, notifications and user command handlers.
- `utils/`: pure guards and development audit helpers.

## Design System Contract

`ui/tokens.css` is the only source of truth for colors, spacing, radii, shadows,
typography and motion. Legacy CSS variables remain aliases during migration.

`ui/components.css` exposes the reusable `.ui-*` component API:

- layout: `ui-section`, `ui-panel`, `ui-card`, `ui-widget`
- actions: `ui-button` and its variants
- forms: `ui-input`, `ui-search`, `ui-checkbox`, `ui-switch`
- feedback: `ui-badge`, `ui-tag`, `ui-toast`, `ui-progress`
- navigation: `ui-tabs`, `ui-tab`, `ui-sidebar-item`
- layers: `ui-overlay`, `ui-modal`, `ui-dropdown`
- identity: `ui-avatar`

`ui/app.css` maps existing ETHONE selectors to these tokens. Page-specific
compatibility rules live there until their markup can adopt `.ui-*` classes.

`ui/accessibility.js` is the compatibility accessibility layer. It gives
keyboard semantics to legacy clickable surfaces, synchronizes tab and page
ARIA states, labels icon-only controls, associates unlabeled form controls with
their visible placeholder, and describes existing dialogs. New components
should provide these semantics directly in their markup.

## JavaScript Contract

`core/app.js` exposes `window.Ethone`, the module registry used by modern code.
The primary shared modules are:

- `core/events.js`: keyed DOM listeners and application event bus
- `state/store.js`: small observable state container
- `services/storage.js`: guarded persistent storage
- `services/language/index.js`: language state and translation facade
- `services/theme.js`: theme state and application
- `services/settings.js`: settings persistence and change events
- `actions/navigation.js`: navigation and routing facade
- `actions/notifications.js`: notification facade
- `components/registry.js`: reusable component registry
- `widgets/registry.js`: widget lifecycle registry

`core/runtime.js` exposes the compatibility-level `window.EthoneCore`:

- `dom.query`, `dom.queryAll`, `dom.escapeHTML`
- `storage.get`, `storage.set`, `storage.getJSON`, `storage.setJSON`
- `timing.debounce`

Page controllers may consume this API but must not place business state inside
the core module.

`pages/dashboard-v4.js` owns only Dashboard V4 rendering and interactions. It
uses the central event, navigation, notification, language and storage facades.
Its page-specific styles live in `pages/dashboard-v4.css` and consume only
Design System tokens.

## Load Order

`index.html` loads scripts in this order:

1. boot protection and production safeguards
2. `core/runtime.js` and the modern shared facades
3. ordered compatibility modules extracted from the former inline application
4. page experiences and visual enhancement modules

Compatibility modules remain classic scripts on purpose: their original global
lexical scope and execution order are part of the existing application contract.
New modules must register through `window.Ethone` instead of adding new globals.

## Size Policy

- UI controllers and business modules should remain below 300 lines.
- Large static dictionaries may exceed that limit because they contain data,
  not control flow.
- Repeated DOM listeners must use `Ethone.Events.listen()` with a stable key.
- Navigation, notifications, storage, language, theme and settings must use the
  central facades.
- Page-specific CSS belongs beside its page; shared values belong in
  `ui/tokens.css`.

## Migration Rules

1. Preserve existing IDs, global entry points and event contracts.
2. Keep business logic out of UI primitives and rendering functions.
3. Keep Supabase, Worker and external access behind service adapters.
4. Do not add inline scripts or page-specific inline styles to `index.html`.
5. Validate authentication, navigation, responsive layout and console output
   after every extraction.
6. Native interactive elements are mandatory. A clickable `div` is allowed
   only inside the compatibility boundary and must be normalized by
   `ui/accessibility.js`.
