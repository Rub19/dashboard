# ETHONE Memory Leak Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate resource accumulation across repeated page, modal, Space, AI, Marketplace, Settings, and integration lifecycles without changing product behavior.

**Architecture:** Keep ETHONE's current vanilla-JavaScript architecture. Repair ownership at the source: deferred boot listeners clean themselves up, page-scoped work is activated only while its page is visible, integration disconnect actions close their network/timer resources, and modal shutdown always uses the modal lifecycle API.

**Tech Stack:** Browser JavaScript, Node.js VM tests, PowerShell contract tests, existing ETHONE lazy loader and event registry.

## Global Constraints

- Do not modify Supabase, authentication, backend behavior, routing, or the visual design.
- Do not remove existing features.
- Preserve lazy loading and existing public global function contracts.
- Every production fix starts with a failing regression test.

---

### Task 1: Deferred boot listener cleanup

**Files:**
- Modify: `core/safe-mode.js`
- Test: `tests/memory-lifecycle.test.js`

**Interfaces:**
- Consumes: `window.ethoneRunWhenPageReady(key, pages, fn)` and `window.ethoneRunWhenDashboardReady(key, fn)`.
- Produces: the same public APIs with deterministic timer and listener disposal after run or timeout.

- [ ] Write a VM test that registers repeated deferred modules and records active `ethone:page-ready` and `ethone:dashboard-ready` listeners plus polling intervals.
- [ ] Run the test and verify that current listeners remain after completion.
- [ ] Add a single idempotent cleanup function to each deferred registration and call it from success, timeout, and event paths.
- [ ] Re-run the test and verify listener and interval counts return to baseline.

### Task 2: Integration resource cleanup

**Files:**
- Modify: `services/connections/discord.js`
- Modify: `services/connections/lastfm.js`
- Modify: `services/connections/spotify.js`
- Modify: `services/connections/lanyard.js`
- Test: `tests/memory-lifecycle.test.js`

**Interfaces:**
- Consumes: existing connect, refresh, auto-refresh, and disconnect globals.
- Produces: disconnect functions that stop WebSocket reconnects, heartbeat/poll timers, music progress timers, and refresh intervals.

- [ ] Add timer/socket fakes and assert each disconnect returns active resources to zero.
- [ ] Run the tests and verify the current implementation leaks resources.
- [ ] Add idempotent stop helpers and invoke them before deleting connection state.
- [ ] Re-run tests and verify reconnect callbacks cannot revive a disconnected integration.

### Task 3: Page-scoped work

**Files:**
- Modify: `pages/settings/settings-v2.js`
- Modify: `pages/health/index.js`
- Modify: `services/ai/core.js`
- Modify: `services/marketplace/runtime.js`
- Test: `tests/memory-leak-contract.ps1`

**Interfaces:**
- Consumes: `ethone:page-ready` and existing render functions.
- Produces: explicit activate/deactivate paths that preserve singleton boot listeners while removing page-only timers, observers, request controllers, and delegated handlers when inactive.

- [ ] Add contract assertions for start/stop lifecycle functions in each heavy page.
- [ ] Run the contract and verify it fails on the current always-on implementations.
- [ ] Pause the Settings clock outside Settings; disconnect Health performance observers and timers outside Health; cancel pending AI mounts/requests and page handlers outside AI; unbind Marketplace document handlers outside Marketplace.
- [ ] Re-run contracts and targeted VM stress tests.

### Task 4: Modal lifecycle integrity

**Files:**
- Modify: `components/modals.js`
- Modify: `core/ui-isolation.js`
- Test: `tests/memory-leak-contract.ps1`

**Interfaces:**
- Consumes: `openModal(id)` and `closeModal(id)`.
- Produces: `closeAllModals()` and `window.ETHONEModals`, with navigation cleanup routed through the modal API.

- [ ] Add a contract proving UI isolation closes open modals through `closeModal` instead of stripping CSS classes directly.
- [ ] Run the contract and verify failure.
- [ ] Add idempotent bulk close and focus-stack cleanup, then call it from transient UI cleanup.
- [ ] Re-run modal, overlay, and accessibility tests.

### Task 5: Full stress and regression verification

**Files:**
- Modify: `index.html`
- Modify: `sw.js`

**Interfaces:**
- Consumes: updated script assets.
- Produces: cache-busted production delivery of the leak fixes.

- [ ] Run the memory lifecycle tests for repeated page/modal/integration cycles.
- [ ] Run all Node test files, PowerShell contracts, and JavaScript syntax checks.
- [ ] Exercise login shell and available application surfaces in the browser while capturing console errors.
- [ ] Update asset versions and the service-worker cache version, then run the complete verification suite again.
