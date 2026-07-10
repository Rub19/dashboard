const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(file) {
  const documentListeners = Object.create(null);
  const windowListeners = Object.create(null);
  const document = {
    addEventListener(type) {
      documentListeners[type] = (documentListeners[type] || 0) + 1;
    },
    body: { appendChild() {} },
    createElement() { return {}; },
    getElementById() { return null; }
  };
  const window = {
    addEventListener(type) {
      windowListeners[type] = (windowListeners[type] || 0) + 1;
    }
  };
  const context = vm.createContext({ document, window, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  return { documentListeners, windowListeners, window };
}

const dropdown = load("components/dropdown.js");
assert.equal(dropdown.documentListeners.mousedown, 1, "dropdown controllers must share the document pointer listener");
assert.equal(dropdown.documentListeners.keydown, 1, "dropdown controllers must share the document keyboard listener");
assert.equal(dropdown.windowListeners.resize, 1, "dropdown controllers must share the resize listener");
assert.equal(dropdown.windowListeners.scroll, 1, "dropdown controllers must share the scroll listener");
assert.equal(typeof dropdown.window.dbOpenDropdown, "function");
assert.equal(typeof dropdown.window.vaOpenDropdown, "function");

const contextMenu = load("components/context-menu.js");
assert.equal(contextMenu.documentListeners.mousedown, 1, "context menus must share the document pointer listener");
assert.equal(contextMenu.documentListeners.keydown, 1, "context menus must share the document keyboard listener");
assert.equal(contextMenu.windowListeners.scroll, 1, "context menus must share the scroll listener");
assert.equal(contextMenu.windowListeners.resize, 1, "context menus must share the resize listener");
assert.equal(typeof contextMenu.window.dbOpenContextMenu, "function");
assert.equal(typeof contextMenu.window.vaOpenContextMenu, "function");

console.log("Shared overlay listeners: PASS");
