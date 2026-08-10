"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";

type CommandItem = {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
};

export default function CommandPalette() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const i18n = useI18n();
  const { open, setOpen } = useCommandPalette();
  const { settings, update } = useSettings();
  const { signOut } = useAuth();
  const { items: macros } = useUserData("macro");
  const { openWindow, toggleMissionControl } = useWindowManager();

  const run = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      setOpen(false);
      setQuery("");
    },
    [setOpen]
  );

  const macroCommands: CommandItem[] = macros.map((m) => {
    const data = m.data as { action?: string; href?: string; setting?: string };
    return {
      id: `macro-${m.id}`,
      label: m.label,
      category: i18n("macros"),
      icon: <Icon name="workflow" className="h-4 w-4" />,
      action: () => {
        if (data.action === "navigate" && data.href) router.push(data.href);
        if (data.action === "toggle" && data.setting) {
          if (data.setting === "brainEnabled") update({ brainEnabled: !settings.brainEnabled });
          if (data.setting === "darkMode") update({ darkMode: !settings.darkMode });
        }
      },
    };
  });

  const COMMANDS = useMemo<CommandItem[]>(
    () => [
      { id: "home", label: i18n("home"), category: i18n("navigate"), shortcut: "H", icon: <Icon name="arrowRight" className="h-4 w-4" />, action: () => router.push("/") },
      { id: "mail", label: i18n("mail"), category: i18n("navigate"), shortcut: "M", action: () => router.push("/mail/") },
      { id: "notes", label: i18n("notes"), category: i18n("navigate"), shortcut: "N", action: () => router.push("/notes/") },
      { id: "tasks", label: i18n("tasks"), category: i18n("navigate"), shortcut: "T", action: () => router.push("/tasks/") },
      { id: "calendar", label: i18n("calendar"), category: i18n("navigate"), shortcut: "C", action: () => router.push("/calendar/") },
      { id: "files", label: i18n("files"), category: i18n("navigate"), shortcut: "F", action: () => router.push("/files/") },
      { id: "brain", label: i18n("brain"), category: i18n("navigate"), shortcut: "B", action: () => router.push("/brain/") },
      { id: "focus", label: i18n("focus"), category: i18n("navigate"), shortcut: "P", action: () => router.push("/focus/") },
      { id: "matches", label: i18n("matches"), category: i18n("navigate"), shortcut: "G", action: () => router.push("/matches/") },
      { id: "connections", label: i18n("connections"), category: i18n("navigate"), shortcut: "O", action: () => router.push("/connections/") },
      { id: "spaces", label: i18n("spaces"), category: i18n("navigate"), action: () => router.push("/spaces/") },
      { id: "flows", label: i18n("flows"), category: i18n("navigate"), action: () => router.push("/flows/") },
      { id: "interactions", label: i18n("interactions"), category: i18n("navigate"), action: () => router.push("/interactions/") },
      { id: "settings", label: i18n("settings"), category: i18n("navigate"), shortcut: "S", action: () => router.push("/settings/") },

      { id: "toggle-theme", label: settings.darkMode ? i18n("lightMode") : i18n("darkMode"), category: i18n("actions"), icon: settings.darkMode ? <Icon name="sun" className="h-4 w-4" /> : <Icon name="moon" className="h-4 w-4" />, action: () => update({ darkMode: !settings.darkMode }) },
      { id: "toggle-brain", label: settings.brainEnabled ? i18n("disableBrain") : i18n("enableBrain"), category: i18n("actions"), icon: <Icon name="brain" className="h-4 w-4" />, action: () => update({ brainEnabled: !settings.brainEnabled }) },
      { id: "focus-timer", label: i18n("startFocus"), category: i18n("actions"), icon: <Icon name="focus" className="h-4 w-4" />, action: () => router.push("/focus/") },
      { id: "mission-control", label: i18n("missionControl"), category: i18n("actions"), shortcut: "M", icon: <Icon name="layoutGrid" className="h-4 w-4" />, action: () => { toggleMissionControl(); } },

      { id: "new-note", label: i18n("newNote"), category: i18n("create"), icon: <Icon name="stickyNote" className="h-4 w-4" />, action: () => router.push("/notes/") },
      { id: "new-task", label: i18n("newTask"), category: i18n("create"), icon: <Icon name="plus" className="h-4 w-4" />, action: () => router.push("/tasks/") },
      { id: "new-interaction", label: i18n("newInteraction"), category: i18n("create"), icon: <Icon name="interactions" className="h-4 w-4" />, action: () => router.push("/interactions/") },
      { id: "macros", label: i18n("macros"), category: i18n("create"), icon: <Icon name="workflow" className="h-4 w-4" />, action: () => router.push("/macros/") },
      { id: "personas", label: i18n("personas"), category: i18n("create"), icon: <Icon name="team" className="h-4 w-4" />, action: () => router.push("/personas/") },
      { id: "open-notes", label: "Notes (fenêtre)", category: i18n("windows"), icon: <Icon name="appWindow" className="h-4 w-4" />, action: () => { openWindow("/notes/", "Notes"); } },
      { id: "open-tasks", label: "Tâches (fenêtre)", category: i18n("windows"), icon: <Icon name="appWindow" className="h-4 w-4" />, action: () => { openWindow("/tasks/", "Tâches"); } },
      { id: "open-mail", label: "Mail (fenêtre)", category: i18n("windows"), icon: <Icon name="appWindow" className="h-4 w-4" />, action: () => { openWindow("/mail/", "Mail"); } },
      { id: "open-bills", label: "Factures (fenêtre)", category: i18n("windows"), icon: <Icon name="appWindow" className="h-4 w-4" />, action: () => { openWindow("/bills/", "Factures"); } },

      ...macroCommands,

      { id: "signout", label: i18n("signOut"), category: i18n("account"), icon: <Icon name="logout" className="h-4 w-4" />, action: () => signOut().then(() => router.push("/login")) },
    ],
    [i18n, router, settings, update, signOut, macroCommands, openWindow, toggleMissionControl]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => `${c.label} ${c.category}`.toLowerCase().includes(q)) : COMMANDS;
  }, [query, COMMANDS]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => (i + 1) % filtered.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      if (event.key === "Enter" && filtered[index]) {
        event.preventDefault();
        run(filtered[index]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, index, setOpen, run]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] lg:flex"
      >
        <Icon name="search" className="h-3.5 w-3.5" />
        <span>{i18n("commands")}</span>
        <kbd className="rounded bg-[var(--surface-raised)] px-1 py-0.5 text-[10px]">
          <Icon name="command" className="inline h-3 w-3" />K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-6 pt-32 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
                <Icon name="search" className="h-5 w-5 text-[var(--muted)]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={i18n("search")}
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">ESC</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-[var(--muted)]">{i18n("noResults")}</p>
                ) : (
                  filtered.map((cmd, i) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => run(cmd)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                        i === index
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                      onMouseEnter={() => setIndex(i)}
                    >
                      <span className="flex items-center gap-2">
                        {cmd.icon && <span className="opacity-70">{cmd.icon}</span>}
                        <span>{cmd.label}</span>
                        <span className={`text-[10px] ${i === index ? "text-white/70" : "text-[var(--muted)]"}`}>{cmd.category}</span>
                      </span>
                      {cmd.shortcut && (
                        <span className="flex items-center gap-1 text-[10px] opacity-60">
                          <Icon name="command" className="h-3 w-3" />
                          {cmd.shortcut}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
