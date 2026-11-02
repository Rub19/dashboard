import { ComponentType, CSSProperties, memo, ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BrainCircuit, Folder, Gamepad2, House, LayoutGrid, ListChecks, Mail, MessagesSquare, Settings as SettingsIcon, Users } from "lucide-react";
import type { ModuleStatus } from "./api";
import { t, tr } from "./i18n";
import { AppIcon } from "./ModulesPage";
import { SPRING_PILL, SPRING_PRESS } from "./motion";
import { FOOT_PAGES, MAIN_PAGES, Page } from "./navigation";
import { resolvePinned } from "./pinned";
import { ValorantMark } from "./ui";

export const PAGE_TINTS: Record<Page, string> = { home: "#5aa9ff", modules: "#a78bfa", productivity: "#2fd08a", files: "#f0a92b", mail: "#35bfe0", tracker: "#ff4655", games: "#f4638b", discord: "#7c86ff", brain: "#c084fc", team: "#2dd4a0", insights: "#fb923c", settings: "#94a3b8" };

const PAGE_ICONS: Record<Page, ComponentType<{ size?: number }>> = { home: House, modules: LayoutGrid, productivity: ListChecks, files: Folder, mail: Mail, tracker: ValorantMark, games: Gamepad2, discord: MessagesSquare, brain: BrainCircuit, team: Users, insights: Activity, settings: SettingsIcon };

interface Props {
  page: Page;
  modules: ModuleStatus[];
  pinned: string[];
  onGo: (page: Page) => void;
  onOpenPinned: (status: ModuleStatus) => void;
  onUnpin: (id: string) => void;
  note?: ReactNode;
  account: ReactNode;
}

function Sidebar({ page, modules, pinned, onGo, onOpenPinned, onUnpin, note, account }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const item = ({ id }: { id: Page }) => {
    const Icon = PAGE_ICONS[id];
    const active = page === id;
    return (
      <button
        key={id}
        type="button"
        className={`nav-item ${active ? "on" : ""}`}
        style={{ "--tint": PAGE_TINTS[id] } as CSSProperties}
        aria-current={active ? "page" : undefined}
        onPointerEnter={() => setHover(id)}
        onPointerDown={(event) => event.button === 0 && onGo(id)}
        onClick={(event) => event.detail === 0 && onGo(id)}
      >
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={SPRING_PILL}><i /></motion.span>}
        {hover === id && !active && <motion.span layoutId="nav-hover" className="nav-hover" transition={SPRING_PILL} />}
        <span className="nav-icon"><Icon size={20} /></span>
        <span className="nav-label">{id === "tracker" ? "E:VAL" : t(id)}</span>
      </button>
    );
  };
  const pins = resolvePinned(pinned, modules);
  return (
    <nav className="nav" aria-label={t("navigation")} onPointerLeave={() => setHover(null)}>
      <div className="nav-scroll">
        <div className="nav-group">{MAIN_PAGES.map(item)}</div>
        <AnimatePresence initial={false}>
          {pins.length > 0 && (
            <motion.div key="pins" className="nav-pins" role="group" aria-label={tr("Applications épinglées", "Pinned apps")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
              {pins.map((status) => (
                <motion.button
                  key={status.module.id}
                  layout
                  type="button"
                  className="nav-pin"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.88 }}
                  transition={SPRING_PRESS}
                  title={tr(`${status.module.name} (clic droit pour désépingler)`, `${status.module.name} (right-click to unpin)`)}
                  aria-label={status.module.name}
                  onClick={() => onOpenPinned(status)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onUnpin(status.module.id);
                  }}
                >
                  <AppIcon id={status.module.id} />
                  {status.running && <i className="nav-running" />}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="nav-group nav-foot">
        {note}
        {FOOT_PAGES.map(item)}
        {account}
      </div>
    </nav>
  );
}

export default memo(Sidebar);
