// Clip envoyé par l'extension Chrome ETHONE : `/clip#<JSON encodé>` avec { t: titre, u: url, s: sélection }.
// Le #hash n'est jamais envoyé au serveur ; ce qu'il contient vient d'une page web quelconque, donc on borne et on filtre.
export type Clip = { title: string; url: string; selection: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseClip(hash: string): Clip | null {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  let url = str(d.u, 2048);
  try {
    if (!/^https?:$/.test(new URL(url).protocol)) url = "";
  } catch {
    url = "";
  }
  const clip = { title: str(d.t, 200), url, selection: str(d.s, 5000) };
  return clip.title || clip.url || clip.selection ? clip : null;
}

export function encodeClip(c: { t?: string; u?: string; s?: string }): string {
  return "#" + encodeURIComponent(JSON.stringify(c));
}
