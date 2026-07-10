# ETHONE Codebase Cleanup Design

## Objective

Reduce proven dead code, boot-time work, and duplicated runtime infrastructure without changing authentication, backend behavior, routing, or user-facing features.

## Current Evidence

- `index.html` contains about 12,000 lines, 28 inline style blocks, 231 script declarations, and 90 stylesheet declarations.
- The source tree contains 323 JavaScript/CSS files and 915 `addEventListener` call sites.
- Nine page/AI implementations are absent from every runtime asset declaration.
- `actions/legacy-notifications.js` is explicitly disabled by the document and superseded by Notification Center V2.
- Multiple global polish modules create independent deep `MutationObserver` instances for the same DOM changes.
- The full onboarding runtime and over 100 KB of onboarding CSS are loaded with the dashboard even when onboarding is already complete.

## Architecture

### Document Boundary

`index.html` remains the application document and preserves script order, markup, auth, and routes. Only the three boot-critical style blocks remain inline. The remaining historical foundation cascade moves byte-for-byte into `ui/app-foundation.css`, linked at the original first non-critical style position.

### Shared DOM Runtime

`core/dom-runtime.js` owns one batched, subtree `MutationObserver`. UI enhancement modules subscribe by stable name. Re-registering a name replaces the prior subscriber, and subscriber failures are isolated so one polish layer cannot stop the others.

The runtime exposes `subscribe`, `unsubscribe`, `flush`, and `stats`. Existing module-specific scheduling remains intact; only duplicated DOM observation is centralized.

### Deferred Onboarding

`services/onboarding/gate.js` is the small dashboard-side decision layer. It checks only the existing completion and What's New markers, then asks `ETHONELazyModules` to load the `onboarding` group when necessary. The large onboarding runtime and both onboarding styles belong only to that group. Manual actions continue to load the same group through the Action Registry.

### Dead-Code Policy

A file is removable only when it is absent from all `src`, `data-src`, `href`, and `data-href` declarations and is not imported by another runtime module. Explicitly disabled superseded modules are also removable with their disabled declaration. Dynamic identifiers, global APIs, and route names are not treated as proof of dead code by a basename-only search.

### Audit Contract

`scripts/codebase-audit.mjs` reports missing assets, duplicate declarations, orphaned source files, disabled modules, eager/lazy counts, and inline style counts. It exits non-zero for broken references, duplicates, source orphans, or disabled runtime declarations.

## Compatibility

- Existing global functions, action IDs, page IDs, routes, storage keys, Supabase usage, and auth handlers remain unchanged.
- CSS rule order is preserved during extraction.
- Modules fall back to their local observer only if the shared DOM runtime is unavailable.
- Onboarding state remains profile-aware and uses the existing keys.

## Verification

- New contract tests fail before each structural change and pass afterward.
- All JavaScript files pass `node --check`.
- Existing PowerShell and Node tests remain green.
- Browser QA compares login rendering, console output, overflow, command palette, and a representative interaction before and after the cleanup.

## Non-Goals

- No visual redesign.
- No route, auth, backend, Supabase, or persisted-data migration.
- No deletion based only on naming such as `legacy` or `old`.
- No broad rewrite of large feature modules.

## Implementation Evidence

- Source files with no runtime declaration: reduced from 9 to 0.
- Explicitly disabled runtime declarations: reduced from 1 to 0.
- Inline style blocks: reduced from 28 to 3.
- `index.html`: reduced from about 610 KB to about 206 KB.
- Unused service-worker manifest: removed; `sw.js` reduced from about 10 KB to about 4 KB.
- Deep DOM enhancement observers: consolidated behind one shared runtime, with compatibility fallbacks retained.
- Onboarding runtime and premium CSS: moved off the ordinary dashboard path.
