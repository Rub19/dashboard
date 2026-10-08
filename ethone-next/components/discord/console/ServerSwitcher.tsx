"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import ClientImage from "@/components/ClientImage";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { cn } from "@/lib/utils";

/**
 * Serveur courant en haut de la barre latérale ; un clic ouvre le sélecteur comme sur Keeper : recherche, serveurs
 * protégés par Etho (coche sur le serveur ouvert), serveurs sans Etho (+ pour l'inviter) et « Tous mes serveurs ».
 */
export default function ServerSwitcher({
  guildName,
  guildIconUrl,
  selectedGuildId,
  guilds,
  botGuildIds,
  onSelectGuild,
  onAllServers,
  botInviteUrl,
  roleLabel,
}: {
  guildName: string;
  guildIconUrl?: string;
  selectedGuildId: string;
  guilds: DiscordGuild[];
  botGuildIds?: Set<string>;
  onSelectGuild?: (g: DiscordGuild) => void;
  onAllServers?: () => void;
  botInviteUrl?: string;
  roleLabel: string;
}) {
  const { reduced } = useMotionPref();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // La barre latérale défile (overflow) : la liste est rendue dans <body> et placée sous le bouton.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = boxRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    };
    place();
    window.addEventListener("resize", place);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!boxRef.current?.contains(t) && !popRef.current?.contains(t))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { withBot, without } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = guilds.filter(
      (g) => !query || g.name.toLowerCase().includes(query),
    );
    return {
      withBot: list.filter((g) => botGuildIds?.has(g.id)),
      without: list.filter((g) => !botGuildIds?.has(g.id)),
    };
  }, [guilds, botGuildIds, q]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  const row =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--text-primary)]/[0.06]";

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
          open
            ? "border-[var(--text-primary)]/15 bg-[var(--surface-hover)]"
            : "border-transparent hover:bg-[var(--surface-hover)]",
        )}
      >
        <GuildIcon name={guildName} url={guildIconUrl} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {guildName}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
            <span className="truncate">{roleLabel}</span>
          </span>
        </span>
        <ChevronsUpDown
          className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
          strokeWidth={1.75}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                role="listbox"
                initial={reduced ? false : { opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ type: "spring", bounce: 0, duration: 0.22 }}
                style={{
                  transformOrigin: "top left",
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                }}
                className="z-[var(--z-modal)] w-[17rem] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl"
              >
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Changer de serveur"
                  aria-label="Changer de serveur"
                  className="w-full border-b border-[var(--panel-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {withBot.length > 0 && (
                    <p className="px-2 pb-1 pt-1.5 text-[11px] text-[var(--text-muted)]">
                      Protégés par Etho
                    </p>
                  )}
                  {withBot.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="option"
                      aria-selected={g.id === selectedGuildId}
                      onClick={() => {
                        close();
                        if (g.id !== selectedGuildId) onSelectGuild?.(g);
                      }}
                      className={cn(
                        row,
                        g.id === selectedGuildId &&
                          "bg-[var(--text-primary)]/[0.06]",
                      )}
                    >
                      <GuildIcon name={g.name} url={g.iconUrl} size={22} />
                      <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                        {g.name}
                      </span>
                      {g.id === selectedGuildId && (
                        <Check
                          className="h-4 w-4 shrink-0 text-[var(--success)]"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  ))}
                  {without.length > 0 && (
                    <p className="px-2 pb-1 pt-2.5 text-[11px] text-[var(--text-muted)]">
                      Sans Etho
                    </p>
                  )}
                  {without.map((g) => (
                    <a
                      key={g.id}
                      href={
                        botInviteUrl
                          ? `${botInviteUrl}&guild_id=${g.id}&disable_guild_select=true`
                          : undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      title={`Ajouter Etho à ${g.name}`}
                      className={cn(row, "group")}
                    >
                      <GuildIcon name={g.name} url={g.iconUrl} size={22} />
                      <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                        {g.name}
                      </span>
                      <Plus
                        className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]"
                        strokeWidth={1.75}
                      />
                    </a>
                  ))}
                  {withBot.length + without.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                      Aucun serveur.
                    </p>
                  )}
                </div>
                {onAllServers && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onAllServers();
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-[var(--panel-border)] px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06]"
                  >
                    <LayoutGrid
                      className="h-4 w-4 text-[var(--text-muted)]"
                      strokeWidth={1.75}
                    />
                    Tous mes serveurs
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function GuildIcon({
  name,
  url,
  size,
}: {
  name: string;
  url?: string;
  size: number;
}) {
  if (url)
    return (
      <ClientImage
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-[var(--success)]/15 text-[10px] font-bold text-[var(--success)]"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}
