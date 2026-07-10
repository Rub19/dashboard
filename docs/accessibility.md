# ETHONE Accessibility Contract

ETHONE uses two complementary runtimes:

- `ui/accessibility.js` owns landmarks, accessible names, ARIA state, hidden-surface isolation, live regions and overlay diagnostics.
- `ui/keyboard-first.js` owns keyboard activation, roving focus, shortcuts, the skip link and focus modality.

These responsibilities must not be duplicated in page modules.

## Required Behavior

- Inactive pages, forms and overlays use both `aria-hidden="true"` and `inert`.
- The active navigation item uses `aria-current="page"`; inactive items omit `aria-current`.
- Tabs expose `role="tablist"`, `role="tab"`, `aria-selected` and roving `tabindex`.
- Disclosure controls expose `aria-controls` and `aria-expanded`.
- Dialogs trap focus, close with Escape and restore focus to their launcher.
- Native forms retain `type="submit"`; Enter must not depend on an inline handler.
- Non-native legacy actions are promoted once and respond to Enter and Space.
- Status feedback uses a polite live region; blocking errors use an assertive alert region.
- No positive `tabindex` is allowed.

## Global Shortcuts

- `Ctrl+K`: command palette
- `Ctrl+/`: keyboard shortcuts
- `Alt+0`: sidebar focus
- `Alt+M`: main-content focus
- `Alt+1` through `Alt+9`: primary pages
- `Escape`: close the topmost transient layer

## QA

Run the automated contracts:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/accessibility-contract.ps1
node tests/color-contrast.test.js
```

Use `tests/accessibility-harness.html` for browser checks of Enter, Space, arrow navigation, focus trapping, Escape, default dialog actions and focus restoration.

At runtime, `ETHONEAccessibility.audit()` reports unnamed controls, positive tab indexes, active pages, current navigation and open dialogs.
