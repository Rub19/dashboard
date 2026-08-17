export function formatVersion(version: string | null): string {
  if (!version) return "—";
  const short = version.slice(0, 7);
  return `v${short}`;
}
