# ETHONE Release Candidate Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current ETHONE frontend stable, coherent, responsive, and release-ready without adding features.

**Architecture:** Preserve the existing application shell and use its central boot, lazy loading, action, token, and lifecycle systems. Add narrow QA contracts first, then fix only reproducible defects at their owning layer.

**Tech Stack:** HTML, CSS custom properties, browser JavaScript, PowerShell contract tests, Node syntax/model tests, in-app browser QA.

## Global Constraints

- Do not add new features or redesign the product.
- Do not alter backend, Supabase, authentication, or user-data schemas.
- Preserve current routes and existing functionality.
- Heavy modules remain lazy-loaded.
- Every production correction starts with a failing test or reproducible browser check.

---

### Task 1: Baseline And Integrity Contracts

**Files:**
- Create: `tests/release-candidate-contract.ps1`
- Modify only if defects are proven: `index.html`, `core/lazy-modules.js`, `actions/action-registry.js`

**Interfaces:**
- Consumes: lazy script declarations, `data-page`, inline handler, and action attributes in `index.html`.
- Produces: a deterministic contract reporting missing local assets, duplicate IDs, invalid page targets, and unresolved critical inline handlers.

- [ ] Write the contract and run it to capture the baseline failures.
- [ ] Trace each failure to its owning module and compare with a working pattern.
- [ ] Apply the smallest root correction for each confirmed defect.
- [ ] Re-run the contract and existing suites.

### Task 2: Runtime, Actions, Notifications, And Shortcuts

**Files:**
- Test: `tests/runtime-quality-contract.ps1`
- Modify as proven: `core/boot-sequence.js`, `core/lazy-modules.js`, `services/keyboard-shortcuts.js`, `components/command-palette.js`, `components/toast.js`, `ui/notification-center*.css`

**Interfaces:**
- Consumes: `ACTION_REGISTRY.dispatch(id, context)`, lazy group loader, central toast API.
- Produces: one owner per shortcut, deduplicated notifications, and valid action fallback behavior.

- [ ] Add failing checks for duplicate shortcut ownership and unsafe notification fallbacks.
- [ ] Reproduce console failures in the browser and capture stack traces.
- [ ] Correct only confirmed owners and lifecycle cleanup.
- [ ] Verify Ctrl+K, Escape, primary navigation, toast dismissal, and lazy loading.

### Task 3: Scroll, Sidebar, Overlay, And Responsive Integrity

**Files:**
- Test: `tests/layout-integrity-contract.ps1`
- Modify as proven: `ui/layout-integrity.css`, `ui/os-sidebar.css`, `ui/mobile.css`, affected component styles.

**Interfaces:**
- Consumes: `#main-sidebar`, active page container, overlay/dialog roots.
- Produces: a fixed shell, one navigation scroll surface, bounded overlays, and no horizontal viewport overflow.

- [ ] Reproduce collision/overflow at each target viewport.
- [ ] Add a contract for each reproducible selector or style conflict.
- [ ] Correct ownership of overflow, positioning, pointer events, and z-index.
- [ ] Re-test mouse, keyboard, touch-sized targets, sidebar collapse, and page scrolling.

### Task 4: Visual Token And Component Consistency

**Files:**
- Test: `tests/visual-polish-contract.ps1`
- Modify as proven: `ui/tokens.css`, `ui/design-system-6.css`, `ui/icon-system.css`, `ui/typography-system.css`, component-specific styles.

**Interfaces:**
- Consumes: global CSS custom properties and shared component classes.
- Produces: consistent surfaces, focus, icon sizing, typography, button states, cards, inputs, and reduced motion.

- [ ] Inventory hardcoded high-impact accent/surface values in loaded styles.
- [ ] Add failing checks for unsupported component states or dangerous global overrides.
- [ ] Replace confirmed inconsistencies with existing tokens, preserving page identity.
- [ ] Verify contrast, focus visibility, reduced motion, and responsive text wrapping.

### Task 5: Full Browser QA And Release Evidence

**Files:**
- Update tests only when a newly reproduced regression needs coverage.

**Interfaces:**
- Consumes: complete application served from the local release server.
- Produces: a final QA report with pages tested, defects fixed, files changed, and remaining external limitations.

- [ ] Run all PowerShell and Node tests plus syntax checks for every JavaScript module.
- [ ] Test login/register tabs, Ctrl+K, sidebar, dashboard, Settings, onboarding, notifications, Marketplace, integrations, ETHONE AI, and Mission Control.
- [ ] Test desktop, laptop, tablet, and mobile viewports for horizontal overflow and collision.
- [ ] Inspect console errors/warnings after boot and navigation.
- [ ] Report only claims supported by fresh command and browser evidence.
