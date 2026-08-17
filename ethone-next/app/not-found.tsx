"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/\\";
const SCRAMBLE_MS = 700;
const TICK_MS = 45;

function Scramble({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (reduce) {
      setDisplay(text);
      return;
    }
    const chars = text.split("");
    const start = performance.now();
    let raf = 0;
    let last = 0;

    const loop = (now: number) => {
      if (now - last >= TICK_MS) {
        last = now;
        const progress = Math.min((now - start) / SCRAMBLE_MS, 1);
        const settled = Math.floor(progress * chars.length);
        setDisplay(
          chars
            .map((ch, i) =>
              i < settled || ch === " "
                ? ch
                : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            )
            .join(""),
        );
      }
      if (now - start < SCRAMBLE_MS) {
        raf = requestAnimationFrame(loop);
      } else {
        setDisplay(text);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text, reduce]);

  return <span className="tabular-nums">{display}</span>;
}

export default function NotFound() {
  const i18n = useI18n();
  const code = i18n("notFoundCode") || "404";
  const title = i18n("notFoundTitle") || "Page introuvable";
  const description = i18n("notFound") || "Cette page n’existe pas ou a été déplacée.";

  return (
    <main className="flex min-h-[80dvh] w-full flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <div className="group relative select-none font-mono font-bold leading-none tracking-tighter text-white [font-size:clamp(5rem,18vw,11rem)]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 text-[#ff0040] opacity-0 mix-blend-screen transition-[transform,opacity] duration-150 ease-out group-hover:translate-x-[3px] group-hover:opacity-70 motion-reduce:hidden"
          >
            <Scramble text={code} />
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 text-[#00e5ff] opacity-0 mix-blend-screen transition-[transform,opacity] duration-150 ease-out group-hover:-translate-x-[3px] group-hover:opacity-70 motion-reduce:hidden"
          >
            <Scramble text={code} />
          </span>
          <h1 className="relative" aria-label={code}>
            <Scramble text={code} />
          </h1>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-semibold text-zinc-100">{title}</p>
          <p className="max-w-sm text-sm text-zinc-400">{description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Icon name="home" className="h-4 w-4" />
            {i18n("notFoundBack")}
          </Link>
          <Link
            href="/connections/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="plug" className="h-4 w-4" />
            {i18n("connections")}
          </Link>
        </div>
      </div>
    </main>
  );
}
