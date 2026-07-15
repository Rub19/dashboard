import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("non-nominal states use one semantic and accessible primitive", () => {
  const source = read("v8/ui/empty-state.mjs");
  const styles = read("v8/styles/components.css");
  for (const kind of ["empty", "no-results", "loading", "error", "offline", "denied", "expired", "integration", "coming-soon", "syncing"]) {
    assert.match(source, new RegExp(`(?:"${kind}"|${kind}):`), `missing ${kind} state`);
  }
  assert.match(source, /role:\s*options\.role \|\| \(urgent \? "alert" : "status"\)/);
  assert.match(source, /"aria-busy":\s*busy \? "true" : null/);
  assert.match(source, /export function skeletonState/);
  assert.match(styles, /\.v8-state-skeleton\s*\{[\s\S]*min-height:/);
  assert.match(styles, /\.v8-state-skeleton__grid[\s\S]*grid-template-columns:/);
  for (const layout of ["activity", "connections", "brain", "settings"]) {
    assert.match(source, new RegExp(`${layout}:"`), `missing ${layout} skeleton`);
    assert.match(styles, new RegExp(`v8-state-skeleton--${layout}`), `missing ${layout} skeleton styles`);
  }
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*v8-skeleton::after/);
});

test("ad hoc product states were migrated without dead styling", () => {
  const app = read("v8/app/app-runtime.mjs");
  const feature = read("v8/pages/feature-fallback.mjs");
  const login = read("v8/entry/login.mjs");
  const files = read("v8/pages/files.mjs");
  const sources = [
    read("v8/pages/activity.mjs"),
    read("v8/pages/brain.mjs"),
    read("v8/pages/connections.mjs"),
    read("v8/pages/settings.mjs"),
    read("v8/ui/mission-control.mjs")
  ].join("\n");
  const css = [read("v8/styles/activity.css"), read("v8/styles/shell.css")].join("\n");
  assert.match(app, /activity:"activity",connections:"connections",brain:"brain",settings:"settings"/);
  assert.match(app, /skeletonState\(\{ layout: layouts\[route\] \|\| "page"/);
  assert.match(feature, /statusState\(unavailable \? "error" : "coming-soon"/);
  assert.match(login, /statusState\(globalThis\.navigator\?\.onLine === false \? "offline" : "error"/);
  assert.match(files, /statusState\("coming-soon"/);
  assert.doesNotMatch(files, /Coming Soon dans ETHONE/);
  assert.match(sources, /statusState\("loading"/);
  assert.match(sources, /statusState\("integration"/);
  assert.doesNotMatch(sources, /v8-brain-empty|v8-settings-memory-empty|v8-connection-diagnostic-empty|v8-now-connect/);
  assert.doesNotMatch(css, /v8-migration-surface|v8-lazy-page__grid|v8-brain-empty|v8-settings-memory-empty|v8-connection-diagnostic-empty|v8-now-connect/);
});

test("form system centralizes every control state, validation and submission guard", () => {
  const source = read("v8/ui/form-system.mjs");
  const app = read("v8/app/app-runtime.mjs");
  const styles = read("v8/styles/components.css");
  for (const name of ["prepareFormControls", "formField", "passwordControl", "setFieldState", "clearFieldState", "validateControl", "validateForm", "setFormStatus", "enhanceForm", "runFormSubmission"]) {
    assert.match(source, new RegExp(`export (?:async )?function ${name}`));
  }
  for (const kind of ["checkbox", "radio", "range", "file", "switch", "textarea", "select"]) assert.match(source, new RegExp(`"${kind}"`));
  assert.match(source, /const pendingForms = new WeakSet\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /control\.dataset\.formEngaged = "true"/);
  assert.match(source, /control\.dataset\.formEngaged === "true" \|\| control\.dataset\.touched === "true" \|\| hasValue\(control\)/);
  assert.match(source, /form\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /button\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /button\.classList\.add\("is-loading"\)/);
  assert.match(source, /controls\.forEach\(\(control\) =>/);
  assert.match(source, /firstInvalid/);
  assert.match(source, /root\.querySelectorAll\("form"\).*form\.noValidate = true/);
  assert.match(source, /control\.validity\?\.valid\s*\?\?\s*control\.checkValidity\(\)/);
  assert.match(source, /control\.validity\?\.customError/);
  assert.match(source, /setSelectionRange\?\./);
  assert.doesNotMatch(source, /MutationObserver|setInterval|setTimeout/);
  assert.equal((app.match(/enhanceForm\(root\)/g) || []).length, 1);
  assert.match(app, /prepareFormControls\(shell\.stage\)/);
  assert.match(styles, /\.v8-form-field__meta\s*\{[\s\S]*height:\s*32px/);
  assert.match(styles, /-webkit-line-clamp:\s*2/);
  assert.match(styles, /data-field-state="invalid"/);
  assert.match(styles, /\.v8-input:read-only/);
  assert.match(styles, /\.v8-input:disabled/);
  assert.match(styles, /\.v8-file-input::file-selector-button/);
  assert.match(styles, /\.v8-radio:checked/);
  assert.match(styles, /\.v8-form-password__toggle/);
  assert.match(source, /className: "v8-form-field__control"/);
  assert.match(source, /body = \[fieldLabel, controlFrame\]/);
  assert.match(styles, /\.v8-form-field__control\s*\{[\s\S]*border:\s*1px solid var\(--v8-form-border\)/);
  assert.match(styles, /\.v8-form-field > \.v8-form-field__label\s*\{[\s\S]*margin:\s*0 0 var\(--v8-form-label-gap\)/);
  assert.match(styles, /\.v8-form-field__control \.v8-input\s*\{[\s\S]*border:\s*0/);
  assert.match(styles, /\.v8-form-field:focus-within \.v8-form-field__control\s*\{[\s\S]*var\(--v8-form-focus-ring\)/);
  assert.doesNotMatch(styles, /\.v8-form-field\[data-field-state="invalid"\] \.v8-input[^\n]*border-width:\s*2px/);
});

test("all major product forms use the shared field, status and submission contracts", () => {
  const login = read("v8/entry/login.mjs");
  const recovery = read("v8/entry/password-recovery.mjs");
  const profile = read("v8/entry/profile-selection.mjs");
  const settings = read("v8/pages/settings.mjs");
  const connections = read("v8/pages/connections.mjs");
  const entries = [login, recovery, profile].join("\n");
  const workspaces = [read("v8/pages/tasks.mjs"), read("v8/pages/calendar.mjs"), read("v8/pages/files.mjs"), read("v8/pages/brain.mjs")].join("\n");
  assert.match(entries, /enhanceForm\(/);
  assert.match(entries, /runFormSubmission\(/);
  assert.match(entries, /validateControl\(/);
  assert.match(login, /passwordControl\(/);
  assert.match(recovery, /passwordControl\(/);
  assert.match(profile, /formField\(\{ label: "Nom"/);
  assert.doesNotMatch(profile, /submit\.classList\.add\("is-loading"\)/);
  assert.match(workspaces, /formField\(\{ label:/);
  assert.ok((workspaces.match(/runFormSubmission\(/g) || []).length >= 5);
  assert.match(workspaces, /validateForm\(form\)|validateControl\(title/);
  assert.match(workspaces, /attributes:\s*\{ type: "submit" \}/);
  assert.match(settings, /prepareFormControls\(page\)/);
  assert.match(settings, /setFormStatus\(settingsSaveStatus/);
  assert.match(settings, /aria-describedby/);
  assert.match(connections, /formField\(\{/);
  assert.match(connections, /setCustomValidity\?\.\(reference\.message\)/);
  assert.doesNotMatch(entries, /reportValidity\(/);
});
