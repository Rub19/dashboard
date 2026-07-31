import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
const workspaces = fs.readFileSync(new URL("../v8/styles/workspaces.css", import.meta.url), "utf8");

test("responsive typography exposes one semantic clamp scale", () => {
  for (const token of ["caption", "label", "body-sm", "body", "card-title", "h3", "h2", "h1", "hero"]) {
    assert.match(tokens, new RegExp(`--v8-type-${token}:\\s*clamp\\(`));
  }
  assert.match(tokens, /--v8-font-micro:\s*var\(--v8-type-caption\)/);
  assert.match(tokens, /--v8-font-3xl:\s*var\(--v8-type-h1\)/);
  assert.match(base, /body\s*\{[^}]*font-size:\s*var\(--v8-type-body\)/s);
  assert.match(base, /h1\s*\{[^}]*font-size:\s*var\(--v8-type-h1\)/s);
  assert.match(base, /h2\s*\{[^}]*font-size:\s*var\(--v8-type-h2\)/s);
  assert.match(base, /h3\s*\{[^}]*font-size:\s*var\(--v8-type-h3\)/s);
});

test("screen classes tune type without coupling content to viewport units", () => {
  assert.match(tokens, /@media \(max-width:1366px\), \(max-height:800px\)[\s\S]*--v8-type-display-adjust:\s*-0\.375rem/);
  assert.match(tokens, /@media \(max-width:820px\)[\s\S]*--v8-type-display-adjust:\s*-0\.75rem/);
  assert.match(tokens, /@media \(max-width:430px\)[\s\S]*--v8-type-display-adjust:\s*-1rem/);
  assert.match(tokens, /@media \(min-width:2200px\)[\s\S]*--v8-type-body-adjust:\s*0\.0625rem/);
  assert.match(entry, /\.v8-entry__title\s*\{[^}]*font-size:\s*var\(--v8-type-hero\)/s);
  assert.match(shell, /\.v8-page-heading h1\s*\{[^}]*font-size:\s*var\(--v8-type-h1\)/s);
  assert.match(workspaces, /\.v8-note-title\s*\{[^}]*font-size:\s*var\(--v8-type-h1\)/s);
  assert.doesNotMatch(shell, /\.v8-page-heading h1\s*\{[^}]*font-size:\s*clamp\([^}]*vw/s);
  assert.doesNotMatch(entry, /\.v8-entry__title\s*\{[^}]*font-size:\s*clamp\([^}]*vw/s);
  assert.doesNotMatch(workspaces, /\.v8-note-title\s*\{[^}]*font-size:\s*clamp\([^}]*vw/s);
  assert.doesNotMatch([base, components, entry, shell, workspaces].join("\n"), /font-size:\s*clamp\([^;]*(?:vw|vh|vmin|vmax)/);
});

test("reading measures keep headings and prose comfortable", () => {
  for (const [token, value] of [["hero", "18ch"], ["title", "28ch"], ["compact", "42ch"], ["copy", "62ch"], ["longform", "74ch"]]) {
    assert.match(tokens, new RegExp(`--v8-measure-${token}:\\s*${value}`));
  }
  assert.match(shell, /\.v8-page-heading p\s*\{[^}]*max-inline-size:\s*var\(--v8-measure-copy\)/s);
  assert.match(entry, /\.v8-entry__brand-line\s*\{[^}]*max-inline-size:\s*var\(--v8-measure-compact\)/s);
  assert.match(workspaces, /\.v8-rich-text\s*\{[^}]*max-inline-size:\s*var\(--v8-measure-longform\)/s);
  assert.match(components, /\.v8-empty-state__copy\s*\{[^}]*--v8-measure-compact/s);
  assert.match(base, /h1,[\s\S]*hyphens:\s*none[\s\S]*word-break:\s*normal/);
});
