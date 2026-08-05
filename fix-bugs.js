
const fs = require('fs');

// 1. settings.mjs fixes
let settings = fs.readFileSync('v8/pages/settings.mjs', 'utf-8');
settings = settings.replace(/icon: "maximize-2"/g, 'icon: "maximize"');
settings = settings.replace(/settingRow\("shrink"/g, 'settingRow("minimize"');
settings = settings.replace(/choice\("v8.dock.scale.compact", "shrink"/g, 'choice("v8.dock.scale.compact", "minimize"');
settings = settings.replace(/choice\("v8.dock.scale.large", "expand"/g, 'choice("v8.dock.scale.large", "maximize"');
settings = settings.replace(/choice\("v8.dock.align.stretch", "expand"/g, 'choice("v8.dock.align.stretch", "maximize"');
settings = settings.replace(/choice\("v8.home.hero.compact", "minimize-2"/g, 'choice("v8.home.hero.compact", "minimize"');

// Fix missing createIcons
if (!settings.includes('if (!active) check?.remove();\n        globalThis.lucide?.createIcons?.();')) {
    settings = settings.replace('if (!active) check?.remove();', 'if (!active) check?.remove();\n        globalThis.lucide?.createIcons?.();');
}

fs.writeFileSync('v8/pages/settings.mjs', settings);

// 2. dock.mjs fixes
let dock = fs.readFileSync('v8/ui/dock.mjs', 'utf-8');
dock = dock.replace(/row\("Zoom survol", "maximize-2"/g, 'row("Zoom survol", "maximize"');
// Fix v8DockAutohide to v8DockAutoHide so it maps to data-v8-dock-auto-hide correctly OR fix actions.mjs to use autohide
fs.writeFileSync('v8/ui/dock.mjs', dock);

// 3. actions.mjs
let actions = fs.readFileSync('v8/core/actions.mjs', 'utf-8');
actions = actions.replace(/document.documentElement.dataset.v8DockAutoHide/g, 'document.documentElement.dataset.v8DockAutohide');
fs.writeFileSync('v8/core/actions.mjs', actions);

// 4. shell.css scoping for dock app hover
let shellcss = fs.readFileSync('v8/styles/shell.css', 'utf-8');
shellcss = shellcss.replace(/html\[data-v8-interactions\] body .v8-dock-app:hover:not\(:focus-visible\)/g, 'html[data-v8-interactions]:not([data-v8-dock-magnify="false"]) body .v8-dock-app:hover:not(:focus-visible)');
shellcss = shellcss.replace(/\.v8-dock-app:has\(\+ \.v8-dock-app:hover\),\.v8-dock-app:hover \+ \.v8-dock-app/g, 'html:not([data-v8-dock-magnify="false"]) .v8-dock-app:has(+ .v8-dock-app:hover), html:not([data-v8-dock-magnify="false"]) .v8-dock-app:hover + .v8-dock-app');
fs.writeFileSync('v8/styles/shell.css', shellcss);

console.log('Fixed all bugs!');

