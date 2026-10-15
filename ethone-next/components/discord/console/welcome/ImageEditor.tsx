"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Circle, Eye, EyeOff, ImageIcon, LayoutTemplate, Square, Trash2, Type, Undo2, UserRound } from "lucide-react";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Segmented, Select, Switch } from "../kit";
import { ColorField, INPUT, UploadButton, VarField } from "./MessageEditor";
import { fillVars, type Viewer } from "./DiscordPreview";
import { SIZE_OPTIONS, SIZE_PX, TEMPLATES, uid, type Background, type CardImage, type CardSize, type Layer, type Meta } from "./types";

const FONT_CSS: Record<string, string> = {
  poppins: "Poppins, 'Segoe UI', system-ui, sans-serif",
  bebas: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Space Mono', ui-monospace, monospace",
};
const SNAP = 8;

function layerName(l: Layer) {
  if (l.type === "text") return l.text || "Texte vide";
  if (l.type === "avatar") return "Avatar du membre";
  if (l.type === "image") return "Image";
  return l.shape === "circle" ? "Cercle" : "Rectangle";
}

function bgCss(bg: Background) {
  if (bg.type === "gradient") return `linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2})`;
  const veil = `${bg.color}${Math.round((bg.overlay / 100) * 255).toString(16).padStart(2, "0")}`;
  if (bg.type === "image" && bg.url) return `linear-gradient(${veil}, ${veil}), url("${bg.url}") center / cover, ${bg.color}`;
  return bg.color;
}

function Num({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-[11px] text-[var(--text-muted)]">
        {label}
        <span className="font-mono tabular-nums">{Number(value.toFixed(2))}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent-primary)]" />
    </label>
  );
}

type Props = { guildId: string; image: CardImage; onChange: (patch: Partial<CardImage>) => void; viewer: Viewer; meta: Meta; goodbye?: boolean };

/** Image personnalisée à calques (format Keeper) : modèles, texte, avatar, image, forme, fond et taille. */
export default function ImageEditor({ guildId, image, onChange, viewer, meta, goodbye }: Props) {
  const size: CardSize = image.size ?? "large";
  const [W, H] = SIZE_PX[size];
  const bg: Background = image.background ?? { type: "gradient", color: "#1E1F22", color2: "#5865F2", angle: 135, url: "", overlay: 0 };
  const layers = image.layers ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const history = useRef<Array<Pick<CardImage, "size" | "background" | "layers">>>([]);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; start: Layer } | null>(null);
  const [guides, setGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  useEffect(() => {
    if (image.layers) return;
    const t = TEMPLATES.find((x) => x.id === (goodbye ? "goodbye" : "center"))!;
    onChange({ size: "large", ...t.build("large", image) });
  }, [image, goodbye, onChange]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    setScale(el.clientWidth / W);
    return () => ro.disconnect();
  }, [W]);

  const commit = (patch: Partial<CardImage>) => {
    history.current = [...history.current.slice(-29), { size: image.size, background: image.background, layers: image.layers }];
    onChange(patch);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) onChange(prev);
  };
  const setLayers = (next: Layer[]) => commit({ layers: next });
  const patchLayer = (id: string, patch: Partial<Layer>, record = true) => {
    const next = layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l));
    if (record) setLayers(next);
    else onChange({ layers: next });
  };
  const add = (layer: Layer) => {
    setLayers([...layers, layer]);
    setSelected(layer.id);
  };
  const sel = layers.find((l) => l.id === selected) ?? null;

  const center = (l: Layer): [number, number] =>
    l.type === "text" ? [l.align === "center" ? l.x : l.align === "left" ? l.x + l.size * 2 : l.x - l.size * 2, l.y] : l.type === "avatar" ? [l.x + l.size / 2, l.y + l.size / 2] : [l.x + l.w / 2, l.y + l.h / 2];

  const onDown = (e: RPointerEvent, l: Layer, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(l.id);
    history.current = [...history.current.slice(-29), { size: image.size, background: image.background, layers: image.layers }];
    drag.current = { id: l.id, mode, sx: e.clientX, sy: e.clientY, start: l };
  };
  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    const s = d.start;
    if (d.mode === "move") {
      let x = Math.round(s.x + dx);
      let y = Math.round(s.y + dy);
      const [cx, cy] = center({ ...s, x, y } as Layer);
      const snapX = !e.altKey && Math.abs(cx - W / 2) < SNAP / scale;
      const snapY = !e.altKey && Math.abs(cy - H / 2) < SNAP / scale;
      if (snapX) x += Math.round(W / 2 - cx);
      if (snapY) y += Math.round(H / 2 - cy);
      setGuides({ x: snapX, y: snapY });
      patchLayer(s.id, { x, y }, false);
    } else if (s.type === "text") patchLayer(s.id, { size: Math.max(8, Math.min(240, Math.round(s.size + dy))) }, false);
    else if (s.type === "avatar") patchLayer(s.id, { size: Math.max(16, Math.min(1000, Math.round(s.size + Math.max(dx, dy)))) }, false);
    else patchLayer(s.id, { w: Math.max(8, Math.round(s.w + dx)), h: Math.max(8, Math.round(s.h + dy)) }, false);
  };
  const onUp = () => {
    drag.current = null;
    setGuides({ x: false, y: false });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!sel) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      patchLayer(sel.id, { x: sel.x + moves[e.key][0], y: sel.y + moves[e.key][1] });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      setLayers(layers.filter((l) => l.id !== sel.id));
      setSelected(null);
    }
  };
  const move = (id: string, dir: 1 | -1) => {
    const i = layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= layers.length) return;
    const next = [...layers];
    [next[i], next[j]] = [next[j], next[i]];
    setLayers(next);
  };
  const setBg = (patch: Partial<Background>) => commit({ background: { ...bg, ...patch } });
  const resize = (next: CardSize) => {
    const [nw, nh] = SIZE_PX[next];
    const sx = nw / W;
    const sy = nh / H;
    commit({
      size: next,
      layers: layers.map((l) =>
        l.type === "text"
          ? { ...l, x: Math.round(l.x * sx), y: Math.round(l.y * sy), size: Math.round(l.size * Math.min(sx, sy)), maxWidth: Math.round(l.maxWidth * sx) }
          : l.type === "avatar"
            ? { ...l, x: Math.round(l.x * sx), y: Math.round(l.y * sy), size: Math.round(l.size * Math.min(sx, sy)) }
            : { ...l, x: Math.round(l.x * sx), y: Math.round(l.y * sy), w: Math.round(l.w * sx), h: Math.round(l.h * sy) }
      ),
    });
  };

  const tool = "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[1fr_15rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setShowTemplates((v) => !v)} className={cn(tool, showTemplates && "bg-[var(--surface-hover)] text-[var(--text-primary)]")}>
            <LayoutTemplate className="h-3.5 w-3.5" />
            Modèles
          </button>
          <button type="button" className={tool} onClick={() => add({ id: uid(), type: "text", visible: true, x: Math.round(W / 2), y: Math.round(H / 2), text: "Nouveau texte", size: Math.round(H * 0.08), color: "#FFFFFF", font: "poppins", weight: "700", align: "center", maxWidth: W - 80, uppercase: false, opacity: 1 })}>
            <Type className="h-3.5 w-3.5" />
            Texte
          </button>
          <button type="button" className={tool} onClick={() => add({ id: uid(), type: "avatar", visible: true, x: Math.round(W / 2 - H * 0.15), y: Math.round(H * 0.1), size: Math.round(H * 0.3), shape: "circle", borderWidth: 6, borderColor: "#FFFFFF" })}>
            <UserRound className="h-3.5 w-3.5" />
            Avatar
          </button>
          <button type="button" className={tool} onClick={() => add({ id: uid(), type: "image", visible: true, x: 40, y: 40, url: "", w: Math.round(H * 0.4), h: Math.round(H * 0.4), radius: 12, opacity: 1 })}>
            <ImageIcon className="h-3.5 w-3.5" />
            Image
          </button>
          <button type="button" className={tool} onClick={() => add({ id: uid(), type: "shape", visible: true, x: Math.round(W / 2 - 150), y: Math.round(H * 0.8), shape: "rect", w: 300, h: 8, radius: 4, color: "#FFFFFF", opacity: 0.5 })}>
            <Square className="h-3.5 w-3.5" />
            Forme
          </button>
          <button type="button" onClick={undo} disabled={!history.current.length} className={cn(tool, "ml-auto disabled:opacity-40")}>
            <Undo2 className="h-3.5 w-3.5" />
            Annuler
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showTemplates && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TEMPLATES.map((t) => {
                  const built = t.build(size, image);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        commit({ ...built });
                        setSelected(null);
                        setShowTemplates(false);
                      }}
                      className="group overflow-hidden rounded-lg border border-[var(--panel-border)] text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/60"
                    >
                      <div className="aspect-[16/7]" style={{ background: bgCss(built.background) }} />
                      <p className="px-2 py-1.5 text-[11px] font-semibold text-[var(--text-primary)]">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={box}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerDown={() => setSelected(null)}
          className="relative w-full touch-none select-none overflow-hidden rounded-xl outline-none ring-[var(--accent-primary)]/40 focus-visible:ring-2"
          style={{ aspectRatio: `${W} / ${H}`, background: bgCss(bg) }}
        >
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
            {layers.map((l) => {
              if (!l.visible) return null;
              const isSel = l.id === selected;
              const ring = isSel ? "outline outline-2 outline-offset-2 outline-[var(--accent-primary)]" : "hover:outline hover:outline-1 hover:outline-white/40";
              const handle = isSel && (
                <span onPointerDown={(e) => onDown(e, l, "resize")} className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[var(--accent-primary)]" style={{ transform: `scale(${1 / scale})` }} />
              );
              if (l.type === "text") {
                const shift = l.align === "center" ? "-50%" : l.align === "right" ? "-100%" : "0";
                const t = fillVars(l.text, viewer, meta, false);
                return (
                  <div
                    key={l.id}
                    onPointerDown={(e) => onDown(e, l, "move")}
                    className={cn("absolute cursor-move whitespace-nowrap leading-none", ring)}
                    style={{ left: l.x, top: l.y, transform: `translate(${shift}, -50%)`, maxWidth: l.maxWidth, overflow: "hidden", textOverflow: "ellipsis", color: l.color, fontSize: l.size, fontFamily: FONT_CSS[l.font], fontWeight: Number(l.weight), opacity: l.opacity, textAlign: l.align }}
                  >
                    {l.uppercase ? t.toUpperCase() : t}
                    {handle}
                  </div>
                );
              }
              if (l.type === "avatar")
                return (
                  <div
                    key={l.id}
                    onPointerDown={(e) => onDown(e, l, "move")}
                    className={cn("absolute cursor-move", ring)}
                    style={{ left: l.x - l.borderWidth, top: l.y - l.borderWidth, width: l.size + l.borderWidth * 2, height: l.size + l.borderWidth * 2, background: l.borderColor, padding: l.borderWidth, borderRadius: l.shape === "circle" ? "50%" : l.shape === "rounded" ? "28%" : "6%" }}
                  >
                    {viewer.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={viewer.avatar} alt="" draggable={false} className="h-full w-full object-cover" style={{ borderRadius: l.shape === "circle" ? "50%" : l.shape === "rounded" ? "28%" : "6%" }} />
                    ) : (
                      <div className="h-full w-full bg-[#5865F2]" style={{ borderRadius: "inherit" }} />
                    )}
                    {handle}
                  </div>
                );
              if (l.type === "image")
                return (
                  <div key={l.id} onPointerDown={(e) => onDown(e, l, "move")} className={cn("absolute cursor-move", ring)} style={{ left: l.x, top: l.y, width: l.w, height: l.h, opacity: l.opacity }}>
                    {l.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.url} alt="" draggable={false} className="h-full w-full object-cover" style={{ borderRadius: l.radius }} />
                    ) : (
                      <div className="grid h-full w-full place-items-center border-2 border-dashed border-white/40 text-white/60" style={{ borderRadius: l.radius }}>
                        <ImageIcon style={{ width: 32 / scale, height: 32 / scale }} />
                      </div>
                    )}
                    {handle}
                  </div>
                );
              return (
                <div
                  key={l.id}
                  onPointerDown={(e) => onDown(e, l, "move")}
                  className={cn("absolute cursor-move", ring)}
                  style={{ left: l.x, top: l.y, width: l.w, height: l.h, background: l.color, opacity: l.opacity, borderRadius: l.shape === "circle" ? "50%" : l.radius }}
                >
                  {handle}
                </div>
              );
            })}
          </div>
          {guides.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[var(--accent-primary)]" />}
          {guides.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[var(--accent-primary)]" />}
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">Glisse les éléments, poignée en bas à droite pour la taille. Flèches pour ajuster, Alt pour ne pas aimanter au centre.</p>

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)]">
          <p className="border-b border-[var(--panel-border)] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)]">Calques · {layers.length}/20</p>
          <ul>
            <AnimatePresence initial={false}>
              {[...layers].reverse().map((l) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING_LAYOUT}
                  onClick={() => setSelected(l.id)}
                  className={cn("flex cursor-pointer items-center gap-2 border-t border-[var(--panel-border)] px-3 py-1.5 first:border-t-0 transition-colors", l.id === selected ? "bg-[var(--accent-primary)]/10" : "hover:bg-[var(--surface-hover)]")}
                >
                  <span className="text-[var(--text-muted)]">
                    {l.type === "text" ? <Type className="h-3.5 w-3.5" /> : l.type === "avatar" ? <UserRound className="h-3.5 w-3.5" /> : l.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : l.shape === "circle" ? <Circle className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-xs", l.visible ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through")}>{layerName(l)}</span>
                  <button type="button" aria-label={l.visible ? "Masquer" : "Afficher"} onClick={(e) => (e.stopPropagation(), patchLayer(l.id, { visible: !l.visible }))} className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" aria-label="Monter" onClick={(e) => (e.stopPropagation(), move(l.id, 1))} className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="Descendre" onClick={(e) => (e.stopPropagation(), move(l.id, -1))} className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {sel && (
            <motion.div key={sel.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={SPRING_PILL} className="space-y-3 rounded-xl border border-[var(--panel-border)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">{layerName(sel).slice(0, 24)}</span>
                <button type="button" aria-label="Supprimer le calque" onClick={() => (setLayers(layers.filter((l) => l.id !== sel.id)), setSelected(null))} className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {sel.type === "text" && (
                <>
                  <VarField value={sel.text} max={200} onChange={(v) => patchLayer(sel.id, { text: v })} />
                  <Num label="Taille" value={sel.size} min={8} max={240} onChange={(n) => patchLayer(sel.id, { size: n })} />
                  <ColorField label="Couleur du texte" value={sel.color} onChange={(v) => patchLayer(sel.id, { color: v })} />
                  <Select value={sel.font} width="w-full" aria-label="Police" options={[["poppins", "Poppins"], ["bebas", "Bebas"], ["serif", "Serif"], ["mono", "Mono"]]} onChange={(v) => patchLayer(sel.id, { font: v })} />
                  <Segmented label="Graisse" value={sel.weight} options={[["400", "Normal"], ["600", "Semi"], ["700", "Gras"], ["800", "Noir"]]} onChange={(v) => patchLayer(sel.id, { weight: v })} />
                  <Segmented label="Alignement" value={sel.align} options={[["left", "Gauche"], ["center", "Centre"], ["right", "Droite"]]} onChange={(v) => patchLayer(sel.id, { align: v })} />
                  <Num label="Largeur max" value={sel.maxWidth} min={40} max={W} onChange={(n) => patchLayer(sel.id, { maxWidth: n })} />
                  <Num label="Opacité" value={sel.opacity} min={0} max={1} step={0.05} onChange={(n) => patchLayer(sel.id, { opacity: n })} />
                  <label className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    Majuscules
                    <Switch checked={sel.uppercase} onChange={(v) => patchLayer(sel.id, { uppercase: v })} label="Majuscules" />
                  </label>
                </>
              )}
              {sel.type === "avatar" && (
                <>
                  <Num label="Taille" value={sel.size} min={16} max={Math.min(W, H)} onChange={(n) => patchLayer(sel.id, { size: n })} />
                  <Segmented label="Forme" value={sel.shape} options={[["circle", "Rond"], ["rounded", "Arrondi"], ["square", "Carré"]]} onChange={(v) => patchLayer(sel.id, { shape: v })} />
                  <Num label="Bordure" value={sel.borderWidth} min={0} max={40} onChange={(n) => patchLayer(sel.id, { borderWidth: n })} />
                  <ColorField label="Couleur de bordure" value={sel.borderColor} onChange={(v) => patchLayer(sel.id, { borderColor: v })} />
                </>
              )}
              {sel.type === "image" && (
                <>
                  <UploadButton guildId={guildId} label={sel.url ? "Remplacer l'image" : "Envoyer une image"} onUploaded={(u) => patchLayer(sel.id, { url: u })} />
                  <Num label="Arrondi" value={sel.radius} min={0} max={Math.round(Math.min(sel.w, sel.h) / 2)} onChange={(n) => patchLayer(sel.id, { radius: n })} />
                  <Num label="Opacité" value={sel.opacity} min={0} max={1} step={0.05} onChange={(n) => patchLayer(sel.id, { opacity: n })} />
                </>
              )}
              {sel.type === "shape" && (
                <>
                  <Segmented label="Forme" value={sel.shape} options={[["rect", "Rectangle"], ["circle", "Cercle"]]} onChange={(v) => patchLayer(sel.id, { shape: v })} />
                  <ColorField label="Couleur de la forme" value={sel.color} onChange={(v) => patchLayer(sel.id, { color: v })} />
                  <Num label="Opacité" value={sel.opacity} min={0} max={1} step={0.05} onChange={(n) => patchLayer(sel.id, { opacity: n })} />
                  {sel.shape === "rect" && <Num label="Arrondi" value={sel.radius} min={0} max={Math.round(Math.min(sel.w, sel.h) / 2)} onChange={(n) => patchLayer(sel.id, { radius: n })} />}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 rounded-xl border border-[var(--panel-border)] p-3">
          <span className="text-xs font-bold text-[var(--text-primary)]">Fond et taille</span>
          <div className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)]">Taille</span>
            <Select value={size} width="w-full" aria-label="Taille de l'image" options={SIZE_OPTIONS} onChange={resize} />
          </div>
          <Segmented label="Fond" value={bg.type} options={[["color", "Couleur"], ["gradient", "Dégradé"], ["image", "Image"]]} onChange={(v) => setBg({ type: v })} />
          <div className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)]">{bg.type === "gradient" ? "Première couleur" : "Couleur"}</span>
            <ColorField label="Couleur du fond" value={bg.color} onChange={(v) => setBg({ color: v })} />
          </div>
          {bg.type === "gradient" && (
            <>
              <div className="space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">Seconde couleur</span>
                <ColorField label="Seconde couleur" value={bg.color2} onChange={(v) => setBg({ color2: v })} />
              </div>
              <Num label="Angle" value={bg.angle} min={0} max={360} onChange={(n) => setBg({ angle: n })} />
            </>
          )}
          {bg.type === "image" && (
            <>
              <UploadButton guildId={guildId} label={bg.url ? "Remplacer le fond" : "Envoyer un fond"} onUploaded={(u) => setBg({ url: u })} />
              <input value={bg.url} placeholder="https://…" onChange={(e) => setBg({ url: e.target.value.trim() })} aria-label="Lien de l'image de fond" className={cn(INPUT, "h-8 font-mono text-xs")} />
              <Num label="Voile" value={bg.overlay} min={0} max={90} onChange={(n) => setBg({ overlay: n })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
