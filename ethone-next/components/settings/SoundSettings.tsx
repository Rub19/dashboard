"use client";

import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useSound, type SoundType } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import Switch from "@/components/Switch";
import Slider from "@/components/ui/Slider";
import type { SoundPack, SoundVolumeCategory } from "@/lib/settings";

const PACKS: Array<{ id: SoundPack; nameKey: string; name: string; icon: string; isNew?: boolean }> = [
  { id: "ethone", nameKey: "soundPackEthone", name: "Ethone", icon: "drop", isNew: true },
  { id: "minimal", nameKey: "soundPackMinimal", name: "Minimal", icon: "circle" },
  { id: "apple-inspired", nameKey: "soundPackApple-inspired", name: "Apple", icon: "cloud" },
  { id: "classic", nameKey: "soundPackClassic", name: "Classique", icon: "bell" },
  { id: "cyber-pulse", nameKey: "soundPackCyber-pulse", name: "Cyber", icon: "lightning" },
  { id: "silent", nameKey: "soundPackSilent", name: "Silencieux", icon: "speaker-slash" },
];

const CATEGORIES: Array<{ id: SoundVolumeCategory; labelKey: string; label: string; test: SoundType }> = [
  { id: "interface", labelKey: "interfaceVolume", label: "Interface", test: "click" },
  { id: "notifications", labelKey: "notifications", label: "Notifications", test: "notification" },
  { id: "brain", labelKey: "brainVolume", label: "Brain", test: "brain" },
  { id: "system", labelKey: "systemVolume", label: "Système", test: "pulse" },
];

const ALL_SOUNDS: SoundType[] = [
  "click", "hover", "toggle", "open", "close", "confirm", "success",
  "notice", "notification", "warning", "error", "brain", "pulse", "launch",
];

function Card({ title, desc, icon, children }: { title: string; desc?: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          {desc && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{desc}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

export default function SoundSettings() {
  const { settings, update } = useSettings();
  const i18n = useI18n();
  const { play, playAmbientLayer, stopAmbient, ambientLayers } = useSound();

  const active = Object.keys(ambientLayers).filter((k) => (ambientLayers as Record<string, number>)[k] > 0);
  const setPack = (id: SoundPack) => {
    update({ soundPack: id });
    // On joue avec le pack choisi tout de suite (le réglage n'est pas encore relu par le contexte).
    play("success", id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1) Sons de l'interface : activation, volume, style */}
      <Card title={i18n("sAudUi", "Sons de l'interface")} desc={i18n("sAudUiDesc", "Clics, ouvertures, confirmations et alertes")} icon="speaker-high">
        <ToggleRow
          label={i18n("sAudEnable", "Activer les sons")}
          desc={i18n("sAudUiDesc", "Clics, ouvertures, confirmations et alertes")}
          checked={settings.soundEffects}
          onChange={(v) => update({ soundEffects: v })}
        />
        <div className={cn("mt-1 flex items-center gap-4 py-2.5", !settings.soundEffects && "pointer-events-none opacity-40")}>
          <p className="w-40 shrink-0 text-[13px] font-semibold text-[var(--text-primary)]">{i18n("sAudVolume", "Volume des effets")}</p>
          <Slider value={settings.soundVolume} onChange={(v) => update({ soundVolume: v })} unit="%" aria-label={i18n("sAudVolume", "Volume des effets")} className="flex-1" />
        </div>

        <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{i18n("sAudStyle", "Style sonore")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.map((p) => {
            const selected = settings.soundPack === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                aria-pressed={selected}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer active:scale-[0.99]",
                  selected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
                    : "border-[var(--panel-border)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/20 text-[var(--accent-primary)]">
                  <Icon name={p.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{i18n(p.nameKey, p.name)}</span>
                    {p.isNew && (
                      <span className="rounded-md bg-[var(--accent-primary)] px-1.5 py-px text-[9px] font-bold uppercase text-[var(--accent-contrast,#fff)]">
                        {i18n("sAudNew", "Nouveau")}
                      </span>
                    )}
                    {selected && <Icon name="check" className="ml-auto h-3.5 w-3.5 text-[var(--accent-primary)]" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-muted)]">{i18n(`sAudPack_${p.id}`, p.id)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2) Mixage par catégorie */}
      <Card title={i18n("sAudMix", "Mixage par catégorie")} desc={i18n("sAudMixDesc", "Règle chaque famille de sons séparément")} icon="sliders-horizontal">
        <div className="flex flex-col divide-y divide-[var(--panel-border)]/60">
          {CATEGORIES.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <p className="w-28 shrink-0 truncate text-[13px] font-semibold text-[var(--text-primary)] sm:w-40">{i18n(c.labelKey, c.label)}</p>
              <Slider
                value={settings.soundVolumes[c.id]}
                onChange={(v) => update({ soundVolumes: { ...settings.soundVolumes, [c.id]: v } })}
                unit="%"
                aria-label={i18n(c.labelKey, c.label)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => play(c.test)}
                title={i18n("sAudTest", "Tester")}
                aria-label={`${i18n("sAudTest", "Tester")} ${i18n(c.labelKey, c.label)}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)] cursor-pointer"
              >
                <Icon name="play" className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 3) Comportement */}
      <Card title={i18n("sAudBehavior", "Comportement")} icon="gear-six">
        <div className="flex flex-col divide-y divide-[var(--panel-border)]/60">
          <ToggleRow label={i18n("sAudMaster", "Son général")} desc={i18n("sAudMasterDesc", "Coupe tout le son d'ETHONE d'un coup")} checked={settings.masterVolume} onChange={(v) => update({ masterVolume: v })} />
          <ToggleRow label={i18n("sAudDuck", "Baisser si un média joue")} desc={i18n("sAudDuckDesc", "Réduit les sons quand Spotify ou une vidéo est en lecture")} checked={settings.mediaDucking} onChange={(v) => update({ mediaDucking: v })} />
          <ToggleRow label={i18n("sAudSpatial", "Audio spatial")} desc={i18n("sAudSpatialDesc", "Décale légèrement chaque son selon la position du clic")} checked={settings.soundSpatial} onChange={(v) => update({ soundSpatial: v })} />
        </div>
      </Card>

      {/* 4) Ambiances : accès rapide */}
      <Card title={i18n("sAudAmbient", "Ambiances")} desc={i18n("sAudAmbientDesc", "Pluie, orage, forêt… pour se concentrer ou s'endormir")} icon="cloud-rain">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playAmbientLayer("rain", 70)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Icon name="cloud-rain" className="h-4 w-4 text-[var(--accent-primary)]" />
            {i18n("sAudRainSleep", "Pluie pour dormir")}
          </button>
          <button
            type="button"
            onClick={() => playAmbientLayer("storm", 65)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Icon name="cloud-lightning" className="h-4 w-4 text-[var(--accent-primary)]" />
            {i18n("sAudStormSleep", "Orage lointain")}
          </button>
          {active.length > 0 && (
            <button
              type="button"
              onClick={stopAmbient}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Icon name="stop" className="h-3.5 w-3.5" />
              {i18n("sAudStop", "Arrêter")}
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {active.length > 0 ? `${i18n("sAudNowPlaying", "En cours")} : ${active.join(", ")}` : i18n("sAudNone", "Aucune ambiance")}
        </p>
      </Card>

      {/* 5) Tout écouter */}
      <Card title={i18n("sAudAll", "Écouter tous les sons")} desc={i18n("sAudAllDesc", "Un clic sur un son pour l'entendre avec le style choisi")} icon="music-notes">
        <div className="flex flex-wrap gap-2">
          {ALL_SOUNDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => play(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-muted)] cursor-pointer"
            >
              <Icon name="play" className="h-3 w-3 text-[var(--accent-primary)]" />
              {i18n(`sAudSt_${s}`, s)}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
