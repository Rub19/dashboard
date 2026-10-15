"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Braces, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { BOT_API_URL, Select, Switch, useGuildApi } from "../kit";
import { VARIABLES, iconSources, uid, type Button, type Embed, type Field, type IconSource, type MessageCommon } from "./types";

export const INPUT =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--accent-primary)]/70";

/** Envoie une image au bot (PNG, JPG, GIF ou WebP, 4 Mo max) et renvoie son URL publique. */
export function useAssetUpload(guildId: string) {
  const api = useGuildApi(guildId);
  const { error } = useToast();
  return async (file: File): Promise<string | null> => {
    if (file.size > 4 * 1024 * 1024) {
      error("Image trop lourde", "4 Mo au maximum.");
      return null;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const res = await api<{ url: string }>("/welcome/assets", { method: "POST", json: { dataUrl } });
    return res ? `${BOT_API_URL}${res.url}` : null;
  };
}

export function UploadButton({ guildId, onUploaded, label = "Envoyer" }: { guildId: string; onUploaded: (url: string) => void; label?: string }) {
  const upload = useAssetUpload(guildId);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const url = await upload(f);
          setBusy(false);
          if (url) onUploaded(url);
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-3 text-xs font-semibold text-[var(--text-primary)] transition-[background-color,transform] hover:bg-[var(--surface-hover)] active:scale-[0.97] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        {label}
      </button>
    </>
  );
}

/** Bouton « { } Variables » : insère la variable à la position du curseur du champ voisin. */
function VariablesMenu({ onPick }: { onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
        <Braces className="h-3 w-3" />
        Variables
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={SPRING_LAYOUT}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-50 mt-1.5 max-h-72 w-72 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1.5 shadow-2xl"
          >
            {VARIABLES.map(([v, label]) => (
              <li key={v}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(v);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <span className="font-mono text-[12px] text-[var(--accent-primary)]">{v}</span>
                  <span className="truncate text-[11px] text-[var(--text-muted)]">{label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VarField({
  label,
  value,
  onChange,
  rows,
  max = 2000,
  placeholder,
  aside,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
  placeholder?: string;
  aside?: ReactNode;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const insert = (v: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = (value.slice(0, start) + v + value.slice(end)).slice(0, max);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + v.length, start + v.length);
    });
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        {label ? <span className="text-[12px] font-semibold text-[var(--text-primary)]">{label}</span> : <span />}
        <div className="flex items-center gap-3">
          {aside}
          <VariablesMenu onPick={insert} />
        </div>
      </div>
      {rows ? (
        <textarea ref={ref} value={value} rows={rows} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, "resize-y py-2 leading-relaxed")} />
      ) : (
        <input ref={ref} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, "h-9")} />
      )}
    </div>
  );
}

function PlainField({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-[var(--text-primary)]">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, "h-9", mono && "font-mono")} />
    </label>
  );
}

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = /^#[0-9a-f]{6}$/i.test(draft);
  return (
    <div className="flex items-center gap-2">
      <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#5865F2"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent p-1" />
      <input
        value={draft}
        maxLength={7}
        aria-label={`${label} (hexadécimal)`}
        onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          setDraft(v.toUpperCase());
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toUpperCase());
        }}
        className={cn(INPUT, "h-9 w-28 font-mono", !valid && "border-[var(--danger)]")}
      />
    </div>
  );
}

const SOURCE_LABEL: Record<IconSource, string> = { none: "Aucune", server: "Icône du serveur", member: "Avatar du membre", custom: "Image envoyée" };

function IconRow({ guildId, label, source, url, onChange, preview }: { guildId: string; label: string; source: IconSource; url: string | null; onChange: (source: IconSource, url?: string | null) => void; preview?: string | null }) {
  const options = (["none", "server", "member", "custom"] as const).map((s) => ({ value: s, label: SOURCE_LABEL[s], disabled: s === "custom" && !url }));
  return (
    <div className="space-y-1.5">
      <span className="text-[12px] font-semibold text-[var(--text-primary)]">{label}</span>
      <div className="flex items-center gap-2">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-[var(--panel-border)] object-cover" />
        )}
        <Select value={source} options={options} onChange={(v) => onChange(v)} width="flex-1" aria-label={label} />
        <UploadButton guildId={guildId} onUploaded={(u) => onChange("custom", u)} />
      </div>
    </div>
  );
}

function SubCard({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">{title}</span>
        {actions}
      </div>
      <div className="space-y-3.5 p-4 pt-3">{children}</div>
    </div>
  );
}

type Props = {
  guildId: string;
  message: MessageCommon;
  onChange: (patch: Partial<MessageCommon>) => void;
  dm?: boolean;
  imageOn: boolean;
  onImageToggle: (v: boolean) => void;
  previews: { server: string | null; member: string | null };
};

/** Contenu d'un message (format Keeper) : texte au-dessus, embed ou container complet, champs et boutons liens. */
export default function MessageEditor({ guildId, message, onChange, dm, imageOn, onImageToggle, previews }: Props) {
  const e = message.embed;
  const src = iconSources(e, dm);
  const embed = (patch: Partial<Embed>) => onChange({ embed: { ...e, ...patch } });
  const format = message.format ?? (e.enabled ? "embed" : "text");
  const srcPreview = (s: IconSource, url: string | null) => (s === "member" ? previews.member : s === "server" ? previews.server : s === "custom" ? url : null);
  const fields = e.fields ?? [];
  const setField = (id: string, patch: Partial<Field>) => embed({ fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const buttons = (message.buttons ?? []).filter((b) => b.action === "URL");
  const setButtons = (next: Button[]) => onChange({ buttons: next });

  if (format === "text")
    return (
      <div className="space-y-4 p-5">
        <VarField label="Message" value={message.messageContent} rows={5} onChange={(v) => onChange({ messageContent: v })} />
        <ButtonsEditor buttons={buttons} onChange={setButtons} />
      </div>
    );

  return (
    <div className="space-y-4 p-5">
      <VarField label={format === "embed" ? "Texte au-dessus de l'embed" : "Texte au-dessus du container"} value={message.contentAbove} placeholder="Ho ! Un nouveau membre !" onChange={(v) => onChange({ contentAbove: v })} />

      <SubCard title={format === "embed" ? "Embed" : "Container"}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <VarField label="Titre" value={e.title} max={256} onChange={(v) => embed({ title: v })} />
          <div className="space-y-1.5">
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">Couleur</span>
            <ColorField label="Couleur" value={e.color} onChange={(v) => embed({ color: v })} />
          </div>
        </div>
        <PlainField label="Lien du titre" value={e.url ?? ""} placeholder="https://…" mono onChange={(v) => embed({ url: v.trim() })} />
        <VarField label="Description" value={e.description} rows={5} max={4000} onChange={(v) => embed({ description: v })} />
        <VarField label="En-tête" value={e.authorName} max={256} onChange={(v) => embed({ authorName: v })} />
        <IconRow guildId={guildId} label="Icône de l'en-tête" source={src.author} url={e.authorIconUrl} preview={srcPreview(src.author, e.authorIconUrl)} onChange={(s, u) => embed({ authorIcon: s, ...(u !== undefined ? { authorIconUrl: u } : {}) })} />
        <IconRow
          guildId={guildId}
          label="Vignette"
          source={src.thumbnail}
          url={e.thumbnailUrl}
          preview={srcPreview(src.thumbnail, e.thumbnailUrl)}
          onChange={(s, u) => embed({ thumbnail: s, showThumbnail: s !== "none", ...(u !== undefined ? { thumbnailUrl: u } : {}) })}
        />
        {!imageOn && (
          <IconRow guildId={guildId} label="Grande image" source={src.image} url={e.imageUrl} preview={srcPreview(src.image, e.imageUrl)} onChange={(s, u) => embed({ imageSource: s, ...(u !== undefined ? { imageUrl: u } : {}) })} />
        )}
        <VarField label="Pied de page" value={e.footer} max={2048} onChange={(v) => embed({ footer: v })} />
        <IconRow guildId={guildId} label="Icône du pied de page" source={src.footer} url={e.footerIconUrl} preview={srcPreview(src.footer, e.footerIconUrl)} onChange={(s, u) => embed({ footerIcon: s, ...(u !== undefined ? { footerIconUrl: u } : {}) })} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">Heure d&apos;envoi dans le pied de page</span>
          <Switch checked={e.showTimestamp} onChange={(v) => embed({ showTimestamp: v })} label="Heure d'envoi" />
        </div>
      </SubCard>

      <SubCard
        title={`Champs · ${fields.length}/10`}
        actions={
          fields.length < 10 && (
            <button type="button" onClick={() => embed({ fields: [...fields, { id: uid(), name: "Titre du champ", value: "Valeur du champ", inline: false }] })} className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          )
        }
      >
        {fields.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Aucun champ.</p>
        ) : (
          <AnimatePresence initial={false}>
            {fields.map((f) => (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="space-y-2 rounded-lg border border-[var(--panel-border)] p-3">
                <div className="flex items-center gap-2">
                  <input value={f.name} maxLength={256} onChange={(ev) => setField(f.id, { name: ev.target.value })} aria-label="Titre du champ" className={cn(INPUT, "h-8 flex-1")} />
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    En ligne
                    <Switch checked={f.inline} onChange={(v) => setField(f.id, { inline: v })} label="Champ en ligne" />
                  </label>
                  <button type="button" onClick={() => embed({ fields: fields.filter((x) => x.id !== f.id) })} aria-label="Supprimer le champ" className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea value={f.value} rows={2} maxLength={1024} onChange={(ev) => setField(f.id, { value: ev.target.value })} aria-label="Valeur du champ" className={cn(INPUT, "py-2")} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </SubCard>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-4 py-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{dm ? "Joindre l'image d'arrivée" : "Image personnalisée"}</span>
        <Switch checked={imageOn} onChange={onImageToggle} label="Image personnalisée" />
      </div>

      <ButtonsEditor buttons={buttons} onChange={setButtons} />
    </div>
  );
}

function ButtonsEditor({ buttons, onChange }: { buttons: Button[]; onChange: (b: Button[]) => void }) {
  const set = (id: string, patch: Partial<Button>) => onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  return (
    <SubCard title="Boutons liens">
      <AnimatePresence initial={false}>
        {buttons.map((b) => {
          const bad = Boolean(b.target) && !/^https:\/\/\S+$/i.test(b.target);
          return (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex flex-wrap items-center gap-2">
              <input value={b.label} maxLength={80} placeholder="Texte du bouton" onChange={(e) => set(b.id, { label: e.target.value })} aria-label="Texte du bouton" className={cn(INPUT, "h-8 w-40")} />
              <input value={b.target} placeholder="https://…" onChange={(e) => set(b.id, { target: e.target.value.trim() })} aria-label="Lien du bouton" className={cn(INPUT, "h-8 min-w-0 flex-1 font-mono", bad && "border-[var(--danger)]")} />
              <button type="button" onClick={() => onChange(buttons.filter((x) => x.id !== b.id))} aria-label="Supprimer le bouton" className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {buttons.length < 5 && (
        <button
          type="button"
          onClick={() => onChange([...buttons, { id: uid(), label: "", emoji: null, style: "LINK", action: "URL", target: "" }])}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un bouton
        </button>
      )}
    </SubCard>
  );
}
