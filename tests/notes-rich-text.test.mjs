import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("wordCount and filterNotes strip HTML markup before counting or searching (Node-safe, no DOM dependency)", async () => {
  const { wordCount, filterNotes, stripMarkup } = await import("../v8/pages/notes-model.mjs");
  assert.equal(wordCount("<p>Hello <strong>world</strong></p>"), 2);
  assert.equal(stripMarkup("<p>Hello <em>world</em></p>"), "Hello world");

  const notes = [
    { id: "a", title: "Note", content: "<p>Contains <strong>needle</strong> inside markup</p>", tags: [], pinned: false, updatedAt: "" }
  ];
  assert.equal(filterNotes(notes, "needle").length, 1);
});

test("the rich-text sanitizer allow-lists tags/attributes and strips dangerous content", () => {
  const source = read("v8/ui/rich-text.mjs");
  assert.match(source, /const ALLOWED_TAGS = new Set\(\["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A"\]\);/);
  assert.match(source, /STRIP_ENTIRELY = new Set\(\["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"/);
  assert.match(source, /if \(!ALLOWED_TAGS\.has\(tag\)\) \{[\s\S]*?child\.remove\(\);/);
  assert.match(source, /if \(!allowedAttrs \|\| !allowedAttrs\.has\(attr\.name\.toLowerCase\(\)\)\) child\.removeAttribute\(attr\.name\);/);
  assert.match(source, /if \(!\["http:", "https:", "mailto:"\]\.includes\(url\.protocol\)\) return "";/);
  assert.match(source, /export function sanitizeRichText\(html\) \{/);
  assert.match(source, /export function stripHtml\(html\) \{/);
  assert.match(source, /export function plainTextToHtml\(text\) \{/);
  assert.match(source, /export function createRichTextEditor\(options = \{\}\) \{/);
});

test("pasted HTML is sanitized before insertion, not after, so a live img/onerror or script never touches the DOM", () => {
  const source = read("v8/ui/rich-text.mjs");
  assert.match(source, /function handlePaste\(event\) \{/);
  assert.match(source, /event\.preventDefault\(\);/);
  assert.match(source, /const clean = html \? sanitizeRichText\(html\) : "";/);
  assert.match(source, /document\.execCommand\("insertHTML", false, clean\);/);
  assert.match(source, /body\.addEventListener\("paste", handlePaste\);/);
  assert.match(source, /body\.removeEventListener\("paste", handlePaste\);/);
});

test("the rich-text innerHTML sink is explicitly approved in the security audit allowlist", () => {
  const audit = read("scripts/audit-security.mjs");
  assert.match(audit, /"v8\/ui\/rich-text\.mjs"/);
});

test("the rich-text module is precached by the service worker", () => {
  const sw = read("sw.js");
  assert.match(sw, /"\.\/v8\/ui\/rich-text\.mjs"/);
});

test("Notes page wires the rich-text editor with sanitize-on-load, save-on-input and proper teardown", () => {
  const page = read("v8/pages/notes.mjs");
  assert.match(page, /import \{ createRichTextEditor, toEditableHtml \} from "\.\.\/ui\/rich-text\.mjs";/);
  assert.match(page, /const richEditor = createRichTextEditor\(\{/);
  assert.match(page, /richEditor\.setHTML\(toEditableHtml\(note\.content\)\);/);
  assert.match(page, /const html = richEditor\.getHTML\(\);/);
  assert.match(page, /activeRichEditor\?\.destroy\(\);/);
  assert.match(page, /const snippet = stripMarkup\(note\.content\) \|\| "Aucun contenu";/);
});
