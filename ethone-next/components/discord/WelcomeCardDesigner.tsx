"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, RefreshCw, RotateCcw, Save } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export type CardImageConfig = {
  enabled: boolean;
  template: "default" | "modern" | "minimal" | "gaming";
  titleText: string;
  subtitleText: string;
  tagText: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  customBackgroundUrl: string | null;
  overlayOpacity: number;
  avatarShape: "circle" | "rounded" | "square";
  font: "poppins" | "bebas" | "serif" | "mono";
  showServerName: boolean;
  animated: boolean;
};

// Mêmes défauts que WelcomeImageConfigSchema côté bot.
export const CARD_DEFAULTS: CardImageConfig = {
  enabled: true,
  template: "default",
  titleText: "BIENVENUE",
  subtitleText: "{username}",
  tagText: "Membre #{membercount}",
  accentColor: "#10B981",
  backgroundColor: "#0B0C10",
  textColor: "#FFFFFF",
  customBackgroundUrl: null,
  overlayOpacity: 55,
  avatarShape: "circle",
  font: "poppins",
  showServerName: true,
  animated: true,
};

const TEMPLATES: { id: CardImageConfig["template"]; label: string; hint: string }[] = [
  { id: "default", label: "Classique", hint: "Avatar à gauche, texte à droite" },
  { id: "modern", label: "Centré", hint: "Avatar en haut, tout centré" },
  { id: "minimal", label: "Minimal", hint: "Grande typo, épuré" },
  { id: "gaming", label: "Gaming", hint: "Bande diagonale, typo condensée" },
];
const FONTS: { id: CardImageConfig["font"]; label: string; sample: string }[] = [
  { id: "poppins", label: "Poppins", sample: "font-sans font-semibold" },
  { id: "bebas", label: "Bebas", sample: "font-sans font-black uppercase tracking-tight" },
  { id: "serif", label: "Serif", sample: "font-serif font-semibold" },
  { id: "mono", label: "Mono", sample: "font-mono" },
];
const SHAPES: { id: CardImageConfig["avatarShape"]; label: string; radius: string }[] = [
  { id: "circle", label: "Rond", radius: "rounded-full" },
  { id: "rounded", label: "Arrondi", radius: "rounded-[30%]" },
  { id: "square", label: "Carré", radius: "rounded-[6%]" },
];
const SWATCHES = ["#10B981", "#C1234F", "#8B5CF6", "#3B82F6", "#F59E0B", "#EC4899", "#14B8A6", "#F4F1EC"];
const VARIABLES = ["{displayname}", "{username}", "{membercount}", "{server}", "{accountage}"];

const fieldCls =
  "w-full rounded-[var(--inset-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/60";

function Segmented<T extends string>({ id, value, options, onChange, render }: { id: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; render?: (o: { id: T; label: string }) => React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative isolate flex h-9 items-center justify-center gap-1.5 rounded-[calc(var(--inset-radius)-4px)] text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
            value === o.id ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {value === o.id && <motion.span layoutId={id} transition={{ type: "spring", stiffness: 450, damping: 43 }} className="absolute inset-0 -z-10 rounded-[inherit] bg-[var(--accent-primary)]" />}
          {render ? render(o) : o.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-11 shrink-0 cursor-pointer rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-transparent p-1" aria-label={label} />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toUpperCase());
          }}
          maxLength={7}
          className={cn(fieldCls, "font-mono uppercase")}
        />
      </span>
    </label>
  );
}

export default function WelcomeCardDesigner({
  apiBase,
  guildId,
  welcomeImage,
  goodbyeImage,
  onChange,
  onSave,
  saving,
}: {
  apiBase: string;
  guildId: string;
  welcomeImage?: Partial<CardImageConfig>;
  goodbyeImage?: Partial<CardImageConfig>;
  /** Patch à fusionner dans l'image du type donné (fusion faite par le parent sur l'état le plus récent). */
  onChange: (kind: "welcome" | "goodbye", patch: Partial<CardImageConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [kind, setKind] = useState<"welcome" | "goodbye">("welcome");
  const img: CardImageConfig = { ...CARD_DEFAULTS, ...(kind === "welcome" ? welcomeImage : goodbyeImage) };
  const set = (patch: Partial<CardImageConfig>) => onChange(kind, patch);

  const [preview, setPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgDraft, setBgDraft] = useState(img.customBackgroundUrl ?? "");
  const lastFocused = useRef<"titleText" | "subtitleText" | "tagText">("subtitleText");
  const key = JSON.stringify(img);

  useEffect(() => setBgDraft(img.customBackgroundUrl ?? ""), [img.customBackgroundUrl, kind]);

  // Aperçu réel (généré par le bot), 500 ms après le dernier changement.
  useEffect(() => {
    if (!apiBase || !guildId) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`${apiBase}/api/guilds/${guildId}/welcome/preview-card`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageConfig: JSON.parse(key) }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        const url = URL.createObjectURL(await res.blob());
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      } catch {
        if (!ctrl.signal.aborted) setPreviewError("Aperçu indisponible : le bot ne répond pas.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [apiBase, guildId, key]);

  useEffect(() => () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  function insertVariable(v: string) {
    const k = lastFocused.current;
    set({ [k]: `${img[k]}${img[k] && !img[k].endsWith(" ") ? " " : ""}${v}` } as Partial<CardImageConfig>);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Réglages */}
      <div className="stagger-children space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Carte de bienvenue</h2>
            <p className="text-xs text-[var(--text-muted)]">L&apos;image envoyée à chaque arrivée (ou départ). Aussi réglable sur Discord avec <code className="font-mono">/bienvenue carte</code>.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(kind, { ...CARD_DEFAULTS, ...(kind === "goodbye" ? { titleText: "À BIENTÔT", tagText: "{membercount} membres restants", accentColor: "#ED4245" } : {}) })}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="btn-sheen relative inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-4 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <Segmented id="card-kind" value={kind} onChange={setKind} options={[{ id: "welcome", label: "Bienvenue" }, { id: "goodbye", label: "Départ" }]} />

        <label className="flex items-center justify-between gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-2.5">
          <span className="text-sm text-[var(--text-primary)]">Envoyer la carte avec le message</span>
          <input type="checkbox" checked={img.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-[var(--accent-primary)]" />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Mise en page</span>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={img.template === t.id}
                onClick={() => set({ template: t.id })}
                className={cn(
                  "relative isolate rounded-[var(--inset-radius)] border p-3 text-left outline-none transition-[border-color,transform] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.98]",
                  img.template === t.id ? "border-transparent" : "border-[var(--panel-border)] hover:border-[var(--input-border-hover)]"
                )}
              >
                {img.template === t.id && <motion.span layoutId="card-template" transition={{ type: "spring", stiffness: 420, damping: 41 }} className="absolute inset-0 -z-10 rounded-[inherit] border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10" />}
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{t.label}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Couleur d&apos;accent</span>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ accentColor: c })}
                aria-label={`Accent ${c}`}
                className={cn("h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95", img.accentColor.toUpperCase() === c ? "border-[var(--text-primary)]" : "border-transparent")}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ColorField label="Accent" value={img.accentColor} onChange={(v) => set({ accentColor: v })} />
          <ColorField label="Fond" value={img.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
          <ColorField label="Texte" value={img.textColor} onChange={(v) => set({ textColor: v })} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Police</span>
            <Segmented id="card-font" value={img.font} onChange={(v) => set({ font: v })} options={FONTS} render={(o) => <span className={FONTS.find((f) => f.id === o.id)?.sample}>{o.label}</span>} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Avatar</span>
            <Segmented
              id="card-shape"
              value={img.avatarShape}
              onChange={(v) => set({ avatarShape: v })}
              options={SHAPES}
              render={(o) => (
                <>
                  <span className={cn("h-3.5 w-3.5 border-2 border-current", SHAPES.find((s) => s.id === o.id)?.radius)} />
                  {o.label}
                </>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          {([
            ["titleText", "Ligne du haut", "BIENVENUE", 60],
            ["subtitleText", "Ligne principale", "{displayname}", 80],
            ["tagText", "Ligne secondaire", "Membre #{membercount}", 120],
          ] as const).map(([k, label, ph, max]) => (
            <label key={k} className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
              <input value={img[k]} maxLength={max} placeholder={ph} onFocus={() => (lastFocused.current = k)} onChange={(e) => set({ [k]: e.target.value } as Partial<CardImageConfig>)} className={fieldCls} />
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Insérer :</span>
            {VARIABLES.map((v) => (
              <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertVariable(v)} className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] active:scale-95">
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Image de fond (facultatif)</span>
          <div className="flex gap-2">
            <input
              value={bgDraft}
              onChange={(e) => setBgDraft(e.target.value)}
              onBlur={() => set({ customBackgroundUrl: /^https:\/\/\S+$/i.test(bgDraft.trim()) ? bgDraft.trim() : null })}
              placeholder="https://… (lien direct vers une image)"
              className={fieldCls}
            />
            {img.customBackgroundUrl && (
              <button type="button" onClick={() => set({ customBackgroundUrl: null })} className="shrink-0 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Retirer
              </button>
            )}
          </div>
          {bgDraft && !/^https:\/\/\S+$/i.test(bgDraft.trim()) && <p className="text-[11px] text-[var(--danger)]">Le lien doit commencer par https://</p>}
          <label className={cn("block space-y-1", !img.customBackgroundUrl && "opacity-50")}>
            <span className="flex justify-between text-[11px] text-[var(--text-muted)]">
              <span>Voile sur l&apos;image (lisibilité)</span>
              <span className="tabular-nums">{img.overlayOpacity} %</span>
            </span>
            <input type="range" min={0} max={90} step={5} value={img.overlayOpacity} disabled={!img.customBackgroundUrl} onChange={(e) => set({ overlayOpacity: Number(e.target.value) })} className="w-full accent-[var(--accent-primary)]" />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-2.5">
          <span className="text-sm text-[var(--text-primary)]">Afficher le nom du serveur</span>
          <input type="checkbox" checked={img.showServerName} onChange={(e) => set({ showServerName: e.target.checked })} className="h-4 w-4 accent-[var(--accent-primary)]" />
        </label>

        <label className={cn("flex items-center justify-between gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-2.5 transition-opacity", Boolean(img.customBackgroundUrl) && "opacity-50")}>
          <div className="space-y-0.5">
            <span className="text-sm text-[var(--text-primary)]">Carte animée (GIF)</span>
            <p className="text-[11px] text-[var(--text-muted)]">
              {img.customBackgroundUrl
                ? "Désactivée avec une image de fond personnalisée (carte PNG statique)."
                : "Animation fluide en boucle (lueurs d'accent, particules et halo respirant)."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={img.animated}
            disabled={Boolean(img.customBackgroundUrl)}
            onChange={(e) => set({ animated: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent-primary)] cursor-pointer"
          />
        </label>
      </div>

      {/* Aperçu réel */}
      <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Aperçu réel (généré par le bot)</span>
          <div className="flex items-center gap-2">
            {img.enabled && img.animated && !img.customBackgroundUrl && (
              <span className="rounded bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--accent-primary)]">GIF animé</span>
            )}
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40" style={{ aspectRatio: "8 / 3" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={preview} src={preview} alt="Aperçu de la carte" className={cn("pop-in h-full w-full object-cover transition-opacity", loading && "opacity-70")} />
          ) : (
            <div className="grid h-full place-items-center text-center text-xs text-[var(--text-muted)]">
              <span className="flex flex-col items-center gap-2">
                <ImageIcon className="h-6 w-6" />
                {previewError || "Génération de l’aperçu…"}
              </span>
            </div>
          )}
        </div>
        {!img.enabled && <p className="text-xs text-[var(--warning)]">La carte est désactivée : le message partira sans image.</p>}
        <p className="text-[11px] text-[var(--text-muted)]">L&apos;aperçu utilise ton avatar et le vrai nombre de membres du serveur. N&apos;oublie pas d&apos;enregistrer.</p>
      </div>
    </div>
  );
}
