import { WORKSPACES } from "../data/workspaces.mjs";
import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { THEME_MODES } from "./theme-engine.mjs";

export const AUTOMATION_TRIGGER_TYPES = Object.freeze(["route", "space", "time"]);
const MAX_RULES = 20;

const DENSITY_LABELS = Object.freeze({ spacious: "Spacieuse", comfortable: "Confortable", compact: "Compacte", "ultra-compact": "Ultra compacte", automatic: "Automatique" });
const THEME_LABELS = Object.freeze({ night: "Nuit", graphite: "Graphite", day: "Jour", auto: "Automatique" });

export const AUTOMATION_ACTIONS = Object.freeze([
  ...WORKSPACES.map((workspace) => Object.freeze({ id: workspace.actionId, label: `Space ${workspace.label}`, group: "space" })),
  ...Object.keys(DENSITY_LABELS).map((mode) => Object.freeze({ id: `v8.density.${mode}`, label: `Densite ${DENSITY_LABELS[mode]}`, group: "density" })),
  ...THEME_MODES.map((mode) => Object.freeze({ id: `v8.theme.${mode}`, label: `Theme ${THEME_LABELS[mode]}`, group: "theme" }))
]);
const ACTION_IDS = new Set(AUTOMATION_ACTIONS.map((entry) => entry.id));

const ROUTE_IDS = new Set(NAVIGATION_ITEMS.map((item) => item.id));
const SPACE_IDS = new Set(WORKSPACES.map((workspace) => workspace.id));

export function actionLabel(actionId) {
  return AUTOMATION_ACTIONS.find((entry) => entry.id === actionId)?.label || actionId;
}

export function routeLabel(routeId) {
  return NAVIGATION_ITEMS.find((item) => item.id === routeId)?.label || routeId;
}

export function spaceLabel(spaceId) {
  return WORKSPACES.find((workspace) => workspace.id === spaceId)?.label || spaceId;
}

function normalizeTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? String(value) : "";
}

export function sanitizeAutomationTrigger(input) {
  const source = input && typeof input === "object" ? input : {};
  const type = AUTOMATION_TRIGGER_TYPES.includes(source.type) ? source.type : "route";
  if (type === "space") return Object.freeze({ type, value: SPACE_IDS.has(source.value) ? source.value : "focus" });
  if (type === "time") return Object.freeze({ type, value: normalizeTime(source.value) || "09:00" });
  return Object.freeze({ type: "route", value: ROUTE_IDS.has(source.value) ? source.value : "home" });
}

export function triggerLabel(trigger) {
  if (trigger.type === "space") return `Au passage vers ${spaceLabel(trigger.value)}`;
  if (trigger.type === "time") return `Chaque jour a ${trigger.value}`;
  return `A l'ouverture de ${routeLabel(trigger.value)}`;
}

export function sanitizeAutomationRule(input, fallbackId = "") {
  const source = input && typeof input === "object" ? input : {};
  const id = String(source.id || fallbackId || "").slice(0, 60);
  return Object.freeze({
    id,
    enabled: source.enabled !== false,
    trigger: sanitizeAutomationTrigger(source.trigger),
    actionId: ACTION_IDS.has(source.actionId) ? source.actionId : AUTOMATION_ACTIONS[0].id,
    createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now()
  });
}

export function sanitizeAutomationRules(input) {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set();
  const rules = [];
  for (const entry of list) {
    const rule = sanitizeAutomationRule(entry, entry?.id);
    if (!rule.id || seen.has(rule.id)) continue;
    seen.add(rule.id);
    rules.push(rule);
    if (rules.length >= MAX_RULES) break;
  }
  return Object.freeze(rules);
}

export function matchRules(rules, event) {
  return rules.filter((rule) => rule.enabled && rule.trigger.type === event.type && rule.trigger.value === event.value);
}

export function createAutomationWatcher(options = {}) {
  const getRules = typeof options.getRules === "function" ? options.getRules : () => [];
  let previousRoute = null;
  let previousSpace = null;
  let previousMinute = null;

  function prime(state = {}) {
    previousRoute = state.route ?? null;
    previousSpace = state.space ?? null;
    previousMinute = /^\d{2}:\d{2}$/.test(state.localTime || "") ? state.localTime : null;
  }

  function check(state = {}) {
    const fired = [];
    if (state.route !== previousRoute) {
      fired.push(...matchRules(getRules(), { type: "route", value: state.route }));
      previousRoute = state.route;
    }
    if (state.space !== previousSpace) {
      fired.push(...matchRules(getRules(), { type: "space", value: state.space }));
      previousSpace = state.space;
    }
    const minute = /^\d{2}:\d{2}$/.test(state.localTime || "") ? state.localTime : null;
    if (minute && minute !== previousMinute) {
      fired.push(...matchRules(getRules(), { type: "time", value: minute }));
      previousMinute = minute;
    }
    return Object.freeze(fired);
  }

  return Object.freeze({ prime, check });
}
