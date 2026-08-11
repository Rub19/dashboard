export const AUTOMATION_TRIGGER_TYPES = ["route", "space", "time"] as const;

const NAVIGATION = ["home", "notes", "tasks", "calendar", "files", "activity", "connections", "spaces", "flows", "brain", "settings"] as const;
const SPACES = ["personal", "focus", "studio"] as const;

export const AUTOMATION_ACTIONS = Object.freeze([
  Object.freeze({ id: "v8.space.personal", label: "Space Personnel", group: "space" }),
  Object.freeze({ id: "v8.space.focus", label: "Space Focus", group: "space" }),
  Object.freeze({ id: "v8.space.studio", label: "Space Studio", group: "space" }),
  Object.freeze({ id: "v8.density.spacious", label: "Densité Spacieuse", group: "density" }),
  Object.freeze({ id: "v8.density.comfortable", label: "Densité Confortable", group: "density" }),
  Object.freeze({ id: "v8.density.compact", label: "Densité Compacte", group: "density" }),
  Object.freeze({ id: "v8.density.ultra-compact", label: "Densité Ultra compacte", group: "density" }),
  Object.freeze({ id: "v8.density.automatic", label: "Densité Automatique", group: "density" }),
  Object.freeze({ id: "v8.theme.night", label: "Thème Nuit", group: "theme" }),
  Object.freeze({ id: "v8.theme.graphite", label: "Thème Graphite", group: "theme" }),
  Object.freeze({ id: "v8.theme.day", label: "Thème Jour", group: "theme" }),
  Object.freeze({ id: "v8.theme.auto", label: "Thème Auto", group: "theme" }),
]);

export type AutomationRule = {
  id: string;
  enabled: boolean;
  trigger: { type: (typeof AUTOMATION_TRIGGER_TYPES)[number]; value: string };
  actionId: string;
  createdAt: number;
};

function normalizeTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "09:00";
}

export function sanitizeAutomationTrigger(input: { type?: string; value?: string }): { type: (typeof AUTOMATION_TRIGGER_TYPES)[number]; value: string } {
  const type = AUTOMATION_TRIGGER_TYPES.includes(input.type as (typeof AUTOMATION_TRIGGER_TYPES)[number]) ? (input.type as (typeof AUTOMATION_TRIGGER_TYPES)[number]) : "route";
  if (type === "space") return { type, value: SPACES.includes(input.value as (typeof SPACES)[number]) ? (input.value as (typeof SPACES)[number]) : "focus" };
  if (type === "time") return { type, value: normalizeTime(input.value || "09:00") };
  return { type: "route", value: NAVIGATION.includes(input.value as (typeof NAVIGATION)[number]) ? (input.value as (typeof NAVIGATION)[number]) : "home" };
}

export function triggerLabel(rule: AutomationRule["trigger"]) {
  if (rule.type === "space") return `Au passage vers ${rule.value}`;
  if (rule.type === "time") return `Chaque jour à ${rule.value}`;
  return `À l'ouverture de ${rule.value}`;
}

export function actionLabel(actionId: string) {
  return AUTOMATION_ACTIONS.find((entry) => entry.id === actionId)?.label || actionId;
}

export function matchRules(rules: AutomationRule[], event: { type: (typeof AUTOMATION_TRIGGER_TYPES)[number]; value: string }) {
  return rules.filter((rule) => rule.enabled && rule.trigger.type === event.type && rule.trigger.value === event.value);
}

export function createAutomationWatcher(getRules: () => AutomationRule[], onFire: (rule: AutomationRule) => void) {
  let previousRoute: string | null = null;
  let previousSpace: string | null = null;
  let previousMinute: string | null = null;

  function prime(state: { route?: string; space?: string; localTime?: string }) {
    previousRoute = state.route ?? null;
    previousSpace = state.space ?? null;
    previousMinute = /^\d{2}:\d{2}$/.test(state.localTime || "") ? (state.localTime as string) : null;
  }

  function check(state: { route?: string; space?: string; localTime?: string }) {
    const fired: AutomationRule[] = [];
    if (state.route !== previousRoute) {
      fired.push(...matchRules(getRules(), { type: "route", value: state.route || "home" }));
      previousRoute = state.route || "home";
    }
    if (state.space !== previousSpace) {
      fired.push(...matchRules(getRules(), { type: "space", value: state.space || "personal" }));
      previousSpace = state.space || "personal";
    }
    const minute = /^\d{2}:\d{2}$/.test(state.localTime || "") ? (state.localTime as string) : null;
    if (minute && minute !== previousMinute) {
      fired.push(...matchRules(getRules(), { type: "time", value: minute }));
      previousMinute = minute;
    }
    fired.forEach(onFire);
    return fired;
  }

  return { prime, check };
}
