import { CSSProperties, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Bell, CheckCircle2, AlertCircle, CircleUser, LogOut, Search, WifiOff } from "lucide-react";
import { firstArray, Json } from "./generic";
import { dueEvents, unseenMail } from "./home";
import { hdvBackground, notifiedEvents, notifyWindows, readDesktopPrefs, rememberEvents, saveDesktopPrefs } from "./notifications";
import { Action, apiCall, authSignOut, installModule, itemsList, ModuleStatus, modulesLocal, modulesRemote, openModule, openReleases, Profile, profileAvatar, Progress } from "./api";
import { errorText, Key, t, tr } from "./i18n";
import EmbeddedApp, { EMBED_EVENT, EmbedTarget } from "./EmbeddedApp";
import { clockKey, inQuietHours, Rule, rulesForPage, rulesForTime } from "./automations";
import { runRule } from "./BrainExtras";
import HomePage from "./HomePage";
import { MusicCapsule } from "./NowPlaying";
import UpdateBanner from "./UpdateBanner";
import ModulesPage, { Busy } from "./ModulesPage";
import { EASE_SNAP, popover } from "./motion";
import { togglePinned } from "./pinned";
import { readJson, write } from "./settings";
import { clearToastLog, Overlays, setPersisted, toast, usePersisted, useToastLog } from "./qol";
import { Drawer, Empty } from "./kit";
import Sidebar, { PAGE_ORDER, PAGE_TINTS } from "./Sidebar";
import { GO_EVENT, FOOT_PAGES, MAIN_PAGES, Page } from "./navigation";
import Palette, { Command } from "./Palette";
import WorkPage from "./DailyPage";
import DiscordPage from "./DiscordPage";
import FilesPage from "./FilesPage";
import MailPage from "./MailPage";
import { AccountPage, BrainPage, InsightsPage } from "./MorePages";
import { TeamPage } from "./TeamPage";
import LolPage from "./LolPage";
import TrackerPage from "./TrackerPage";
import { BrandMark, LeagueMark, ValorantMark, WindowControls } from "./ui";
import { anchoredMenuPosition } from "./menu-position";

const ALL_PAGES: Page[] = [...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => id);
const CHECK_EVERY = 6 * 60 * 60 * 1000;
const CAN_RUN: Action[] = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];

function progressState(progress: Progress): Busy {
  if (progress.stage !== "downloading") return { label: t(`progress.${progress.stage}` as Key), value: null };
  const value = progress.total ? progress.received / progress.total : null;
  const percent = value !== null ? `${Math.round(value * 100)} %` : `${Math.round(progress.received / 1048576)} Mo`;
  return { label: t("progress.downloading", { percent }), value };
}

function ToastLog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const log = useToastLog();
  return (
    <Drawer open={open} title={tr("Dernières notifications", "Recent notifications")} onClose={onClose} width={420}>
      {log.length === 0 ? <Empty title={tr("Rien pour l'instant", "Nothing yet")} text={tr("Les messages affichés depuis l'ouverture d'Ethone restent ici.", "Messages shown since Ethone opened stay here.")} /> : (
        <>
          <ul className="toast-log">
            {log.map((item) => (
              <li key={item.id} className={item.tone}>
                {item.tone === "bad" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{item.message}</span>
                <time className="muted">{new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </li>
            ))}
          </ul>
          <button type="button" className="btn toast-log-clear" onClick={clearToastLog}>{tr("Tout effacer", "Clear all")}</button>
        </>
      )}
    </Drawer>
  );
}

function SECTION_COMMANDS(): { page: Page; key: string; id: string; label: string }[] {
  const group = (page: Page, key: string, title: string, rows: [string, string][]) => rows.map(([id, label]) => ({ page, key, id, label: `${title} › ${label}` }));
  return [
    ...group("settings", "ethone-section-settings", tr("Réglages", "Settings"), [["appearance", tr("Apparence", "Appearance")], ["windows", tr("Windows et notifications", "Windows and notifications")], ["shortcuts", tr("Raccourcis", "Shortcuts")], ["privacy", tr("Confidentialité", "Privacy")], ["sync", tr("Synchronisation", "Sync")], ["storage", tr("Stockage et cache", "Storage and cache")], ["performance", "Performance"], ["accessibility", tr("Accessibilité", "Accessibility")], ["workspace", tr("Espace de travail", "Workspace")], ["advanced", tr("Avancé", "Advanced")], ["profile", tr("Profil", "Profile")], ["connections", tr("Connexions", "Connections")], ["devices", tr("Appareils", "Devices")], ["twofactor", tr("Double authentification", "Two-factor")], ["passkeys", tr("Clés d'accès", "Passkeys")], ["events", tr("Journal de sécurité", "Security log")], ["ai", tr("Intelligence artificielle", "Artificial intelligence")], ["about", tr("À propos", "About")]]),
    ...group("productivity", "ethone-section-productivity", tr("Productivité", "Productivity"), [["tasks", tr("Tâches", "Tasks")], ["events", tr("Calendrier", "Calendar")], ["notes", "Notes"], ["scratchpad", tr("Mémo", "Scratchpad")], ["capture", tr("Capture rapide", "Quick capture")], ["habits", tr("Habitudes", "Habits")], ["focus", tr("Concentration et ambiance", "Focus and ambience")], ["bills", tr("Factures", "Bills")]]),
    ...group("tracker", "ethone-section-eval", "E:VAL", [["profile", tr("Profil", "Profile")], ["live", tr("En direct", "Live")], ["game", tr("Jeu et boutique", "Game and store")], ["hub", "Hub"]]),
    ...group("insights", "ethone-section-insights", tr("Analyses", "Insights"), [["activity", tr("Activité", "Activity")], ["mail", tr("Statistiques mail", "Mail stats")], ["weather", tr("Météo", "Weather")], ["rss", tr("Flux RSS", "RSS feeds")], ["diagnostic", tr("Diagnostic", "Diagnostics")]]),
    ...group("games", "ethone-section-games", "E:LOL", [["profile", tr("Profil", "Profile")], ["live", tr("En direct", "Live")], ["tft", "Teamfight Tactics"], ["rotation", tr("Rotation LoL", "LoL rotation")], ["hub", tr("Amis", "Friends")]]),
  ];
}

function Avatar({ profile }: { profile: Profile }) {
  const [source, setSource] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let active = true;
    setSource(null);
    setBroken(false);
    profileAvatar().then((value) => active && setSource(value), () => active && setBroken(true));
    return () => {
      active = false;
    };
  }, [profile.avatar]);
  if (source && !broken) return <img className="avatar" src={source} alt="" onError={() => setBroken(true)} />;
  return <span className="avatar initial">{profile.name.slice(0, 1).toUpperCase()}</span>;
}

export default function Shell({ profile, offline, onSignedOut }: { profile: Profile; offline: boolean; onSignedOut: () => void }) {
  const [savedPage, savePage] = usePersisted<Page>("ethone-last-page", "home");
  const page = ALL_PAGES.includes(savedPage) ? savedPage : "home";
  const history = useRef<Page[]>([]);
  const future = useRef<Page[]>([]);
  const scrolls = useRef<Partial<Record<Page, number>>>({});
  const pageRef = useRef(page);
  pageRef.current = page;
  const [newMail, setNewMail] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [logOpen, setLogOpen] = useState(false);
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, Busy>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [direction, setDirection] = useState(1);
  const [compact, setCompact] = useState(() => readJson<boolean>("ethone-sidebar-compact") ?? false);
  const [visited, setVisited] = useState<Page[]>(["home", page]);
  const [pinned, setPinned] = useState<string[]>(() => readJson<string[]>("ethone-pinned-apps") ?? []);
  const layer = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    setModuleError(null);
    try {
      setModules(await (offline ? modulesLocal() : modulesRemote()));
    } catch (reason) {
      setModuleError(errorText(reason));
    } finally {
      setChecking(false);
    }
  }, [offline]);

  useEffect(() => {
    modulesLocal().then(setModules, (reason) => setModuleError(errorText(reason))).then(() => {
      if (!offline) return refresh();
    });
    const timer = offline ? undefined : setInterval(refresh, CHECK_EVERY);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [offline, refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
      if (event.ctrlKey && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const target = PAGE_ORDER[Number(event.key) - 1];
        if (target) goRef.current(target);
      }
      if (event.ctrlKey && event.key === ",") {
        event.preventDefault();
        goRef.current("settings");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleRef.current();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".page:not([hidden]) input[type='text'], .page:not([hidden]) input:not([type])")?.focus();
      }
      if (event.key === "F5") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>(".page:not([hidden]) [data-refresh]")?.click();
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        backRef.current();
      }
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        forwardRef.current();
      }
      if (event.key === "Escape" && popupRef.current) {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const onBack = (event: MouseEvent) => {
      if (event.button === 3) backRef.current();
      if (event.button === 4) forwardRef.current();
    };
    const onResize = () => setMenu(false);
    window.addEventListener("mouseup", onBack);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mouseup", onBack);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const open = useCallback((next: Page, current: Page) => {
    if (current === next) return;
    setDirection(ALL_PAGES.indexOf(next) >= ALL_PAGES.indexOf(current) ? 1 : -1);
    if (layer.current) scrolls.current[current] = layer.current.scrollTop;
    savePage(next);
    setVisited((seen) => (seen.includes(next) ? seen : [...seen, next]));
  }, [savePage]);

  useLayoutEffect(() => {
    if (layer.current) layer.current.scrollTop = scrolls.current[page] ?? 0;
  }, [page]);

  useEffect(() => {
    if (page === "mail") setNewMail(0);
  }, [page]);

  useEffect(() => {
    saveDesktopPrefs(readDesktopPrefs());
    let seen: Set<string> | null = null;
    const check = async () => {
      const prefs = readDesktopPrefs();
      if (prefs.hdvBackground) await hdvBackground(true).catch(() => undefined);
      const silent = inQuietHours(new Date(), prefs.quiet, prefs.quietFrom, prefs.quietTo);
      if (prefs.notifyMail) {
        const mail = await apiCall<Json>("api/mail/inbox?folder=inbox&limit=10").then((answer) => firstArray(answer) as unknown as { id: string; from_address: string; from_name?: string; subject?: string }[]).catch(() => null);
        if (mail) {
          const fresh = unseenMail(seen, mail);
          seen = new Set([...(seen ?? []), ...mail.map((item) => item.id)]);
          if (fresh.length > 0 && pageRef.current !== "mail") setNewMail((count) => count + fresh.length);
          if (silent) fresh.length = 0;
          if (fresh.length === 1) void notifyWindows(fresh[0].from_name || fresh[0].from_address, fresh[0].subject || tr("Nouveau mail", "New mail")).catch(() => undefined);
          else if (fresh.length > 1) void notifyWindows("Ethone", tr(`${fresh.length} nouveaux mails`, `${fresh.length} new emails`)).catch(() => undefined);
        }
      }
      if (prefs.notifyEvents) {
        const events = await itemsList("events").catch(() => null);
        if (events) {
          const notified = notifiedEvents();
          const due = dueEvents(events, notified, Date.now());
          if (!silent) for (const event of due) void notifyWindows(event.title, tr("Commence dans moins de 10 minutes", "Starts in less than 10 minutes")).catch(() => undefined);
          if (due.length > 0) rememberEvents([...notified, ...due.map((event) => event.id)]);
        }
      }
    };
    void check();
    const timer = setInterval(() => void check(), 120000);
    return () => clearInterval(timer);
  }, []);

  const go = useCallback((next: Page) => {
    if (next !== page) {
      history.current = [...history.current.slice(-20), page];
      future.current = [];
    }
    open(next, page);
  }, [open, page]);

  useEffect(() => {
    const runTime = () => rulesForTime(readJson<Rule[]>("ethone-automations") ?? [], new Date()).forEach(runRule);
    let last = "";
    const tick = setInterval(() => {
      const key = clockKey(new Date());
      if (key !== last) {
        last = key;
        runTime();
      }
    }, 15000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    rulesForPage(readJson<Rule[]>("ethone-automations") ?? [], page).forEach(runRule);
  }, [page]);

  const goRef = useRef(go);
  goRef.current = go;
  const [embedded, setEmbedded] = useState<EmbedTarget | null>(null);
  useEffect(() => {
    const onEmbed = (event: Event) => setEmbedded((event as CustomEvent<EmbedTarget>).detail);
    window.addEventListener(EMBED_EVENT, onEmbed);
    return () => window.removeEventListener(EMBED_EVENT, onEmbed);
  }, []);
  useEffect(() => setEmbedded(null), [page]);
  useEffect(() => {
    const onGo = (event: Event) => goRef.current((event as CustomEvent<Page>).detail);
    window.addEventListener(GO_EVENT, onGo);
    return () => window.removeEventListener(GO_EVENT, onGo);
  }, []);
  const backRef = useRef(() => undefined as void);
  backRef.current = () => {
    const previous = history.current.pop();
    if (!previous) return;
    future.current = [page, ...future.current.slice(0, 20)];
    open(previous, page);
  };
  const forwardRef = useRef(() => undefined as void);
  forwardRef.current = () => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    history.current = [...history.current.slice(-20), page];
    open(next, page);
  };
  useEffect(() => {
    const change = (event: Event) => {
      const back = event.type === "online";
      setOnline(back);
      if (offline) return;
      if (back) {
        toast(tr("Connexion rétablie", "Back online"));
        void refresh();
      } else {
        toast(tr("Connexion perdue. Ce qui demande Internet reprendra au retour du réseau.", "Connection lost. Online features resume when the network returns."), { tone: "bad" });
      }
    };
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, [offline, refresh]);

  const toggleSidebar = useCallback(() => {
    setCompact((value) => {
      write("ethone-sidebar-compact", JSON.stringify(!value));
      return !value;
    });
  }, []);
  const toggleRef = useRef(toggleSidebar);

  const pin = useCallback((id: string) => {
    setPinned((current) => {
      const next = togglePinned(current, id);
      write("ethone-pinned-apps", JSON.stringify(next));
      toast(next.includes(id) ? tr("Application épinglée", "App pinned") : tr("Application désépinglée", "App unpinned"));
      return next;
    });
  }, []);

  const clearError = (id: string) => setErrors(({ [id]: _, ...rest }) => rest);

  const run = useCallback(
    async (status: ModuleStatus) => {
      const id = status.module.id;
      clearError(id);
      try {
        if (status.action === "install" || status.action === "update") {
          setBusy((all) => ({ ...all, [id]: { label: t("progress.downloading", { percent: "" }).trim(), value: null } }));
          await installModule(id, (progress) => setBusy((all) => ({ ...all, [id]: progressState(progress) })));
          await refresh();
        } else if (status.action === "releasePage") {
          await openReleases(id);
        } else {
          await openModule(id);
        }
      } catch (error) {
        setErrors((all) => ({ ...all, [id]: errorText(error) }));
        toast(`${status.module.name} : ${errorText(error)}`);
      } finally {
        setBusy(({ [id]: _, ...rest }) => rest);
      }
    },
    [refresh],
  );

  const signOut = () => authSignOut().then(onSignedOut);

  const openPinned = useCallback(
    (status: ModuleStatus) => {
      if (CAN_RUN.includes(status.action) && status.installed !== null) void run(status);
      else go("modules");
    },
    [go, run],
  );

  const commands = useMemo<Command[]>(
    () => [
      ...modules
        .filter((status) => CAN_RUN.includes(status.action))
        .map((status) => ({ id: `run-${status.module.id}`, label: `${t(`action.${status.action}` as Key)} : ${status.module.name}`, run: () => void run(status) })),
      ...[...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => ({ id: `page-${id}`, label: id === "tracker" ? "E:VAL" : id === "games" ? "E:LOL" : t(id), hint: PAGE_ORDER.includes(id) ? `Ctrl+${PAGE_ORDER.indexOf(id) + 1}` : id === "settings" ? "Ctrl+," : undefined, run: () => go(id) })),
      ...SECTION_COMMANDS().map(({ page: target, key, id, label }) => ({ id: `section-${target}-${id}`, label, run: () => { setPersisted(key, id); go(target); } })),
      { id: "sidebar", label: tr("Afficher ou réduire la barre latérale", "Show or collapse the sidebar"), hint: "Ctrl+B", run: toggleSidebar },
      { id: "refresh", label: tr("Actualiser les applications", "Refresh apps"), run: () => void refresh() },
      { id: "toast-log", label: tr("Voir les dernières notifications", "See recent notifications"), run: () => setLogOpen(true) },
      { id: "signout", label: t("signOut"), run: () => void signOut() },
    ],
    [modules, run, refresh, go, toggleSidebar],
  );


  const reachable = !offline && online;
  const mailBadges = useMemo(() => (newMail ? { mail: newMail } : undefined), [newMail]);
  const anchor = menuButton.current?.getBoundingClientRect();
  const menuPosition = anchor ? anchoredMenuPosition(anchor, { width: window.innerWidth, height: window.innerHeight }) : { left: 8, bottom: 8 };

  return (
    <motion.div className={`shell ${compact ? "compact" : ""}`} data-world={page === "tracker" ? "eval" : "ethone"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE_SNAP }}>
      <button type="button" className="skip-link" onClick={() => layer.current?.focus()}>{tr("Aller au contenu", "Skip to content")}</button>
      <header className="titlebar" data-tauri-drag-region>
        <div className="titlebar-nav">
          <button type="button" className="icon-btn" aria-label={tr("Page précédente", "Previous page")} title={tr("Page précédente (Alt+Gauche)", "Previous page (Alt+Left)")} disabled={history.current.length === 0} onClick={() => backRef.current()}><ArrowLeft size={15} /></button>
          <button type="button" className="icon-btn" aria-label={tr("Page suivante", "Next page")} title={tr("Page suivante (Alt+Droite)", "Next page (Alt+Right)")} disabled={future.current.length === 0} onClick={() => forwardRef.current()}><ArrowRight size={15} /></button>
        </div>
        <button type="button" className="searchbox" onClick={() => setPalette(true)}>
          <Search size={14} />
          <span>{t("searchPlaceholder")}</span>
          <kbd>Ctrl+K</kbd>
        </button>
        <button type="button" className="icon-btn titlebar-bell" aria-label={tr("Dernières notifications", "Recent notifications")} title={tr("Dernières notifications", "Recent notifications")} onClick={() => setLogOpen(true)}><Bell size={15} /></button>
        <WindowControls />
      </header>
      <ToastLog open={logOpen} onClose={() => setLogOpen(false)} />

      <Sidebar
        page={page}
        modules={modules}
        pinned={pinned}
        onGo={go}
        onOpenPinned={openPinned}
        onUnpin={pin}
        compact={compact}
        onToggle={toggleSidebar}
        badges={mailBadges}
        brand={<div className="nav-brand" data-tauri-drag-region>{page === "tracker" ? <span className="title-valorant"><ValorantMark size={18} /></span> : page === "games" ? <span className="title-valorant"><LeagueMark size={18} /></span> : <BrandMark size={22} />}<b data-tauri-drag-region>{page === "tracker" ? "E:VAL" : page === "games" ? "E:LOL" : "Ethone"}</b></div>}
        note={!reachable && <div className="nav-note" title={t("offline")}><WifiOff size={16} /><span className="nav-label">{t("offline")}</span></div>}
        account={<div className="usermenu" ref={menuRef}>
            <button type="button" ref={menuButton} className="nav-item user" aria-expanded={menu} aria-haspopup="menu" title={profile.name} onClick={() => setMenu((open) => !open)}>
              <Avatar profile={profile} />
              <span className="nav-label">{profile.name}</span>
            </button>
          </div>}
      />

      {createPortal(
        <AnimatePresence>
          {menu && (
            <motion.div ref={popupRef} role="menu" className="menu" variants={popover} initial="initial" animate="animate" exit="exit" style={{ ...menuPosition, transformOrigin: "bottom left" }}>
              <div className="menu-head"><b>{profile.name}</b><small className="muted">{profile.email}</small></div>
              <button type="button" role="menuitem" autoFocus onClick={() => { setMenu(false); go("settings"); }}><CircleUser size={15} />{t("manageAccount")}</button>
              <button type="button" role="menuitem" onClick={signOut}><LogOut size={15} />{t("signOut")}</button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {embedded && <EmbeddedApp target={embedded} onBack={() => setEmbedded(null)} />}
      <main className="layer" ref={layer} tabIndex={-1} hidden={Boolean(embedded)}>
        <UpdateBanner />
        {(
          [
            ["home", <HomePage active={page === "home"} profile={profile} modules={modules} busy={busy} checking={checking} offline={offline} error={moduleError} onRefresh={refresh} onRun={run} onOpenApplications={() => go("modules")} onOpenProductivity={() => go("productivity")} onOpenTracker={() => go("tracker")} onOpenLol={() => go("games")} onOpenMail={() => go("mail")} onOpenInsights={() => go("insights")} onOpenDaily={() => go("productivity")} />],
            ["modules", <ModulesPage name={profile.name} modules={modules} checking={checking} busy={busy} errors={errors} loadError={moduleError} onRun={run} onRefresh={refresh} onDismiss={clearError} pinned={pinned} onPin={pin} />],
            ["productivity", <WorkPage />],
            ["tracker", <TrackerPage />],
            ["files", <FilesPage />],
            ["mail", <MailPage />],
            ["games", <LolPage />],
            ["discord", <DiscordPage />],
            ["brain", <BrainPage />],
            ["team", <TeamPage />],
            ["insights", <InsightsPage />],
            ["settings", <AccountPage profile={profile} onSignOut={signOut} />],
          ] as [Page, ReactNode][]
        )
          .filter(([id]) => visited.includes(id))
          .map(([id, content]) => (
            <div key={id} className="page" style={{ "--tint": PAGE_TINTS[id] } as CSSProperties} hidden={id !== page} data-direction={direction > 0 ? "down" : "up"}>{content}</div>
          ))}
      </main>

      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
      {page !== "home" && !embedded && <MusicCapsule />}
      <Overlays />
    </motion.div>
  );
}
