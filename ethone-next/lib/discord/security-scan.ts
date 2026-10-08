/** Types et appels du scan de sécurité du bot (partagés par l'écran Scan et la vue d'ensemble). */

export const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export type ScanCategory = "bot" | "roles" | "channels" | "discord" | "bots" | "settings";
export type ScanSeverity = "important" | "review" | "suggestion";
export interface ScanCheck {
  id: string;
  category: ScanCategory;
  severity: ScanSeverity;
  title: string;
  ok: boolean;
  why?: string;
  fix?: string;
  items?: string[];
}
export interface ScanResult {
  checks: ScanCheck[];
  scannedAt: string;
  memberCount: number;
  score: number;
  sensitiveRoles: string[];
}
export interface AutoScanConfig {
  enabled: boolean;
  channelId: string | null;
  frequency: "day" | "week";
  lastRunAt: string | null;
}

export const SEVERITY_LABEL: Record<ScanSeverity, string> = {
  important: "Important",
  review: "À examiner",
  suggestion: "Suggestion",
};
export const SEVERITY_COLOR: Record<ScanSeverity, string> = {
  important: "var(--danger)",
  review: "var(--warning)",
  suggestion: "var(--text-muted)",
};
const SEVERITY_RANK: Record<ScanSeverity, number> = { important: 0, review: 1, suggestion: 2 };

export const scoreColor = (score: number) => (score >= 85 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)");

export function failingChecks(result: ScanResult | null): ScanCheck[] {
  return (result?.checks ?? []).filter((c) => !c.ok).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** « il y a 3 heures » à partir d'une date ISO. */
export function sinceLabel(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `il y a ${h} heure${h > 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `il y a ${d} jours`;
}

export async function fetchLastScan(guildId: string): Promise<ScanResult | null> {
  if (!BOT_API_URL) return null;
  const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/security-scan/last`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.result ?? null;
}
