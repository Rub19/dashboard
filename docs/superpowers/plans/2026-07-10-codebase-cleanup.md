# ETHONE Codebase Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove proven dead code and duplicated runtime infrastructure while preserving ETHONE behavior and visual output.

**Architecture:** Keep the current classic-script application architecture, but establish clearer boundaries: external application foundation CSS, one shared DOM mutation runtime, and a lightweight onboarding gate. Enforce those boundaries with an executable repository audit.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js built-in test runner utilities, PowerShell contract tests.

## Global Constraints

- Do not modify Supabase, authentication contracts, backend behavior, or routing.
- Preserve all existing user-facing functionality and persisted data.
- Delete files only when runtime reachability is disproved.
- Keep classic script load order deterministic.

---

### Task 1: Repository Audit Contract

**Files:**
- Create: `scripts/codebase-audit.mjs`
- Create: `tests/codebase-cleanup-contract.ps1`

- [ ] Write a failing contract for missing assets, duplicate asset declarations, disabled modules, orphaned source files, and excessive non-critical inline styles.
- [ ] Run the contract and confirm it fails on the current disabled/orphaned modules.
- [ ] Implement the audit using only Node built-ins.
- [ ] Run the audit and preserve its pre-cleanup findings as the deletion evidence.

### Task 2: Remove Proven Dead Implementations

**Files:**
- Delete: `pages/databases/context-menu.js`
- Delete: `pages/databases/dropdown.js`
- Delete: `pages/valorant-accounts/context-menu.js`
- Delete: `pages/valorant-accounts/dropdown.js`
- Delete: `services/ai/brain-33b.js`
- Delete: `services/ai/brain-34.js`
- Delete: `services/ai/brain-os-36.js`
- Delete: `services/ai/brain-platform-35.js`
- Delete: `services/ai/intelligence-33a.js`
- Delete: `actions/legacy-notifications.js`
- Modify: `index.html`

- [ ] Remove the explicitly disabled legacy notification declaration.
- [ ] Delete only the ten files identified by the audit.
- [ ] Run the audit and existing overlay/notification contracts.

### Task 3: Externalize the Application Foundation CSS

**Files:**
- Create: `ui/app-foundation.css`
- Modify: `index.html`

- [ ] Extend the contract to require only three boot-critical inline style blocks.
- [ ] Run it and confirm failure.
- [ ] Extract all later inline style blocks in exact cascade order into `ui/app-foundation.css`.
- [ ] Insert one stylesheet link at the first extracted block's position.
- [ ] Verify selector sentinels, block order, and browser rendering.

### Task 4: Centralize DOM Mutation Observation

**Files:**
- Create: `core/dom-runtime.js`
- Create: `tests/dom-runtime.test.js`
- Modify: `index.html`
- Modify: `ui/accessibility.js`
- Modify: `ui/clarity-polish.js`
- Modify: `ui/icon-system.js`
- Modify: `ui/mobile.js`
- Modify: `ui/ux-final-polish.js`
- Modify: `core/production-hardening.js`

- [ ] Write a failing Node test for named subscriptions, replacement, batching, isolation, and stats.
- [ ] Run it and confirm the missing runtime failure.
- [ ] Implement the minimal shared runtime.
- [ ] Migrate subtree observers while retaining safe fallbacks.
- [ ] Verify one shared subtree observer replaces the six independent observers.

### Task 5: Defer Heavy Onboarding Assets

**Files:**
- Create: `services/onboarding/gate.js`
- Create: `tests/onboarding-gate.test.js`
- Modify: `index.html`
- Modify: `core/lazy-modules.js`

- [ ] Write a failing test for completed, incomplete, dismissed, and What's New states.
- [ ] Implement a side-effect-free `shouldLoad` decision and event-driven loader.
- [ ] Move `first-run.js`, `first-run.css`, and `onboarding-premium-final.css` to the `onboarding` group only.
- [ ] Load the small gate with the dashboard group.
- [ ] Verify first-run and manual replay contracts.

### Task 6: Full Regression Pass

**Files:**
- Modify: `sw.js`
- Update: `docs/superpowers/specs/2026-07-10-codebase-cleanup-design.md` if implementation evidence requires clarification.

- [ ] Run syntax checks for every JavaScript file.
- [ ] Run all PowerShell and Node tests.
- [ ] Run the repository audit.
- [ ] Reload the local application and verify page identity, meaningful content, console health, screenshot fidelity, Ctrl+K, login/register, and responsive overflow.
- [ ] Bump the service-worker cache version after all assets are final.
