import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BrainCircuit, CalendarCheck, CircleUser, Folder, Gamepad2, House, Info, LayoutGrid, ListChecks, LogOut, Mail, MessagesSquare, ScrollText, Search, Settings as SettingsIcon, UserRound, Users, WifiOff } from "lucide-react";
import { Action, authSignOut, installModule, ModuleStatus, modulesLocal, modulesRemote, openModule, openReleases, openSite, Profile, profileAvatar, Progress } from "./api";
import { errorText, Key, t } from "./i18n";
import HomePage from "./HomePage";
import ModulesPage, { Busy } from "./ModulesPage";
import { EASE_SNAP, pageShift, popover, SPRING_PILL } from "./motion";
import { FOOT_PAGES, MAIN_PAGES, Page } from "./navigation";
import { AboutPage, JournalPage, SettingsPage } from "./pages";
import Palette, { Command } from "./Palette";
import ProductivityPage from "./ProductivityPage";
import DailyPage from "./DailyPage";
import DiscordPage from "./DiscordPage";
import FilesPage from "./FilesPage";
import MailPage from "./MailPage";
import { AccountPage, BrainPage, GamesPage, InsightsPage, TeamPage } from "./MorePages";
import TrackerPage from "./TrackerPage";
import { BrandMark, ValorantMark, WindowControls } from "./ui";

const WIDE: Page[] = ["home", "tracker", "daily", "files", "mail", "games", "discord", "brain", "team", "insights", "account"];
const ALL_PAGES: Page[] = [...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => id);
const CHECK_EVERY = 6 * 60 * 60 * 1000;
const PAGE_ICONS: Record<Page, ComponentType<{ size?: number }>> = { home: House, modules: LayoutGrid, productivity: ListChecks, daily: CalendarCheck, files: Folder, mail: Mail, tracker: ValorantMark, games: Gamepad2, discord: MessagesSquare, brain: BrainCircuit, team: Users, insights: Activity, account: UserRound, journal: ScrollText, settings: SettingsIcon, about: Info };
const CAN_RUN: Action[] = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];

function progressState(progress: Progress): Busy {
  if (progress.stage !== "downloading") return { label: t(`progress.${progress.stage}` as Key), value: null };
  const value = progress.total ? progress.received / progress.total : null;
  const percent = value !== null ? `${Math.round(value * 100)} %` : `${Math.round(progress.received / 1048576)} Mo`;
  return { label: t("progress.downloading", { percent }), value };
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
  const [page, setPage] = useState<Page>("home");
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, Busy>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [direction, setDirection] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
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
      if (event.key === "Escape" && menuRef.current?.querySelector(".menu")) {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const go = useCallback((next: Page) => {
    setPage((current) => {
      setDirection(ALL_PAGES.indexOf(next) >= ALL_PAGES.indexOf(current) ? 1 : -1);
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
      } finally {
        setBusy(({ [id]: _, ...rest }) => rest);
      }
    },
    [refresh],
  );

  const signOut = () => authSignOut().then(onSignedOut);

  const commands = useMemo<Command[]>(
    () => [
      ...modules
        .filter((status) => CAN_RUN.includes(status.action))
        .map((status) => ({ id: `run-${status.module.id}`, label: `${t(`action.${status.action}` as Key)} : ${status.module.name}`, run: () => void run(status) })),
      ...[...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => ({ id: `page-${id}`, label: t(id), run: () => go(id) })),
      { id: "refresh", label: t("refresh"), run: () => void refresh() },
      { id: "signout", label: t("signOut"), run: () => void signOut() },
    ],
    [modules, run, refresh, go],
  );

  const navItem = ({ id }: { id: Page }) => {
    const Icon = PAGE_ICONS[id];
    return (
      <button key={id} type="button" className={`nav-item ${page === id ? "on" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
        {page === id && <motion.span layoutId="nav-trace" className="nav-trace" transition={SPRING_PILL} />}
        <Icon size={20} />
        <span className="nav-label">{id === "tracker" ? "E:VAL" : t(id)}</span>
      </button>
    );
  };

  const reachable = !offline && (modules.length === 0 || checking || modules.some((status) => status.latest));

  return (
    <motion.div className="shell" data-world={page === "tracker" ? "eval" : "ethone"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE_SNAP }}>
      <header className="titlebar" data-tauri-drag-region>
        <span className="title-brand" data-tauri-drag-region>{page === "tracker" ? <span className="title-valorant"><ValorantMark size={20} /></span> : <BrandMark size={24} />}<b>{page === "tracker" ? "E:VAL" : "Ethone"}</b></span>
        <button type="button" className="searchbox" onClick={() => setPalette(true)}>
          <Search size={14} />
          <span>{t("searchPlaceholder")}</span>
          <kbd>Ctrl+K</kbd>
        </button>
        <WindowControls />
      </header>

      <nav className="nav" aria-label={t("navigation")}>
        <div className="nav-group">{MAIN_PAGES.map(navItem)}</div>
        <div className="nav-group nav-foot">
          {!reachable && <div className="nav-note" title={t("offline")}><WifiOff size={16} /><span className="nav-label">{t("offline")}</span></div>}
          {FOOT_PAGES.map(navItem)}
          <div className="usermenu" ref={menuRef}>
            <button type="button" ref={menuButton} className="nav-item user" aria-expanded={menu} aria-haspopup="menu" title={profile.name} onClick={() => setMenu((open) => !open)}>
              <Avatar profile={profile} />
              <span className="nav-label">{profile.name}</span>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div role="menu" className="menu" variants={popover} initial="initial" animate="animate" exit="exit" style={{ transformOrigin: "bottom left" }}>
                  <div className="menu-head"><b>{profile.name}</b><small className="muted">{profile.email}</small></div>
                  <button type="button" role="menuitem" autoFocus onClick={() => { setMenu(false); void openSite("account"); }}><CircleUser size={15} />{t("manageAccount")}</button>
                  <button type="button" role="menuitem" onClick={signOut}><LogOut size={15} />{t("signOut")}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="layer">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={page} className={`page ${WIDE.includes(page) ? "wide" : ""}`} custom={direction} variants={pageShift} initial="initial" animate="animate" exit="exit">
            {page === "home" && <HomePage profile={profile} modules={modules} busy={busy} checking={checking} offline={offline} error={moduleError} onRefresh={refresh} onRun={run} onOpenApplications={() => go("modules")} onOpenProductivity={() => go("productivity")} onOpenTracker={() => go("tracker")} />}
            {page === "modules" && <ModulesPage name={profile.name} modules={modules} checking={checking} busy={busy} errors={errors} loadError={moduleError} onRun={run} onRefresh={refresh} onDismiss={clearError} />}
            {page === "productivity" && <ProductivityPage />}
            {page === "tracker" && <TrackerPage />}
            {page === "daily" && <DailyPage />}
            {page === "files" && <FilesPage />}
            {page === "mail" && <MailPage />}
            {page === "games" && <GamesPage />}
            {page === "discord" && <DiscordPage />}
            {page === "brain" && <BrainPage />}
            {page === "team" && <TeamPage />}
            {page === "insights" && <InsightsPage />}
            {page === "account" && <AccountPage />}
            {page === "journal" && <JournalPage />}
            {page === "settings" && <SettingsPage profile={profile} onSignOut={signOut} />}
            {page === "about" && <AboutPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
    </motion.div>
  );
}
