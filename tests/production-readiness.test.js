"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const index = read("index.html");
const boot = read("core/boot.js");
const qaRepair = read("core/qa-repair.js");
const marketplace = read("services/marketplace/runtime.js");
const integrations = read("services/connections/integration-hub.js");
const plugins = read("services/plugins/plugin-hub.js");
const commandPalette = read("components/command-palette.js");
const actions = read("actions/action-registry.js");
const legacyNavigation = read("actions/legacy-navigation.js");
const databaseHome = read("pages/databases/home.js");
const databaseCss = read("pages/databases/style.css");
const settingsV2 = read("pages/settings/settings-v2.js");
const settingsPremium = read("pages/settings/settings-premium.js");
const cloud = read("services/cloud.js");
const consoleHygiene = read("core/console-hygiene.js");
const serviceWorker = read("sw.js");
const versionManifest = JSON.parse(read("data/version-center.json"));
const layoutHarness = read("tests/fixtures/layout-collision-harness.html");
const responsiveHarness = read("tests/fixtures/responsive-harness.html");
const sidebar = read("pages/dashboard/shell.js");
const timelineCss = read("pages/timeline/style.css");
const integrityCss = read("ui/layout-integrity.css");
const finalUx = read("ui/ux-final-polish.js");
const publicExampleFiles = [
  "index.html",
  "services/connections/integration-hub.js",
  "pages/gaming/valorant-connect.js",
  "pages/gaming/hub.js",
  "widgets/github.js"
];

assert.doesNotMatch(index, /showChangelog\s*\(/, "Profile selection still opens the obsolete hardcoded changelog");
assert.doesNotMatch(index, /services\/auth\/legacy\/changelog\.js/, "Obsolete auth changelog is still loaded");
assert.doesNotMatch(index, /v5\.3\.2/, "Profile selection still exposes a stale hardcoded version");
assert.doesNotMatch(index, /v5\.3\.1/, "Authentication still exposes a stale hardcoded version");
assert.match(index, /id="profile-version-label"[^>]*>v1\.0\.0<\/div>/, "Profile selection has no release-version label");
assert.match(index, /class="auth-card-footer">ETHONE\s*<span>·<\/span>\s*v1\.0\.0<\/p>/, "Authentication footer is not aligned with the release version");
assert.equal(fs.existsSync(path.join(root, "services", "auth", "legacy", "changelog.js")), false, "Obsolete changelog module still exists");

assert.doesNotMatch(boot, /keep only the real Rub|const\s+rubs\s*=|ethoneDeleteDuplicateProfilesFromCloud/, "Profile normalization still contains account-specific or destructive cleanup");
assert.match(boot, /const\s+seenIds\s*=\s*new Set\(\)/, "Profile normalization does not deduplicate by stable profile id");
assert.doesNotMatch(boot, /profiles\s*=\s*Array\.from\([^\n]+\)\.slice\(/, "Profile normalization still silently truncates user profiles");

assert.doesNotMatch(qaRepair, /ethone-auto-empty|Page pr[eê]te|cleanProfilesVisual/, "QA runtime still injects fake page content or account-specific UI cleanup");
assert.doesNotMatch(qaRepair, /window\.ethoneCleanProfileList\s*=/, "QA runtime still overrides the canonical profile cleanup API");

for (const relative of ["pages/timeline/index.js", "pages/dashboard-living.js", "pages/personal-os-vision.js", "ui/morning-briefing.js"]) {
  assert.doesNotMatch(read(relative), /["']Rub["']/, `${relative} still exposes a developer-specific fallback user`);
}

assert.match(marketplace, /const\s+CATEGORIES\s*=\s*\["Featured","Themes"\]/, "Production Marketplace still exposes unfinished categories");
assert.match(marketplace, /const\s+catalog\s*=\s*\[\s*\]/, "Production Marketplace still ships fabricated catalog entries");
assert.doesNotMatch(marketplace, />Rating\s*['"+]/, "Marketplace still renders fabricated ratings");
assert.doesNotMatch(marketplace, /downloads\s*\+?\s*["']\s*installs|Downloads["']\s*,\s*entry\.downloads/i, "Marketplace still renders fabricated install counts");
assert.doesNotMatch(marketplace, /reviewSection\s*\(/, "Marketplace still renders fabricated customer reviews");
assert.doesNotMatch(marketplace, /\b(?:rating|downloads|screenshots)\b/, "Marketplace still contains fabricated theme popularity or screenshot metadata");
assert.match(marketplace, /placeholder="Search themes, palettes and styles\.\.\."/, "Marketplace search still advertises unavailable product categories");
assert.doesNotMatch(marketplace, /High-rated|Include widgets, plugins, integrations, themes, layouts, automations/, "Marketplace recommendations still describe removed catalog entries");

assert.match(integrations, /function\s+releaseDefs\s*\(/, "Integration Hub does not isolate production-ready services");
assert.match(integrations, /releaseDefs\(\)\.map\(card\)/, "Integration Hub still renders unfinished connection cards");
assert.match(integrations, /defs\s*:\s*function\s*\(\)\s*\{\s*return\s+releaseDefs\(\)\.slice\(\)/, "Integration Hub API still exposes unfinished services to search and commands");
assert.match(plugins, /function\s+releasePlugins\s*\(/, "Plugin Hub does not isolate production-ready plugins");
assert.match(plugins, /releasePlugins\(\)\.map\(card\)/, "Plugin Hub still renders unfinished plugin cards");

assert.match(index, /data-ethone-lazy-style-group="widget-marketplace widgets"[^>]+widget-marketplace\.css/, "Widget Marketplace CSS still loads with the general Marketplace");
assert.match(index, /data-ethone-lazy-group="widget-marketplace widgets"[^>]+widget-marketplace\.js/, "Widget Marketplace runtime still loads with the general Marketplace");

const commandIntegrations = (commandPalette.match(/const\s+CMD_INTEGRATIONS\s*=\s*\[([\s\S]*?)\n\];/) || ["", ""])[1];
const marketplaceFallbacks = (commandPalette.match(/const\s+CMD_MARKETPLACE_FALLBACKS\s*=\s*\[([\s\S]*?)\n\];/) || ["", ""])[1];
assert.doesNotMatch(commandIntegrations, /Google Calendar|Google Drive|\bOBS\b|YouTube|Battle\.net|Last\.fm/, "Command Palette still indexes integrations that are not part of the production release");
assert.doesNotMatch(marketplaceFallbacks, /Widget Marketplace|Layout Store|Automation Packs|AI Agents/, "Command Palette still exposes unfinished Marketplace categories");
assert.match(commandPalette, /function\s+cmdExperimentalEnabled\s*\(/, "Command Palette has no release gate for experimental commands");
assert.doesNotMatch(commandPalette, /comingSoon\s*:\s*true/, "Command Palette still exposes a known incomplete command");
assert.match(commandPalette, /overlay\.inert\s*=\s*!open/, "Command Palette can remain inert when opened, preventing automatic focus");
assert.doesNotMatch(actions, /Feature coming soon|Fonctionnalite bientot disponible/, "Action Registry still promises unfinished functionality in production");
publicExampleFiles.forEach((relative) => {
  assert.doesNotMatch(read(relative), /Rub19|rub19|squeezie/, `${relative} still exposes developer-specific example data`);
});

assert.match(sidebar, /function\s+sidebarCopy\s*\(/, "Sidebar chrome has no shared localization helper");
assert.match(sidebar, /filter\(id\s*=>\s*id!==currentPage\)/, "Recent pages still duplicate the currently active navigation item");
assert.match(legacyNavigation, /dataset\.section\s*!==\s*['"]recent['"]/, "Navigation does not prefer one canonical non-recent sidebar item");
assert.match(legacyNavigation, /async function loadAccountInfo\(\)[\s\S]*?try\s*\{[\s\S]*?catch\s*\(/, "Account settings can leave a rejected request or permanent loading state");
assert.match(sidebar, /sidebar-section-recent[^\n]+data-page/, "Sidebar does not remove the current route from the rendered recent section");
assert.match(databaseHome, /db-home-empty-icon/, "Database empty state has no finished visual treatment");
assert.match(databaseHome, /list\.length\s*\?[^:]+db-home-card-new/, "Database create card is still duplicated in the empty state");
assert.match(databaseCss, /\.db-home-empty\s*\{[^}]*display\s*:\s*flex/, "Database empty state does not use a stable centered layout");
assert.match(settingsV2, /experimentalEnabled\s*\(/, "Settings does not gate experimental sections in production");
assert.doesNotMatch(settingsV2, />3 tasks|3 tasks\s+[^<]+1 workspace/, "Settings preview still contains fabricated activity data");
assert.doesNotMatch(settingsPremium, /__ethoneAutomationTimer\s*=\s*setInterval/, "Automation starts a permanent timer even when no rules are active");
assert.doesNotMatch(settingsPremium, /ETHONE 2026\.07 \(V28\)/, "Developer settings still expose an obsolete hardcoded build");
assert.doesNotMatch(index, /triggers externes restent[\s\S]{0,100}Coming Soon/, "Settings still exposes incomplete automation copy");
assert.doesNotMatch(cloud, /console\[[^\]]+["']log["'][^\]]*\]/, "Cloud still writes informational fallback messages to the production console");
assert.match(consoleHygiene, /addEventListener\("error"/, "Early runtime errors are not captured by the production diagnostics layer");
assert.match(consoleHygiene, /addEventListener\("unhandledrejection"/, "Unhandled rejections are not captured by the production diagnostics layer");
assert.match(serviceWorker, /2026-07-10-production-v338-readiness/, "Service Worker cache is not aligned with the production build");
assert.equal(versionManifest.metadata.build, "2026.07.10-v338-production-readiness", "Version Center metadata is not aligned with the production build");
assert.equal(versionManifest.versions[0].build, versionManifest.metadata.build, "Latest changelog build differs from Version Center metadata");
assert.match(layoutHarness, /build=338/, "Layout QA harness is not loading the production build");
assert.match(responsiveHarness, /build=338/, "Responsive QA harness is not loading the production build");

assert.match(timelineCss, /#page-activity\s+\.aic-filters\s*\{[\s\S]*?grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)/, "Activity filters are not laid out in stable tracks");
assert.match(timelineCss, /#page-activity\s+\.aic-filter-group\s+button\s*\{[^}]*flex\s*:\s*0\s+0\s+auto/, "Activity filter labels can still be compressed below their content width");
assert.match(integrityCss, /#page-marketplace\s+\.mp41-shell\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)/, "Marketplace grid can still expand beyond its page container");

assert.doesNotMatch(finalUx, /title["']\s*,\s*["']Bientot disponible/, "Disabled controls still receive a misleading Coming Soon tooltip");

const sourceRoots = ["actions", "components", "core", "pages", "services", "state", "ui", "utils", "widgets"];
const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:js|css)$/i.test(entry.name)) sourceFiles.push(absolute);
  }
}
sourceRoots.forEach((relative) => walk(path.join(root, relative)));
const temporaryMarkers = sourceFiles.flatMap((absolute) => {
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  return lines.flatMap((line, index) => /\b(?:TODO|FIXME|HACK|XXX|TBD|WIP)\b/.test(line)
    ? [`${path.relative(root, absolute)}:${index + 1}`]
    : []);
});
assert.deepEqual(temporaryMarkers, [], `Temporary source markers remain: ${temporaryMarkers.join(", ")}`);

console.log("Production readiness: PASS");
