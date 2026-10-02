"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileArchive,
  FileCode,
  Folder,
  FolderInput,
  Pin,
  RefreshCw,
} from "@/components/icons/ph";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { cn } from "@/lib/utils";

/** Libellés réels de chaque navigateur (version française) : adresse de la page des extensions, emplacement du mode
 * développeur, bouton de chargement et façon d'épingler l'icône. */
const BROWSERS = {
  chrome: { label: "Chrome", url: "chrome://extensions", devMode: "en haut à droite", load: "Charger l'extension non empaquetée", pin: "l'icône pièce de puzzle → punaise à côté d'ETHONE" },
  edge: { label: "Edge", url: "edge://extensions", devMode: "dans le panneau de gauche", load: "Charger l'extension décompressée", pin: "l'icône pièce de puzzle → œil « Afficher dans la barre d'outils »" },
  brave: { label: "Brave", url: "brave://extensions", devMode: "en haut à droite", load: "Charger l'extension non empaquetée", pin: "l'icône pièce de puzzle → punaise à côté d'ETHONE" },
  opera: { label: "Opera", url: "opera://extensions", devMode: "en haut à droite", load: "Charger l'extension non empaquetée", pin: "l'icône cube de la barre → punaise à côté d'ETHONE" },
} as const;
type BrowserId = keyof typeof BROWSERS;

function detectBrowser(): BrowserId {
  if (typeof navigator === "undefined") return "chrome";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if ((navigator as Navigator & { brave?: unknown }).brave) return "brave";
  return "chrome";
}

const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;

// ---------------------------------------------------------------- illustrations (schémas des écrans, sans données)

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-[var(--surface-raised)]/60 px-2.5 py-1 font-mono text-[11px] text-[var(--text-muted)]">{title}</span>
      </div>
      <div className="relative p-4">{children}</div>
    </div>
  );
}

/** Pointeur qui vient « cliquer » sur la cible : glisse, puis presse. */
function Cursor({ className, delay = 0.5 }: { className: string; delay?: number }) {
  const { reduced } = useMotionPref();
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("pointer-events-none absolute h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]", className)}
      initial={reduced ? false : { opacity: 0, x: 40, y: 30 }}
      animate={reduced ? undefined : { opacity: 1, x: 0, y: 0, scale: [1, 1, 0.85, 1] }}
      transition={{ delay, duration: 0.9, times: [0, 0.6, 0.8, 1], ease: [0.16, 1, 0.3, 1] }}
    >
      <path d="M5 3l14 8-6 1.5L10 19z" fill="white" stroke="black" strokeWidth="1.2" strokeLinejoin="round" />
    </motion.svg>
  );
}

function DownloadArt({ size }: { size: string }) {
  return (
    <Window title="ethone.dev/extension">
      <div className="flex items-center gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
        <span className="grid h-10 w-10 place-items-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
          <FileArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">ethone-extension.zip</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--text-primary)]/10">
            <motion.div className="h-full rounded-full bg-[var(--accent-primary)]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{size}</span>
      </div>
      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">Dossier « Téléchargements »</p>
    </Window>
  );
}

function ExtractArt() {
  const files = ["manifest.json", "popup.html", "popup.js", "background.js", "icons/"];
  return (
    <Window title="Téléchargements">
      <div className="grid grid-cols-[auto_auto_1fr] items-center gap-3">
        <div className="grid justify-items-center gap-1 text-[var(--text-muted)]">
          <FileArchive className="h-9 w-9" />
          <span className="text-[10px]">.zip</span>
        </div>
        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, ...SPRING }}>
          <ArrowRight className="h-4 w-4 text-[var(--accent-primary)]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, ...SPRING }} className="rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/8 p-2.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Folder className="h-4 w-4 text-[var(--accent-primary)]" /> ethone-extension
          </p>
          <ul className="mt-1.5 space-y-0.5 pl-6">
            {files.map((f, i) => (
              <motion.li key={f} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.06, duration: 0.25 }} className={cn("flex items-center gap-1.5 font-mono text-[11px]", f === "manifest.json" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                {f.endsWith("/") ? <Folder className="h-3 w-3" /> : <FileCode className="h-3 w-3" />}
                {f}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Window>
  );
}

function DevModeArt({ b }: { b: BrowserId }) {
  const { reduced } = useMotionPref();
  const left = b === "edge";
  const toggle = (
    <span className="relative flex items-center gap-2 text-xs font-semibold">
      Mode développeur
      <span className="relative inline-flex h-5 w-9 items-center rounded-full p-0.5">
        <motion.span className="absolute inset-0 rounded-full" initial={{ backgroundColor: "rgba(127,127,127,0.35)" }} animate={{ backgroundColor: "var(--accent-primary)" }} transition={{ delay: reduced ? 0 : 1.2, duration: 0.2 }} />
        <motion.span className="relative h-4 w-4 rounded-full bg-white shadow" initial={{ x: 0 }} animate={{ x: 16 }} transition={{ delay: reduced ? 0 : 1.2, ...SPRING }} />
      </span>
    </span>
  );
  return (
    <Window title={BROWSERS[b].url}>
      <div className={cn("flex gap-3", left ? "flex-row" : "flex-col")}>
        {left ? (
          <div className="relative w-[44%] space-y-2 rounded-[var(--inset-radius)] bg-[var(--surface-raised)]/40 p-2.5">
            <div className="h-2 w-2/3 rounded-full bg-[var(--text-primary)]/12" />
            <div className="h-2 w-1/2 rounded-full bg-[var(--text-primary)]/12" />
            <div className="pt-6">{toggle}</div>
            <Cursor className="bottom-0 right-1" delay={0.4} />
          </div>
        ) : (
          <div className="relative flex items-center justify-between rounded-[var(--inset-radius)] bg-[var(--surface-raised)]/40 p-2.5">
            <span className="text-sm font-semibold">Extensions</span>
            {toggle}
            <Cursor className="-bottom-3 right-0" delay={0.4} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] p-2.5">
              <span className="h-6 w-6 rounded-md bg-[var(--text-primary)]/10" />
              <span className="h-2 w-24 rounded-full bg-[var(--text-primary)]/10" />
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

function LoadArt({ b }: { b: BrowserId }) {
  return (
    <Window title={BROWSERS[b].url}>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ...SPRING }} className="relative flex flex-wrap gap-2">
        <span className="rounded-[var(--inset-radius)] border border-[var(--accent-primary)] bg-[var(--accent-primary)]/12 px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-primary)]">{BROWSERS[b].load}</span>
        <span className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">Empaqueter l&apos;extension</span>
        <Cursor className="left-28 top-4" delay={0.5} />
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 1.2, ...SPRING }} className="mt-4 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sélectionner un dossier</p>
        <div className="space-y-1 text-xs">
          <p className="flex items-center gap-2 text-[var(--text-muted)]"><Folder className="h-3.5 w-3.5" /> Documents</p>
          <p className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)]/15 px-1.5 py-1 font-semibold"><Folder className="h-3.5 w-3.5 text-[var(--accent-primary)]" /> ethone-extension</p>
        </div>
        <div className="mt-3 flex justify-end">
          <span className="rounded-md bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)]">Sélectionner le dossier</span>
        </div>
      </motion.div>
    </Window>
  );
}

function PinArt({ b }: { b: BrowserId }) {
  return (
    <Window title="Barre d'outils">
      <div className="relative">
        <div className="flex items-center justify-end gap-2 rounded-[var(--inset-radius)] bg-[var(--surface-raised)]/40 p-2">
          <motion.span initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, type: "spring", bounce: 0.35, duration: 0.5 }} className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent-primary)] text-[11px] font-black text-[var(--accent-contrast)]">
            E
          </motion.span>
          <span className="grid h-7 w-7 place-items-center rounded-md border border-[var(--panel-border)] text-[var(--text-muted)]">
            <Blocks className="h-4 w-4" />
          </span>
          <span className="h-7 w-7 rounded-full bg-[var(--text-primary)]/12" />
        </div>
        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.4, ...SPRING }} className="absolute right-10 top-12 w-52 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-2 shadow-lg" style={{ transformOrigin: "top right" }}>
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Extensions</p>
          <div className="flex items-center gap-2 rounded-md bg-[var(--surface-raised)]/60 px-1.5 py-1.5 text-xs">
            <span className="grid h-5 w-5 place-items-center rounded bg-[var(--accent-primary)] text-[9px] font-black text-[var(--accent-contrast)]">E</span>
            <span className="flex-1 font-semibold">ETHONE</span>
            <Pin className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          </div>
        </motion.div>
        <div className="h-24" />
      </div>
      <p className="text-center text-xs text-[var(--text-muted)]">
        {b === "opera" ? "Opera" : BROWSERS[b].label} : {BROWSERS[b].pin}
      </p>
    </Window>
  );
}

// ---------------------------------------------------------------- tutoriel

function CopyField({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => {})
      }
      className="inline-flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 font-mono text-sm transition-[border-color,transform] duration-150 hover:border-[var(--accent-primary)]/40 active:scale-[0.97]"
    >
      {text}
      {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4 text-[var(--text-muted)]" />}
      <span className="sr-only" aria-live="polite">{copied ? "Copié" : ""}</span>
    </button>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">{children}</kbd>
);

export default function InstallTutorial({ zip, size, version }: { zip: string; size: string | null; version: string | null }) {
  const { reduced } = useMotionPref();
  const [browser, setBrowser] = useState<BrowserId>("chrome");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => setBrowser(detectBrowser()), []);
  const B = BROWSERS[browser];

  const steps: { title: string; short: string; body: ReactNode; art: ReactNode }[] = [
    {
      title: "Télécharge le zip",
      short: "Télécharger",
      art: <DownloadArt size={size ?? "≈ 30 Ko"} />,
      body: (
        <>
          <p>Le fichier <b>ethone-extension.zip</b>{version ? ` (v${version})` : ""} arrive dans ton dossier Téléchargements.</p>
          <a href={zip} download className="btn-sheen relative inline-flex h-10 self-start items-center gap-2 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.97]">
            <Download className="h-4 w-4" /> Télécharger{size ? ` · ${size}` : ""}
          </a>
        </>
      ),
    },
    {
      title: "Décompresse-le",
      short: "Décompresser",
      art: <ExtractArt />,
      body: (
        <>
          <p><b>Windows</b> : clic droit sur le zip → <b>Extraire tout…</b> → <b>Extraire</b>.</p>
          <p><b>macOS</b> : double-clic sur le zip.</p>
          <p>Tu obtiens un dossier <b>ethone-extension</b> qui contient <span className="font-mono text-xs">manifest.json</span>. Range-le dans un endroit stable (Documents par exemple) : le navigateur le lit à chaque démarrage, ne le supprime pas.</p>
        </>
      ),
    },
    {
      title: "Active le mode développeur",
      short: "Mode développeur",
      art: <DevModeArt b={browser} />,
      body: (
        <>
          <p>Copie cette adresse et colle-la dans la barre d&apos;adresse de {B.label} (les navigateurs bloquent les liens directs vers cette page) :</p>
          <CopyField text={B.url} />
          <p>Active l&apos;interrupteur <b>Mode développeur</b>, {B.devMode}.</p>
        </>
      ),
    },
    {
      title: "Charge le dossier",
      short: "Charger",
      art: <LoadArt b={browser} />,
      body: (
        <>
          <p>Clique sur <b>{B.load}</b>, puis choisis le dossier <b>ethone-extension</b> (le dossier lui-même, pas un fichier à l&apos;intérieur) et valide.</p>
          <p>La carte « ETHONE » apparaît dans la liste : c&apos;est installé.</p>
        </>
      ),
    },
    {
      title: "Épingle ETHONE",
      short: "Épingler",
      art: <PinArt b={browser} />,
      body: (
        <>
          <p>Clique sur {B.pin} pour garder l&apos;icône dans la barre.</p>
          <p>Raccourcis : <Kbd>Alt</Kbd> + <Kbd>Maj</Kbd> + <Kbd>E</Kbd> ouvre la popup, <Kbd>Alt</Kbd> + <Kbd>Maj</Kbd> + <Kbd>S</Kbd> enregistre la page. Connecte-toi une fois sur ethone.dev : l&apos;extension utilise cette session.</p>
        </>
      ),
    },
  ];

  const go = (next: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, next));
    if (n === step) return;
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  // ← / → quand le tutoriel a le focus.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  const slide = reduced ? 0 : 28;

  return (
    <div ref={rootRef} id="installer" className="scroll-mt-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Installer l&apos;extension</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">5 étapes, environ une minute. Choisis ton navigateur :</p>
        </div>
        <div role="radiogroup" aria-label="Navigateur" className="flex gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] p-1">
          {(Object.keys(BROWSERS) as BrowserId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={browser === id}
              onClick={() => setBrowser(id)}
              className={cn("relative isolate rounded-[calc(var(--inset-radius)-4px)] px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97]", browser === id ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
            >
              {browser === id && <motion.span layoutId="ext-browser" transition={SPRING} className="absolute inset-0 -z-10 rounded-[inherit] bg-[var(--accent-primary)]" />}
              {BROWSERS[id].label}
            </button>
          ))}
        </div>
      </div>

      {/* Fil des étapes */}
      <ol className="grid grid-cols-5 gap-2" aria-label="Étapes">
        {steps.map((s, i) => (
          <li key={s.short}>
            <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined} className="group w-full text-left">
              <span className="relative block h-1 overflow-hidden rounded-full bg-[var(--text-primary)]/10">
                {i <= step && <motion.span layout initial={false} className="absolute inset-0 rounded-full bg-[var(--accent-primary)]" transition={SPRING} />}
              </span>
              <span className={cn("mt-2 hidden text-xs font-semibold transition-colors sm:block", i === step ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")}>
                {i + 1}. {s.short}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div tabIndex={-1} className="grid gap-6 rounded-[calc(var(--panel-radius)+4px)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-5 outline-none sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={`${step}-text`}
            custom={dir}
            initial={{ opacity: 0, x: dir * slide }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * slide }}
            transition={{ ...SPRING, duration: 0.3 }}
            className="flex min-h-[220px] flex-col gap-3 text-sm leading-relaxed text-[var(--text-muted)] [&_b]:font-semibold [&_b]:text-[var(--text-primary)]"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              Étape {step + 1} sur {steps.length}
            </span>
            <h3 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{steps[step].title}</h3>
            {steps[step].body}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${step}-${browser}-art`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.15 } }}
            transition={SPRING}
            aria-hidden
            className="self-center"
          >
            {steps[step].art}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] pt-4 lg:col-span-2">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] px-3 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Précédent
          </button>
          <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
            <Kbd>←</Kbd> <Kbd>→</Kbd> pour naviguer
          </span>
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => go(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.97]">
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--success)]/12 px-4 text-sm font-semibold text-[var(--success)]">
              <Check className="h-4 w-4" /> C&apos;est prêt
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <RefreshCw className="h-4 w-4 text-[var(--accent-primary)]" /> Mettre à jour
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text-muted)]">
            <li>Télécharge le nouveau zip et décompresse-le.</li>
            <li>Remplace le contenu de ton dossier <b className="text-[var(--text-primary)]">ethone-extension</b> par les nouveaux fichiers.</li>
            <li>Sur <span className="font-mono text-xs">{B.url}</span>, clique sur la flèche circulaire de la carte ETHONE.</li>
          </ol>
          {version && <p className="text-xs text-[var(--text-muted)]">Dernière version : v{version}.</p>}
        </section>

        <section className="space-y-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Si ça coince
          </h3>
          {[
            ["« Le fichier manifeste est manquant ou illisible »", "Tu as choisi le mauvais dossier. Sélectionne celui qui contient directement manifest.json (parfois un dossier ethone-extension se trouve dans un autre du même nom après l'extraction)."],
            ["Je ne trouve pas le bouton de chargement", `Le mode développeur n'est pas activé : interrupteur ${B.devMode} de ${B.url}.`],
            ["Le navigateur propose de « désactiver les extensions en mode développeur »", "Ce message apparaît au démarrage pour toute extension installée ainsi. Ferme-le (ne clique pas sur Désactiver) : ETHONE reste active."],
            ["L'extension a disparu", "Le dossier a été déplacé ou supprimé. Remets-le en place puis recharge-le, ou refais l'étape 4."],
            ["« Hors ligne » dans la popup ou rien ne s'enregistre", "Vérifie ta connexion, puis connecte-toi sur ethone.dev dans ce même navigateur."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                {q}
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="pt-2 text-sm leading-relaxed text-[var(--text-muted)]">{a}</p>
            </details>
          ))}
          <p className="flex items-center gap-1.5 pt-1 text-xs text-[var(--text-muted)]">
            <FolderInput className="h-3.5 w-3.5" /> Chrome, Edge, Brave et Opera, sur ordinateur. Firefox et Safari ne sont pas pris en charge.
          </p>
        </section>
      </div>
    </div>
  );
}
