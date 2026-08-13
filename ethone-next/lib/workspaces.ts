export type WorkspaceWidget = {
  id: string;
  label: string;
  icon: string;
  actionId: string;
  countKey: string;
};

export const WORKSPACE_WIDGETS: Record<string, WorkspaceWidget> = {
  notes: { id: "notes", label: "notes", icon: "notebook-pen", actionId: "v8.notes.open", countKey: "notes" },
  tasks: { id: "tasks", label: "tasks", icon: "circle-check-big", actionId: "v8.tasks.open", countKey: "tasks" },
  calendar: { id: "calendar", label: "calendar", icon: "calendar-days", actionId: "v8.calendar.open", countKey: "events" },
  files: { id: "files", label: "files", icon: "folder", actionId: "v8.files.open", countKey: "files" },
  brain: { id: "brain", label: "brain", icon: "brain", actionId: "v8.brain.open", countKey: "brain" },
};

export type Workspace = {
  id: string;
  label: string;
  flow: string;
  accent: string;
  actionId: string;
  icon: string;
  description: string;
  steps: readonly string[];
  widgets: readonly WorkspaceWidget[];
};

export const WORKSPACES: Workspace[] = [
  {
    id: "personal",
    label: "workspacePersonal",
    flow: "Essentiel",
    accent: "mint",
    actionId: "v8.space.personal",
    icon: "user-round",
    description: "workspacePersonalDescription",
    steps: ["capturer", "organiser", "executer"],
    widgets: [WORKSPACE_WIDGETS.notes, WORKSPACE_WIDGETS.tasks, WORKSPACE_WIDGETS.calendar, WORKSPACE_WIDGETS.brain],
  },
  {
    id: "focus",
    label: "workspaceFocus",
    flow: "Deep Work",
    accent: "sky",
    actionId: "v8.space.focus",
    icon: "focus",
    description: "workspaceFocusDescription",
    steps: ["choisir", "concentrer", "terminer"],
    widgets: [WORKSPACE_WIDGETS.tasks, WORKSPACE_WIDGETS.calendar, WORKSPACE_WIDGETS.brain, WORKSPACE_WIDGETS.notes],
  },
  {
    id: "studio",
    label: "workspaceStudio",
    flow: "Creation",
    accent: "rose",
    actionId: "v8.space.studio",
    icon: "sparkles",
    description: "workspaceStudioDescription",
    steps: ["explorer", "relier", "publier"],
    widgets: [WORKSPACE_WIDGETS.notes, WORKSPACE_WIDGETS.files, WORKSPACE_WIDGETS.brain, WORKSPACE_WIDGETS.calendar],
  },
];

export function workspaceById(id: string): Workspace {
  return WORKSPACES.find((item) => item.id === id) || WORKSPACES[0];
}
