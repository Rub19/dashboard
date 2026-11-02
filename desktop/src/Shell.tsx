import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Boxes, ChevronRight, CircleUser, Info, LogOut, ScrollText, Search, Settings as SettingsIcon, Wifi, WifiOff } from "lucide-react";
import { Action, authSignOut, installModule, ModuleStatus, modulesLocal, modulesRemote, openModule, openReleases, openSite, Profile, Progress } from "./api";
import { errorText, Key, t } from "./i18n";
import ModulesPage, { Busy } from "./ModulesPage";
import { EASE_SNAP, panelSpring, revealUp, SPRING_PILL, stepEnter } from "./motion";
import { AboutPage, JournalPage, SettingsPage } from "./pages";
import Palette, { Command } from "./Palette";
import { BrandMark, startDrag, WindowControls } from "./ui";

type Page = "modules" | "journal" | "settings" | "about";
const CHECK_EVERY = 6 * 60 * 60 * 1000;
const PAGES: { id: Page; icon: typeof Boxes }[] = [
  { id: "modules", icon: Boxes },
  { id: "journal", icon: ScrollText },
  { id: "settings", icon: SettingsIcon },
  { id: "about", icon: Info },
];
const CAN_RUN: Action[] = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];

function progressState(progress: Progress): Busy {
  if (progress.stage !== "downloading") return { label: t(`progress.${progress.stage}` as Key), value: null };
  const value = progress.total ? progress.received / progress.total : null;
  const percent = value !== null ? `${Math.round(value * 100)} %` : `${Math.round(progress.received / 1048576)} Mo`;
  return { label: t("progress.downloading", { percent }), value };
}

function Avatar({ profile }: { profile: Profile }) {
  const [broken, setBroken] = useState(false);
  if (profile.avatar && !broken) return <img className="avatar" src={profile.avatar} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  return <span className="avatar initial">{profile.name.slice(0, 1).toUpperCase()}</span>;
}

export default function Shell({ profile, offline, version, onSignedOut }: { profile: Profile; offline: boolean; version: string; onSignedOut: () => void }) {
  const [page, setPage] = useState<Page>("modules");
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<Record<string, Busy>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      setModules(await modulesRemote());
      setCheckedAt(new Date());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    modulesLocal().then(setModules).then(refresh);
    const timer = setInterval(refresh, CHECK_EVERY);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
      if (event.key === "Escape") setMenu(false);
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

  const clearError = (id: string) => setErrors(({ [id]: _, ...rest }) => rest);

  const run = useCallback(
    async (status: ModuleStatus) => {
      const id = status.module.id;
      clearError(id);
      try {
        if (status.action === "install" || status.action === "update") {
          setBusy((all) => ({ ...all, [id]: { label: t("progress.downloading", { percent: "" }), value: null } }));
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
        .map((status) => ({ id: `run-${status.module.id}`, label: `${t(`action.${status.action}` as Key)} · ${status.module.name}`, run: () => void run(status) })),
      ...PAGES.map(({ id }) => ({ id: `page-${id}`, label: t(id), run: () => setPage(id) })),
      { id: "refresh", label: t("refresh"), run: () => void refresh() },
      { id: "signout", label: t("signOut"), run: () => void signOut() },
    ],
    [modules, run, refresh],
  );

  const installedCount = modules.filter((status) => status.installed).length;
  const detected = modules.filter((status) => status.module.updatePolicy !== "web").length;
  const reachable = modules.some((status) => status.latest) && !offline;

  return (
    <motion.div className="shell" initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }} transition={{ duration: 0.45, ease: EASE_SNAP }}>
      <nav className="rail" aria-label={t("modules")}>
        <span className="brand-tile" onMouseDown={startDrag}><BrandMark size={18} /></span>
        {PAGES.map(({ id, icon: Icon }) => (
          <motion.button key={id} type="button" whileTap={{ scale: 0.92 }} className={page === id ? "on" : ""} aria-label={t(id)} title={t(id)} aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}>
            {page === id && <motion.span layoutId="rail-pill" className="rail-pill" transition={SPRING_PILL} />}
            <Icon size={18} />
          </motion.button>
        ))}
      </nav>

      <header className="topbar" onMouseDown={startDrag}>
        <div className="crumbs" onMouseDown={startDrag}>
          <span className="muted">ETHONE</span>
          <ChevronRight size={13} className="muted" />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={page} variants={stepEnter} initial="initial" animate="animate" exit="exit">{t(page)}</motion.b>
          </AnimatePresence>
        </div>
        <button type="button" className="searchpill" onClick={() => setPalette(true)}>
          <Search size={14} />
          <span>{t("searchPlaceholder")}</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="usermenu" ref={menuRef}>
          <button type="button" className="userchip" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((open) => !open)}>
            <Avatar profile={profile} />
            <span>{profile.name}</span>
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div role="menu" className="menu" variants={panelSpring} initial="initial" animate="animate" exit="exit" style={{ transformOrigin: "top right" }}>
                <div className="menu-head"><b>{profile.name}</b><small className="muted">{profile.email}</small></div>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); void openSite("account"); }}><CircleUser size={15} />{t("manageAccount")}</button>
                <button type="button" role="menuitem" onClick={signOut}><LogOut size={15} />{t("signOut")}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <WindowControls />
      </header>

      <main className="content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={page} variants={revealUp} initial="initial" animate="animate" exit="exit" className="page">
            {page === "modules" && <ModulesPage name={profile.name} modules={modules} checking={checking} checkedAt={checkedAt} busy={busy} errors={errors} onRun={run} onRefresh={refresh} onDismiss={clearError} />}
            {page === "journal" && <JournalPage />}
            {page === "settings" && <SettingsPage profile={profile} onSignOut={signOut} />}
            {page === "about" && <AboutPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="statusbar">
        <span>v{version}</span>
        <span><Activity size={12} />{t("installedCount", { count: String(installedCount), total: String(detected) })}</span>
        <span className="status-right">
          {reachable ? <Wifi size={12} className="ok" /> : <WifiOff size={12} />}
          {checking ? t("checking") : reachable ? t("operational") : t("offline")}
        </span>
      </footer>

      <AnimatePresence>{palette && <Palette commands={commands} onClose={() => setPalette(false)} />}</AnimatePresence>
    </motion.div>
  );
}
