export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
  actionId: string;
  href: string;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "home", label: "home", icon: "home", actionId: "v8.home.open", href: "/" },
  { id: "notes", label: "notes", icon: "notes", actionId: "v8.notes.open", href: "/notes/" },
  { id: "tasks", label: "tasks", icon: "tasks", actionId: "v8.tasks.open", href: "/tasks/" },
  { id: "calendar", label: "calendar", icon: "calendar", actionId: "v8.calendar.open", href: "/calendar/" },
  { id: "files", label: "files", icon: "files", actionId: "v8.files.open", href: "/files/" },
  { id: "activity", label: "activity", icon: "activity", actionId: "v8.activity.open", href: "/activity/" },
  { id: "interactions", label: "interactions", icon: "interactions", actionId: "v8.interactions.open", href: "/interactions/" },
  { id: "connections", label: "connections", icon: "connections", actionId: "v8.connections.open", href: "/connections/" },
  { id: "plugins", label: "plugins", icon: "plugins", actionId: "v8.plugins.open", href: "/plugins/" },
  { id: "spaces", label: "spaces", icon: "spaces", actionId: "v8.spaces.open", href: "/spaces/" },
  { id: "flows", label: "flowsTitle", icon: "flows", actionId: "v8.flows.open", href: "/flows/" },
  { id: "brain", label: "brain", icon: "brain", actionId: "v8.brain.open", href: "/brain/" },
  { id: "team", label: "team", icon: "team", actionId: "v8.team.open", href: "/team/" },
  { id: "mail", label: "mail", icon: "mail", actionId: "v8.mail.open", href: "/mail/" },
  { id: "focus", label: "focus", icon: "focus", actionId: "v8.focus.open", href: "/focus/" },
  { id: "weather", label: "weather", icon: "cloudSun", actionId: "v8.weather.open", href: "/weather/" },
  { id: "settings", label: "settings", icon: "settings", actionId: "v8.settings.open", href: "/settings/" },
];

export function navigationItem(id: string): NavigationItem {
  return NAVIGATION_ITEMS.find((item) => item.id === id) || NAVIGATION_ITEMS[0];
}
