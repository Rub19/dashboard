"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { useToast } from "@/components/ToastProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { buildDefaultProfileView, PROFILE_ACCENTS, PROFILE_COPY } from "@/lib/profile-repository";

const TYPES = ["personal", "work", "development", "study", "gaming", "streaming", "creative"] as const;
const WORKSPACES = ["personal", "focus", "studio"] as const;
const ACCENTS = ["mint", "sky", "amber", "violet", "rose"] as const;

const SUGGESTED_WIDGETS: Record<string, string[]> = {
  personal: ["today", "notes", "calendar"],
  work: ["tasks", "calendar", "focus"],
  development: ["github", "brain", "tasks"],
  study: ["notes", "planning", "focus"],
  gaming: ["spotify", "tasks", "brain"],
  streaming: ["today", "brain", "files"],
  creative: ["notes", "files", "brain"],
};

const ACCENT_CLASSES: Record<string, string> = {
  mint: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  violet: "bg-violet-500",
  rose: "bg-rose-400",
};

const WORKSPACE_ICONS: Record<string, string> = {
  personal: "user-round",
  focus: "focus",
  studio: "sparkles",
};

export default function ProfileSelectionPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const { reload } = useActiveProfile();
  const { profiles, active, activeProfile, loaded, create, select, remove, duplicate } = useProfiles();
  const [name, setName] = useState("");
  const [type, setType] = useState<Profile["type"]>("personal");
  const [workspace, setWorkspace] = useState<Profile["workspace"]>("personal");
  const [accent, setAccent] = useState<string>(PROFILE_ACCENTS.personal);
  const [creating, setCreating] = useState(false);

  const preview = useMemo(
    () =>
      buildDefaultProfileView({
        name,
        type,
        accent,
        space: workspace,
        widgets: SUGGESTED_WIDGETS[type] || ["today", "notes", "calendar"],
        integrations: [],
      }),
    [name, type, accent, workspace]
  );

  if (!loaded) {
    return (
      <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
        <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileSelectionTitle")}</h1>
        <div className="min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden] space-y-6">
          <Card3D><div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await create({
        name: preview.name.trim(),
        type: preview.type,
        accent: preview.accent,
        workspace,
        widgets: [...preview.environment.widgets],
        integrations: [...preview.environment.integrations],
      });
      await reload();
      success(i18n("created"));
      setName("");
      setWorkspace("personal");
      setAccent(PROFILE_ACCENTS.personal);
    } catch (err) {
      showError(String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleSelect(id: string) {
    await select(id);
    await reload();
    success(i18n("selected"));
    router.push("/");
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileSelectionTitle")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden] space-y-6">
      <Card3D>
        <div className="space-y-4">
          <label className="text-sm font-medium">{i18n("newProfile")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n("profileNamePlaceholder")}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
          />

          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--muted)]">{i18n("kind")}</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setAccent(PROFILE_ACCENTS[t as Profile["type"]]);
                  }}
                  className={`rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs ${type === t ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}
                >
                  {i18n(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--muted)]">{i18n("workspace")}</p>
            <div className="flex flex-wrap gap-2">
              {WORKSPACES.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorkspace(w)}
                  className={`flex items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs ${workspace === w ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}
                >
                  <Icon name={WORKSPACE_ICONS[w]} className="h-3.5 w-3.5" />
                  {i18n(w)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--muted)]">{i18n("accent")}</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccent(a)}
                  aria-label={i18n(`accent${a.charAt(0).toUpperCase() + a.slice(1)}` as `${string}`)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-[var(--panel-border)] ${accent === a ? "ring-2 ring-white" : "hover:opacity-80"}`}
                >
                  <span className={`h-5 w-5 rounded-full ${ACCENT_CLASSES[a]}`} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {i18n("create")}
          </button>
        </div>
      </Card3D>

      <Card3D>
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ACCENT_CLASSES[preview.accent] || "bg-violet-500"}`}>
            {preview.avatar.kind === "image" ? (
              <Image
                unoptimized
                src={preview.avatar.value}
                alt=""
                width={24}
                height={24}
                className="rounded-xl object-cover"
              />
            ) : preview.avatar.kind === "symbol" ? (
              <span className="text-lg leading-none">{preview.avatar.value}</span>
            ) : (
              <span className="text-xs font-bold text-white">{preview.avatar.value}</span>
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{preview.name || i18n("preview")}</p>
            <p className="text-xs text-[var(--muted)]">{PROFILE_COPY[preview.type]}</p>
            <p className="text-xs text-[var(--muted)]">
              {i18n(preview.type)} • {i18n(workspace)} • {preview.environment.widgets.length} widgets
            </p>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Card3D key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  {active === p.id && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <Icon name="check" className="h-3 w-3" /> {i18n("active")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {i18n(p.type)} • {i18n(p.workspace)} • {p.widgets.length} widgets
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => duplicate(p.id)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-bg)]"><Icon name="copy" className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(p.id)} className="rounded p-1 text-red-400 hover:bg-[var(--panel-bg)]"><Icon name="trash-2" className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-full ${ACCENT_CLASSES[p.accent] || "bg-violet-500"} backdrop-blur-[var(--panel-blur)]`} />
              <span className="text-xs text-[var(--muted)]">{i18n(`accent${p.accent.charAt(0).toUpperCase() + p.accent.slice(1)}` as `${string}`)}</span>
            </div>

            <button
              type="button"
              onClick={() => handleSelect(p.id)}
              className={`mt-3 w-full rounded-[var(--panel-radius)] px-3 py-2 text-sm font-semibold text-white ${active === p.id ? "bg-emerald-500" : "bg-[var(--accent)]"}`}
            >
              {active === p.id ? i18n("active") : i18n("select")}
            </button>
          </Card3D>
        ))}
      </div>

      {activeProfile && (
        <Card3D>
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ACCENT_CLASSES[activeProfile.accent] || "bg-violet-500"}`}>
              <Icon name={WORKSPACE_ICONS[activeProfile.workspace] || "user-round"} className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-medium">{activeProfile.name}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("profileSelectionHint")}</p>
            </div>
          </div>
        </Card3D>
      )}

      <Card3D>
        <p className="text-sm text-[var(--muted)]">{i18n("profileSelectionHint")}</p>
      </Card3D>
      </div>
    </div>
  );
}
