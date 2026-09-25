"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { MemberIdsInput, MultiRolePicker } from "@/components/discord/MultiPickers";
import { Field, Section, ToggleField, inputCls } from "@/components/discord/SettingsUI";
import PageHeader from "@/components/discord/PageHeader";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type Mode = "admins" | "owner" | "custom";
interface Settings {
  language: "fr" | "en" | "es" | "de";
  timezone: string;
  emergencyContacts: { mode: Mode; userIds: string[]; roleIds: string[] };
  prefix: string;
  prefixCommandsEnabled: boolean;
  slashCommandsEnabled: boolean;
}
interface Issue {
  id: string;
  title: string;
  detail: string;
}

const LANGUAGES: Array<[Settings["language"], string, string]> = [
  ["fr", "🇫🇷", "Français"],
  ["en", "🇬🇧", "English"],
  ["es", "🇪🇸", "Español"],
  ["de", "🇩🇪", "Deutsch"],
];
const PREVIEW_CATEGORIES: Array<[string, string]> = [
  ["", "Tous les messages"],
  ["statuts", "Statuts (succès, erreur…)"],
  ["general", "Général"],
  ["moderation", "Modération"],
  ["niveaux", "Niveaux"],
  ["automod", "AutoMod"],
  ["securite", "Sécurité et urgences"],
];
const MODES: Array<[Mode, string]> = [
  ["admins", "Tous les administrateurs"],
  ["owner", "Le propriétaire du serveur seulement"],
  ["custom", "Des membres et des rôles précis"],
];

/** Décalage UTC actuel d'un fuseau, ex. « UTC+02:00 ». */
function offsetLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return part.replace("GMT", "UTC") === "UTC" ? "UTC+00:00" : part.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

function useTimezones(current: string) {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      zones = [];
    }
    if (!zones.includes("UTC")) zones = ["UTC", ...zones];
    if (current && !zones.includes(current)) zones = [current, ...zones];
    return zones.map((z) => ({ id: z, label: `(${offsetLabel(z)}) ${z.replace(/_/g, " ")}` }));
  }, [current]);
}

export default function SettingsCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewCategory, setPreviewCategory] = useState("");
  const zones = useTimezones(draft?.timezone ?? "");
  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/settings`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const [res, health] = await Promise.all([fetch(base, { credentials: "include" }), fetch(`${base}/health`, { credentials: "include" }).catch(() => null)]);
      if (!res.ok) throw new Error(String(res.status));
      const c = (await res.json()).config as Settings;
      const next: Settings = { language: c.language, timezone: c.timezone, emergencyContacts: c.emergencyContacts ?? { mode: "admins", userIds: [], roleIds: [] }, prefix: c.prefix, prefixCommandsEnabled: c.prefixCommandsEnabled, slashCommandsEnabled: c.slashCommandsEnabled };
      setSaved(next);
      setDraft(next);
      if (health?.ok) setIssues(((await health.json()) as { issues: Issue[] }).issues ?? []);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [guildId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!guildId) return;
    return subscribeGuildLive(guildId, (e) => {
      if (e.type === "CONFIG_UPDATED") void load();
    });
  }, [guildId, load]);

  const dirty = saved && draft && JSON.stringify(saved) !== JSON.stringify(draft);
  const set = (patch: Partial<Settings>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const contacts = draft?.emergencyContacts;
  const invalid = !draft || !/^\S{1,5}$/.test(draft.prefix) || (!draft.slashCommandsEnabled && !draft.prefixCommandsEnabled) || (contacts?.mode === "custom" && contacts.userIds.length + contacts.roleIds.length === 0);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(base, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      await load();
      success("Paramètres enregistrés");
    } catch (err) {
      showError("Enregistrement impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${base}/emergency-test`, { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      if (json.success) success("Test envoyé", `${json.channel ? "Message posté dans le salon d'alerte. " : "Aucun salon d'alerte disponible. "}${json.dms} message(s) privé(s) livré(s) sur ${json.contacts} contact(s).`);
      else showError("Personne n'a pu être prévenu", "Ni salon d'alerte utilisable, ni message privé possible : vérifiez les permissions du bot et les messages privés des contacts.");
    } catch (err) {
      showError("Test impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
    } finally {
      setTesting(false);
    }
  };

  const sendPreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch(`${base}/preview-messages`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: previewCategory || undefined }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      if (json.dmClosed) showError("Messages privés fermés", "Le bot ne peut pas vous écrire : autorisez les messages privés des membres de ce serveur, puis réessayez.");
      else success("Messages envoyés", `${json.sent}/${json.total} message(s) reçus en message privé${json.failed ? ` (${json.failed} en échec)` : ""}.`);
    } catch (err) {
      showError("Envoi impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
    } finally {
      setPreviewing(false);
    }
  };

  const back = (
    <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
      <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
      Retour Discord
    </Link>
  );

  if (state !== "ok" || !draft) {
    return (
      <div className="h-full overflow-y-auto px-4 pb-44 pt-6 text-white sm:px-6 lg:px-10">
        {back}
        <p className="mt-8 text-sm text-zinc-400">{state === "offline" ? "Le bot est injoignable ou n'est pas sur ce serveur : impossible de charger les paramètres." : "Chargement…"}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] px-4 pb-44 pt-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader guildId={guildId} icon="mod-commands" tint="zinc" title="Paramètres" subtitle="Langue, fuseau horaire, contacts d'urgence, aperçu des messages du bot et commandes." />

        {issues.length > 0 && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="text-sm font-bold text-rose-200">{issues.length} problème{issues.length > 1 ? "s" : ""} sérieux détecté{issues.length > 1 ? "s" : ""}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-100/90">
              {issues.map((i) => (
                <li key={i.id}>
                  <strong>{i.title}</strong> — {i.detail.replace(/\*\*/g, "").replace(/<@&?(\d+)>/g, "$1")}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-rose-200/70">Vos contacts d&apos;urgence sont prévenus automatiquement (au plus une fois par jour pour un même problème).</p>
          </div>
        )}

        <Section title="Langue et fuseau horaire" text="Langue du bot et fuseau horaire utilisés sur votre serveur (rappels, événements, horaires).">
          <Field label="Langue">
            <select value={draft.language} onChange={(e) => set({ language: e.target.value as Settings["language"] })} className={inputCls}>
              {LANGUAGES.map(([k, flag, label]) => (
                <option key={k} value={k}>
                  {flag} {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuseau horaire">
            <select value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })} className={inputCls}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Contacts d'urgence" text="Quand un problème sérieux est détecté (permission manquante, salon supprimé, rôle caché disparu…), un message d'urgence est envoyé et ces contacts sont mentionnés pour que le problème soit traité.">
          <div className="space-y-5 lg:col-span-2">
            <Field label="Qui prévenir">
              <select value={draft.emergencyContacts.mode} onChange={(e) => set({ emergencyContacts: { ...draft.emergencyContacts, mode: e.target.value as Mode } })} className={inputCls}>
                {MODES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {draft.emergencyContacts.mode === "custom" && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Field label="Membres" hint="Identifiant Discord (10 au maximum).">
                  <MemberIdsInput value={draft.emergencyContacts.userIds} onChange={(v) => set({ emergencyContacts: { ...draft.emergencyContacts, userIds: v.slice(0, 10) } })} />
                </Field>
                <Field label="Rôles">
                  <MultiRolePicker guildId={guildId} value={draft.emergencyContacts.roleIds} onChange={(v) => set({ emergencyContacts: { ...draft.emergencyContacts, roleIds: v.slice(0, 10) } })} />
                </Field>
              </div>
            )}
            <div>
              <button type="button" disabled={testing || Boolean(dirty)} onClick={() => void sendTest()} className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">
                {testing ? "Envoi…" : "Envoyer un message de test"}
              </button>
              <p className="mt-1 text-[11px] text-zinc-500">{dirty ? "Enregistrez d'abord vos modifications pour tester." : "Le test montre ce qui est réellement livré : salon d'alerte et messages privés."}</p>
            </div>
          </div>
        </Section>

        <Section title="Aperçu des messages du bot" text="Recevez en message privé un exemplaire des messages du bot (avec des données d'exemple), pour les voir tels que vos membres les voient. Rien n'est modifié sur le serveur.">
          <Field label="Quels messages">
            <select value={previewCategory} onChange={(e) => setPreviewCategory(e.target.value)} className={inputCls}>
              {PREVIEW_CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button type="button" disabled={previewing} onClick={() => void sendPreview()} className="cursor-pointer rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
              {previewing ? "Envoi en cours (quelques secondes)…" : "Me les envoyer en message privé"}
            </button>
          </div>
        </Section>

        <Section title="Commandes" text="Comment les membres utilisent le bot.">
          <ToggleField label="Commandes slash" text="Autoriser les commandes /" checked={draft.slashCommandsEnabled} onChange={(v) => set({ slashCommandsEnabled: v })} />
          <ToggleField label="Commandes à préfixe" text="Autoriser les commandes écrites avec un préfixe" checked={draft.prefixCommandsEnabled} onChange={(v) => set({ prefixCommandsEnabled: v })} />
          {!draft.slashCommandsEnabled && !draft.prefixCommandsEnabled && <p className="text-xs text-rose-300 lg:col-span-2">Gardez au moins un type de commande actif, sinon plus personne ne pourrait utiliser le bot.</p>}
          <Field label="Préfixe" hint="1 à 5 caractères, sans espace.">
            <input value={draft.prefix} maxLength={5} onChange={(e) => set({ prefix: e.target.value })} className={inputCls + (/^\S{1,5}$/.test(draft.prefix) ? "" : " border-rose-500/60")} />
          </Field>
        </Section>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-[min(92vw,640px)] items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-3 shadow-2xl">
          <p className="text-sm text-zinc-300">{invalid ? "Corrigez les champs en rouge avant d'enregistrer." : "Vous avez des modifications non enregistrées."}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(saved)} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-white">
              Annuler
            </button>
            <button type="button" disabled={saving || invalid} onClick={() => void save()} className="cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
