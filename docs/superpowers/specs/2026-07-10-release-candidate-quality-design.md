# ETHONE Release Candidate Quality Design

## Goal

Stabilize and polish the existing ETHONE application without adding features, changing authentication, altering Supabase, or replacing the current architecture.

## Chosen Approach

Use an evidence-driven incremental pass. Existing global systems remain the source of truth: `ETHONEBootManager` for module state, `ETHONELazyModules` for on-demand loading, `ACTION_REGISTRY` for commands, the shared token files for visual rules, and the current page lifecycle for navigation. Corrections target root causes proven by static contracts or browser reproduction; no broad deletion or visual rewrite is allowed.

## Quality Boundaries

1. Runtime: no uncaught reference/type errors, rejected promises, duplicate global shortcuts, or broken lazy groups.
2. Interaction: every visible primary control must dispatch a valid action, native form behavior, or an explicit disabled state.
3. Layout: one primary scroll surface, no horizontal overflow, no invisible click blockers, and bounded overlays at supported viewports.
4. Visual system: existing tokens define surfaces, accent, typography, radii, borders, elevation, focus, and motion. Violet remains reserved for active, focus, and primary actions.
5. Performance: heavy pages stay lazy, closed overlays do not keep session listeners, and recurring work is paused when hidden.

## Validation

- Static contracts for page/action references, lazy group integrity, duplicate IDs, inline handlers, scroll ownership, and component tokens.
- JavaScript syntax checks for all application modules.
- Browser QA at 1920, 1440, 1366, 768, 430, 390, and 360 logical pixels where tooling supports it.
- Login, command palette, sidebar, dashboard, Settings, onboarding, notifications, Marketplace, integrations, and ETHONE AI smoke checks.
- Console collection before and after navigation and keyboard interactions.

## Scope Guard

Incomplete experimental functionality is disabled or marked clearly; it is not completed during this pass. Backend, auth, Supabase, and user data formats remain untouched.
