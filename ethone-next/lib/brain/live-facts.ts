import type { Settings } from "@/lib/settings";
import { fetchWeatherSafe } from "@/lib/weather-service";
import { fetchWorker } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/**
 * Faits en direct donnés à Brain au moment de la question, à partir des mêmes sources que les pages d'ETHONE
 * (météo de la ville réglée, dernières parties du Tracker…). Les parties ne sont lues que si la question en parle.
 */

type ValoMatch = {
  metadata?: { result?: string; mapName?: string; agentName?: string; modeName?: string; timestamp?: string; score?: { team?: number | null; opponent?: number | null } };
  segments?: Array<{ stats?: Record<string, { value?: number }> }>;
};
type LolMatch = {
  metadata?: { result?: string; modeName?: string; timestamp?: string; championName?: string; gameDuration?: string };
  scoreboard?: { players?: Array<{ isMe?: boolean; character?: string; level?: number; stats?: { kills?: number; deaths?: number; assists?: number; cs?: number } }> };
};

const ago = (iso?: string) => {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(min) || min < 0) return "";
  if (min < 60) return `il y a ${min} min`;
  if (min < 48 * 60) return `il y a ${Math.round(min / 60)} h`;
  return `le ${new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
};
const fr = (r?: string) => (/victory/i.test(r || "") ? "Victoire" : /defeat/i.test(r || "") ? "Défaite" : r ? "Égalité" : "");

/** Parties en cache local (déjà affichées par le Tracker), sinon récupérées via le worker. */
async function recentMatches<T>(cachePrefix: string, workerPath: string): Promise<T[]> {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(cachePrefix));
    for (const k of keys) {
      const parsed = JSON.parse(localStorage.getItem(k) || "null");
      const list = (parsed?.matches ?? parsed) as T[];
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {}
  try {
    const res = await fetchWorker(workerPath);
    const list = (res?.data?.matches || res?.data || res?.matches || res || []) as T[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function gatherLiveFacts(question: string, settings: Settings): Promise<string[]> {
  const q = question.toLowerCase();
  const facts: string[] = [];

  const city = settings.liveWeatherCity || "";
  if (city) {
    const w = await fetchWeatherSafe(city).catch(() => null);
    if (w) {
      const t = w.temperature ?? w.temperatureC;
      facts.push(
        `- 🌤️ Météo actuelle à ${w.city || city} (ville réglée dans ETHONE) : ${t ?? "?"} °C, ressenti ${w.apparentTemperature ?? w.feelsLike ?? "?"} °C, ${w.description || w.condition || ""}, vent ${w.windSpeedKmh ?? w.windSpeed ?? "?"} km/h, humidité ${w.humidityPercent ?? "?"} %.`,
      );
    }
  } else {
    facts.push("- 🌤️ Aucune ville météo réglée (page Météo ou Réglages).");
  }

  const name = settings.liveTrackerRiotName?.trim();
  const tag = settings.liveTrackerRiotTag?.trim().replace(/^#/, "");
  const wantsValo = /valo|valorant|agent|\bacs\b|\bhs\b/.test(q);
  const wantsLol = /\blol\b|league|champion|ranked|soloq/.test(q);
  const wantsGame = /partie|game|match|stat|elo|rang|rank|kda/.test(q);
  if ((wantsValo || wantsLol || wantsGame) && (!name || !tag)) {
    facts.push("- 🎮 Aucun Riot ID enregistré dans le Tracker (ETHONE → Tracker) : les parties ne sont pas disponibles.");
  } else if (name && tag) {
    if (wantsValo || (wantsGame && !wantsLol)) {
      const list = await recentMatches<ValoMatch>(`ethone-valo-cache:${name.toLowerCase()}:${tag.toLowerCase()}:`, `/api/stats/valorant-matches?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
      const lines = list.slice(0, 5).map((m, i) => {
        const s = m.segments?.[0]?.stats || {};
        const md = m.metadata || {};
        return `  ${i === 0 ? "• Dernière" : "•"} ${fr(md.result)} ${md.score?.team ?? "?"}-${md.score?.opponent ?? "?"} sur ${md.mapName || "?"} (${md.modeName || "?"}) avec ${md.agentName || "?"} : ${s.kills?.value ?? 0} éliminations, ${s.deaths?.value ?? 0} morts, ${s.assists?.value ?? 0} assistances, ${Math.round(s.headshotsPercentage?.value ?? 0)} % HS, ${Math.round(s.adr?.value ?? 0)} ADR, ${ago(md.timestamp)}`;
      });
      facts.push(lines.length ? `- 🎯 Parties Valorant récentes de ${name}#${tag} :\n${lines.join("\n")}` : `- 🎯 Aucune partie Valorant trouvée pour ${name}#${tag}.`);
    }
    if (wantsLol) {
      const list = await recentMatches<LolMatch>(`ethone-lol-cache:${name.toLowerCase()}:${tag.toLowerCase()}:`, `/api/stats/lol-matches?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
      const lines = list.slice(0, 5).map((m, i) => {
        const me = m.scoreboard?.players?.find((p) => p.isMe);
        const s = me?.stats || {};
        const md = m.metadata || {};
        return `  ${i === 0 ? "• Dernière" : "•"} ${fr(md.result)} en ${md.modeName || "?"} avec ${me?.character || md.championName || "?"} : ${s.kills ?? 0} éliminations, ${s.deaths ?? 0} morts, ${s.assists ?? 0} assistances, ${s.cs ?? 0} CS${md.gameDuration ? `, ${md.gameDuration}` : ""}, ${ago(md.timestamp)}`;
      });
      facts.push(lines.length ? `- ⚔️ Parties League of Legends récentes de ${name}#${tag} :\n${lines.join("\n")}` : `- ⚔️ Aucune partie LoL trouvée pour ${name}#${tag}.`);
    }
  }

  const wantsHabits = /habitude|routine|streak|série|objectif du jour/.test(q);
  if (wantsHabits) {
    try {
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [habitsRes, completionsRes] = await Promise.all([
          supabase.from("ethone_habits").select("id, name, emoji, target_per_week").eq("user_id", userId).eq("archived", false),
          supabase.from("ethone_habit_completions").select("habit_id").eq("user_id", userId).eq("completed_on", todayStr),
        ]);
        const habits = (habitsRes.data as Array<{ id: string; name: string; emoji: string | null }>) || [];
        const completedIds = new Set(((completionsRes.data as Array<{ habit_id: string }>) || []).map((c) => c.habit_id));
        if (habits.length) {
          const done = habits.filter((h) => completedIds.has(h.id));
          const pending = habits.filter((h) => !completedIds.has(h.id));
          const summary = `- 🎯 Habitudes du jour (${done.length}/${habits.length} faites) :\n` +
            (done.length ? `  • Complétées : ${done.map((h) => `${h.emoji || ""} ${h.name}`.trim()).join(", ")}\n` : "") +
            (pending.length ? `  • Restantes : ${pending.map((h) => `${h.emoji || ""} ${h.name}`.trim()).join(", ")}` : "  • Toutes vos habitudes du jour sont accomplies ! 🎉");
          facts.push(summary.trim());
        } else {
          facts.push("- 🎯 Aucune habitude enregistrée dans ETHONE (page Habitudes).");
        }
      }
    } catch {}
  }

  return facts;
}
