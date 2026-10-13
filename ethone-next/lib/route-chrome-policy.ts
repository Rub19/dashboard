const DOCK_AUTO_HIDE: string[] = [
  "/brain",
  "/focus",
  "/scratchpad",
  "/matches",
  "/mail",
  "/soundscape",
  "/games",
];

const ISLAND_AUTO_HIDE: string[] = [
  "/matches",
  "/focus",
  "/games",
  "/soundscape",
  "/scratchpad",
];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

export function shouldAutoHideDock(pathname: string): boolean {
  return matchesRoute(pathname, DOCK_AUTO_HIDE);
}

export function shouldAutoHideIsland(pathname: string): boolean {
  return matchesRoute(pathname, ISLAND_AUTO_HIDE);
}
