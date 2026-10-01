"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import { ArrowRight, Check, Copy, Download, FileArchive, Keyboard, Layers, Lock, NotebookPen, Quote, ShieldCheck } from "@/components/icons/ph";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { pageStagger, revealUp, staggerItem } from "@/lib/motion-variants";

const ZIP = "/downloads/ethone-extension.zip";

const FEATURES = [
  { icon: NotebookPen, title: "Une page en un clic", body: "Le titre et l'adresse de l'onglet partent dans tes notes ou tes tâches, avec ta session ETHONE habituelle." },
  { icon: Quote, title: "Le passage qui compte", body: "Sélectionne du texte, clic droit : « Enregistrer dans ETHONE » ou « Ajouter comme tâche », avec la source." },
  { icon: Keyboard, title: "Note rapide, partout", body: "Tape une idée dans la popup, ou « eth » puis ton texte dans la barre d'adresse. « eth notes » ouvre directement la page." },
  { icon: Layers, title: "Ton espace à portée", body: "Accueil, notes, tâches, Brain, calendrier et bot en un clic, ou avec les touches 1 à 6 dans la popup." },
];

const STEPS = [
  { icon: FileArchive, title: "Décompresse le zip", body: "Tu obtiens un dossier « ethone-extension »." },
  { icon: Keyboard, title: "Ouvre les extensions", body: "Colle l'adresse ci-dessous dans Chrome, puis active le « Mode développeur » en haut à droite.", copy: "chrome://extensions" },
  { icon: Check, title: "Charge le dossier", body: "« Charger l'extension non empaquetée » → choisis le dossier « ethone-extension ». Épingle ETHONE dans la barre." },
];

const PRIVACY = [
  "Aucun mot de passe ni jeton stocké : l'enregistrement passe par ta session sur ethone.dev.",
  "Aucun script injecté sur les sites que tu visites. La sélection n'est lue que quand tu cliques.",
  "Le contenu capturé voyage dans le # de l'adresse, jamais envoyé à un serveur tiers.",
];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function ExtensionLanding() {
  const { reduced } = useMotionPref();
  const [meta, setMeta] = useState<{ version: string; size: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const initial = reduced ? false : "initial";

  useEffect(() => {
    fetch("/downloads/ethone-extension.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.version === "string" && setMeta(d))
      .catch(() => {});
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-clip bg-[var(--bg-main)] text-[var(--text-primary)] os-scroll">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide">
          <BrandMark size={28} />
          ETHONE
        </Link>
        <Link href="/" className="group inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          Ouvrir le dashboard
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <motion.div variants={pageStagger} initial={initial} animate="animate" className="space-y-6">
            <motion.span variants={staggerItem} className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
              Extension Chrome{meta ? ` · v${meta.version}` : ""}
            </motion.span>
            <motion.h1 variants={revealUp} className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Garde ce que tu lis,
              <br />
              <span className="text-[var(--accent-primary)]">sans quitter la page.</span>
            </motion.h1>
            <motion.p variants={staggerItem} className="max-w-md text-[15px] leading-relaxed text-[var(--text-muted)]">
              Enregistre une page, un passage ou un lien dans tes notes et tâches ETHONE, et ouvre ton espace en un clic.
            </motion.p>
            <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-3">
              <a
                href={ZIP}
                download
                className="btn-sheen group relative inline-flex h-12 items-center gap-2.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-[var(--accent-contrast)] outline-none transition-[filter,transform] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]"
              >
                <Download className="h-5 w-5 transition-transform duration-300 group-hover:translate-y-0.5" />
                Télécharger pour Chrome
              </a>
              <span className="text-xs text-[var(--text-muted)]">
                {meta ? `Zip · ${formatSize(meta.size)} · ` : ""}Chrome, Edge, Brave, Opera
              </span>
            </motion.div>
          </motion.div>

          {/* Aperçu de la popup (illustration, sans données). */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24, rotate: 2, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 }}
            aria-hidden
            className="mx-auto w-full max-w-[340px] space-y-3 rounded-[calc(var(--panel-radius)+4px)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-3.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center gap-2.5">
              <BrandMark size={30} />
              <div className="grid gap-1">
                <span className="text-sm font-semibold tracking-wide">ETHONE</span>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <span className="status-breathe h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> En ligne
                </span>
              </div>
            </div>
            <div className="space-y-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
              <div className="space-y-1.5">
                <div className="h-2.5 w-3/4 rounded-full bg-[var(--text-primary)]/15" />
                <div className="h-2 w-1/3 rounded-full bg-[var(--text-primary)]/8" />
              </div>
              <div className="space-y-1.5 rounded-r-lg border-l-2 border-[var(--accent-primary)] bg-[var(--surface-raised)]/60 p-2.5">
                <div className="h-2 w-full rounded-full bg-[var(--text-primary)]/10" />
                <div className="h-2 w-4/5 rounded-full bg-[var(--text-primary)]/10" />
              </div>
              <div className="btn-sheen relative flex h-9 items-center justify-center gap-2 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-contrast)]">
                Enregistrer la sélection <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.05, duration: 0.35 }}
                  className="grid justify-items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] py-2.5"
                >
                  <div className="h-4 w-4 rounded-md bg-[var(--text-primary)]/15" />
                  <div className="h-1.5 w-8 rounded-full bg-[var(--text-primary)]/10" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          variants={pageStagger}
          initial={initial}
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <motion.article key={title} variants={staggerItem} className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-[15px] font-semibold">{title}</h2>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
            </motion.article>
          ))}
        </motion.section>

        <section className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight">Installer en 3 étapes</h2>
            <motion.ol variants={pageStagger} initial={initial} whileInView="animate" viewport={{ once: true, margin: "-60px" }} className="relative space-y-3">
              {STEPS.map(({ icon: Icon, title, body, copy: text }, i) => (
                <motion.li key={title} variants={staggerItem} className="flex gap-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-card)] p-4">
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--panel-border)] text-[var(--accent-primary)]">
                    <Icon className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-[var(--accent-contrast)]">{i + 1}</span>
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{body}</p>
                    {text && (
                      <button
                        type="button"
                        onClick={() => copy(text)}
                        className="inline-flex h-8 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 font-mono text-xs transition-colors hover:border-[var(--accent-primary)]/40"
                      >
                        {text}
                        {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                      </button>
                    )}
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </div>

          <div className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight">Ce que l&apos;extension ne fait pas</h2>
            <motion.ul variants={pageStagger} initial={initial} whileInView="animate" viewport={{ once: true, margin: "-60px" }} className="space-y-3">
              {PRIVACY.map((line, i) => (
                <motion.li key={line} variants={staggerItem} className="flex gap-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {i === 0 ? <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />}
                  {line}
                </motion.li>
              ))}
            </motion.ul>
            <p className="text-xs text-[var(--text-muted)]">
              Permissions demandées : onglet actif (sur ton clic), menu clic droit, et ethone.dev pour afficher le statut.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
