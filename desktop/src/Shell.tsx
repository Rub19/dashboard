import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleUser, House, Info, LayoutGrid, ListChecks, LogOut, Menu, ScrollText, Search, Settings as SettingsIcon, WifiOff } from "lucide-react";
import { Action, authSignOut, installModule, ModuleStatus, modulesLocal, modulesRemote, openModule, openReleases, openSite, Profile, profileAvatar, Progress } from "./api";
import { errorText, Key, t } from "./i18n";
import HomePage from "./HomePage";
import ModulesPage, { Busy } from "./ModulesPage";
import { EASE_SNAP, pageEnter, popover, SPRING_PILL } from "./motion";
import { FOOT_PAGES, MAIN_PAGES, Page } from "./navigation";
import { AboutPage, JournalPage, SettingsPage } from "./pages";
import Palette, { Command } from "./Palette";
import ProductivityPage from "./ProductivityPage";
import { readJson, write } from "./settings";
import { BrandMark, WindowControls } from "./ui";

const CHECK_EVERY = 6 * 60 * 60 * 1000;
const PAGE_ICONS: Record<Page, typeof LayoutGrid> = { home: House, modules: LayoutGrid, productivity: ListChecks, journal: ScrollText, settings: SettingsIcon, about: Info };
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
  const [compact, setCompact] = useState(() => readJson<boolean>("ethone-nav-compact") ?? false);
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

  const toggleNav = () => {
    setCompact((value) => {
      write("ethone-nav-compact", JSON.stringify(!value));
      return !value;
    });
  };

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
      ...[...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => ({ id: `page-${id}`, label: t(id), run: () => setPage(id) })),
      { id: "refresh", label: t("refresh"), run: () => void refresh() },
      { id: "signout", label: t("signOut"), run: () => void signOut() },
    ],
    [modules, run, refresh],
  );

  const navItem = ({ id }: { id: Page }) => {
    const Icon = PAGE_ICONS[id];
    return (
    <button key={id} type="button" className={`nav-item ${page === id ? "on" : ""}`} aria-current={page === id ? "page" : undefined} title={compact ? t(id) : undefined} onClick={() => setPage(id)}>
      {page === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={SPRING_PILL} />}
      <Icon size={18} />
      <span className="nav-label">{t(id)}</span>
    </button>
    );
  };

  const reachable = !offline && (modules.length === 0 || checking || modules.some((status) => status.latest));

  return (
    <motion.div className={`shell ${compact ? "compact" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE_SNAP }}>
      <header className="titlebar" data-tauri-drag-region>
        <button type="button" className="icon-btn" aria-label={t("toggleNav")} aria-expanded={!compact} onClick={toggleNav}><Menu size={17} /></button>
        <span className="title-brand" data-tauri-drag-region><BrandMark size={22} /><b>Ethone</b></span>
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
            <button type="button" ref={menuButton} className="nav-item user" aria-expanded={menu} aria-haspopup="menu" title={compact ? profile.name : undefined} onClick={() => setMenu((open) => !open)}>
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={page} className="page" variants={pageEnter} initial="initial" animate="animate" exit="exit">
            {page === "home" && <HomePage profile={profile} modules={modules} checking={checking} offline={offline} error={moduleError} onRefresh={refresh} onOpenApplications={() => setPage("modules")} />}
            {page === "modules" && <ModulesPage name={profile.name} modules={modules} checking={checking} busy={busy} errors={errors} loadError={moduleError} onRun={run} onRefresh={refresh} onDismiss={clearError} />}
            {page === "productivity" && <ProductivityPage />}
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
