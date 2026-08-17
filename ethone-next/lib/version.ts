export function formatVersion(version: string | null): string {
  if (!version) return "—";
  // Semantic version: keep it as-is instead of truncating like a git hash.
  if (/^\d+\.\d+\.\d+/.test(version)) return `v${version}`;
  const short = version.slice(0, 7);
  return `v${short}`;
}
